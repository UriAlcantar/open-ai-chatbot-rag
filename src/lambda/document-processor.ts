import type { S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { OpenSearchClient, IndexDocumentCommand } from '@aws-sdk/client-opensearch';
import OpenAI from 'openai';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const opensearchClient = new OpenSearchClient({ 
  region: process.env.AWS_REGION,
  endpoint: process.env.OPENSEARCH_ENDPOINT 
});
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

export const handler = async (event: S3Event): Promise<void> => {
  try {
    const openai = await getOpenAIClient();
    
    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
      
      console.log(`Processing document: ${bucket}/${key}`);
      
      // Obtener el documento de S3
      const getObjectCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
      const s3Response = await s3Client.send(getObjectCommand);
      
      if (!s3Response.Body) {
        console.error('No body found in S3 object');
        continue;
      }
      
      const documentText = await s3Response.Body.transformToString();
      
      // Dividir en chunks
      const chunks = await chunkText(documentText);
      
      // Procesar cada chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await createEmbedding(chunk, openai);
        
        // Crear documento para OpenSearch
        const document = {
          content: chunk,
          embedding: embedding,
          source: key,
          chunk_index: i,
          timestamp: new Date().toISOString(),
        };
        
        // Indexar en OpenSearch
        const indexCommand = new IndexDocumentCommand({
          index: 'documents',
          body: document,
          id: `${key}-${i}`,
        });
        
        await opensearchClient.send(indexCommand);
        console.log(`Indexed chunk ${i + 1}/${chunks.length} from ${key}`);
      }
    }
  } catch (error) {
    console.error('Error processing document:', error);
    throw error;
  }
};
