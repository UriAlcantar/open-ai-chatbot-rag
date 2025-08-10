import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import OpenAI from 'openai';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

async function getOpenAIKey(): Promise<string> {
  try {
    const command = new GetSecretValueCommand({
      SecretId: process.env.OPENAI_SECRET_NAME || 'openai-api-key',
    });
    const response = await secretsClient.send(command);
    const secret = JSON.parse(response.SecretString || '{}');
    return secret.apiKey || secret.OPENAI_API_KEY || '';
  } catch (error) {
    console.error('Error getting OpenAI API key:', error);
    throw new Error('Failed to retrieve OpenAI API key');
  }
}

async function getOpenAIClient(): Promise<OpenAI> {
  const apiKey = await getOpenAIKey();
  return new OpenAI({ apiKey });
}

async function createEmbedding(text: string, openai: OpenAI): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function chunkText(text: string, chunkSize: number = 1000): Promise<string[]> {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

async function createOpenSearchIndex(): Promise<void> {
  const opensearchEndpoint = process.env.OPENSEARCH_ENDPOINT;
  const opensearchIndex = process.env.OPENSEARCH_INDEX || 'documents';
  
  if (!opensearchEndpoint) {
    console.error('OPENSEARCH_ENDPOINT environment variable not set');
    return;
  }

  try {
    // Verificar si el índice ya existe
    const checkUrl = `https://${opensearchEndpoint}/${opensearchIndex}`;
    const checkResponse = await fetch(checkUrl, { method: 'HEAD' });
    
    if (checkResponse.ok) {
      console.log(`Index ${opensearchIndex} already exists`);
      return;
    }

    // Crear el índice con mapping para embeddings
    const createUrl = `https://${opensearchEndpoint}/${opensearchIndex}`;
    const mapping = {
      mappings: {
        properties: {
          content: {
            type: 'text',
            analyzer: 'standard'
          },
          embedding: {
            type: 'dense_vector',
            dims: 1536,
            index: true,
            similarity: 'cosine'
          },
          source: {
            type: 'keyword'
          },
          chunk_index: {
            type: 'integer'
          },
          timestamp: {
            type: 'date'
          },
          user_id: {
            type: 'keyword'
          },
          file_name: {
            type: 'keyword'
          }
        }
      },
      settings: {
        index: {
          number_of_shards: 1,
          number_of_replicas: 0
        }
      }
    };

    const createResponse = await fetch(createUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mapping),
    });

    if (createResponse.ok) {
      console.log(`Successfully created index ${opensearchIndex}`);
    } else {
      console.error(`Failed to create index: ${createResponse.status} ${createResponse.statusText}`);
    }
  } catch (error) {
    console.error('Error creating OpenSearch index:', error);
  }
}

async function indexDocument(
  chunk: string, 
  embedding: number[], 
  source: string, 
  chunkIndex: number, 
  userId: string,
  fileName: string
): Promise<void> {
  const opensearchEndpoint = process.env.OPENSEARCH_ENDPOINT;
  const opensearchIndex = process.env.OPENSEARCH_INDEX || 'documents';
  
  if (!opensearchEndpoint) {
    console.error('OPENSEARCH_ENDPOINT environment variable not set');
    return;
  }

  try {
    const document = {
      content: chunk,
      embedding: embedding,
      source: source,
      chunk_index: chunkIndex,
      timestamp: new Date().toISOString(),
      user_id: userId,
      file_name: fileName
    };

    const indexUrl = `https://${opensearchEndpoint}/${opensearchIndex}/_doc/${source.replace(/\//g, '-')}-${chunkIndex}`;
    
    const response = await fetch(indexUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(document),
    });

    if (response.ok) {
      console.log(`Successfully indexed chunk ${chunkIndex} from ${source}`);
    } else {
      console.error(`Failed to index chunk ${chunkIndex}: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error(`Error indexing chunk ${chunkIndex} from ${source}:`, error);
  }
}

async function saveToS3(content: string, fileName: string, userId: string): Promise<string> {
  const bucketName = process.env.DOCUMENTS_BUCKET;
  if (!bucketName) {
    throw new Error('DOCUMENTS_BUCKET environment variable not set');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const key = `documents/${timestamp}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: content,
    ContentType: 'text/plain',
    Metadata: {
      'user-id': userId,
      'file-name': fileName,
      'upload-time': timestamp
    }
  });

  await s3Client.send(command);
  return key;
}

function resp(statusCode: number, body: any): APIGatewayProxyResultV2 {
  return { 
    statusCode, 
    headers: { 
      'content-type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }, 
    body: JSON.stringify(body) 
  };
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  // Manejar CORS preflight
  if (event.requestContext.http.method === 'OPTIONS') {
    return resp(200, { message: 'OK' });
  }

  if (event.requestContext.http.method !== 'POST') {
    return resp(405, { error: 'Method not allowed' });
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { content, fileName, userId } = body;

    if (!content || !fileName || !userId) {
      return resp(400, { 
        error: 'Missing required fields: content, fileName, userId' 
      });
    }

    console.log(`Processing file upload: ${fileName} for user: ${userId}`);

    // Crear el índice si no existe
    await createOpenSearchIndex();

    const openai = await getOpenAIClient();

    // Guardar en S3
    const s3Key = await saveToS3(content, fileName, userId);
    console.log(`File saved to S3: ${s3Key}`);

    // Dividir en chunks
    const chunks = await chunkText(content);
    console.log(`Document split into ${chunks.length} chunks`);

    let processedChunks = 0;
    let totalChunks = chunks.length;

    // Procesar cada chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        // Crear embedding
        const embedding = await createEmbedding(chunk, openai);
        
        // Indexar en OpenSearch
        await indexDocument(chunk, embedding, s3Key, i, userId, fileName);
        
        processedChunks++;
        
        // Pequeña pausa para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing chunk ${i}:`, error);
      }
    }

    console.log(`Completed processing file: ${fileName}`);
    console.log(`Processed ${processedChunks}/${totalChunks} chunks`);

    return resp(200, {
      success: true,
      message: 'File uploaded and processed successfully',
      fileName: fileName,
      s3Key: s3Key,
      chunksProcessed: processedChunks,
      totalChunks: totalChunks,
      userId: userId
    });

  } catch (error: any) {
    console.error('Error processing file upload:', error);
    return resp(500, { 
      error: 'Internal server error',
      message: error.message || 'Unknown error occurred'
    });
  }
};
