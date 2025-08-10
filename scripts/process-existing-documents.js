#!/usr/bin/env node

const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const OpenAI = require('openai');

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-2' });
const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-2' });

async function getOpenAIKey() {
  try {
    const command = new GetSecretValueCommand({
      SecretId: 'openai-api-key',
    });
    const response = await secretsClient.send(command);
    const secret = JSON.parse(response.SecretString || '{}');
    return secret.apiKey || secret.OPENAI_API_KEY || '';
  } catch (error) {
    console.error('Error getting OpenAI API key:', error);
    throw new Error('Failed to retrieve OpenAI API key');
  }
}

async function getOpenAIClient() {
  const apiKey = await getOpenAIKey();
  return new OpenAI({ apiKey });
}

async function createEmbedding(text, openai) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function chunkText(text, chunkSize = 1000) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks = [];
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

async function createOpenSearchIndex(opensearchEndpoint, opensearchIndex = 'documents') {
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

async function indexDocument(chunk, embedding, source, chunkIndex, opensearchEndpoint, opensearchIndex = 'documents') {
  try {
    const document = {
      content: chunk,
      embedding: embedding,
      source: source,
      chunk_index: chunkIndex,
      timestamp: new Date().toISOString(),
    };

    const indexUrl = `https://${opensearchEndpoint}/${opensearchIndex}/_doc/${source}-${chunkIndex}`;
    
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

async function processExistingDocuments() {
  const bucketName = process.argv[2];
  const opensearchEndpoint = process.argv[3];

  if (!bucketName || !opensearchEndpoint) {
    console.error('Usage: node process-existing-documents.js <bucket-name> <opensearch-endpoint>');
    console.error('Example: node process-existing-documents.js my-documents-bucket vpc-ragdomain-xxxxx.us-east-2.es.amazonaws.com');
    process.exit(1);
  }

  try {
    console.log(`🚀 Starting to process existing documents in bucket: ${bucketName}`);
    console.log(`🔍 OpenSearch endpoint: ${opensearchEndpoint}`);

    // Crear el índice si no existe
    await createOpenSearchIndex(opensearchEndpoint);

    const openai = await getOpenAIClient();
    
    // Listar todos los documentos en S3
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'documents/',
    });
    
    const listResponse = await s3Client.send(listCommand);
    const documents = listResponse.Contents || [];
    
    if (documents.length === 0) {
      console.log('No documents found in S3');
      return;
    }

    console.log(`📄 Found ${documents.length} documents to process`);

    let totalChunks = 0;
    let processedChunks = 0;

    // Procesar cada documento
    for (const doc of documents) {
      if (!doc.Key) continue;
      
      try {
        console.log(`\n📖 Processing: ${doc.Key}`);
        
        // Obtener el documento de S3
        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: doc.Key,
        });
        
        const s3Response = await s3Client.send(getCommand);
        if (!s3Response.Body) {
          console.error(`No body found in ${doc.Key}`);
          continue;
        }
        
        const documentText = await s3Response.Body.transformToString();
        
        // Dividir en chunks
        const chunks = await chunkText(documentText);
        totalChunks += chunks.length;
        
        console.log(`📝 Document split into ${chunks.length} chunks`);
        
        // Procesar cada chunk
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          
          // Crear embedding
          const embedding = await createEmbedding(chunk, openai);
          
          // Indexar en OpenSearch
          await indexDocument(chunk, embedding, doc.Key, i, opensearchEndpoint);
          
          processedChunks++;
          
          // Pequeña pausa para evitar rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`✅ Completed processing: ${doc.Key}`);
        
      } catch (error) {
        console.error(`❌ Error processing ${doc.Key}:`, error);
      }
    }

    console.log(`\n🎉 Processing complete!`);
    console.log(`📊 Total chunks processed: ${processedChunks}/${totalChunks}`);
    console.log(`🔍 Documents are now searchable in OpenSearch`);

  } catch (error) {
    console.error('Error processing documents:', error);
    process.exit(1);
  }
}

// Ejecutar el script
processExistingDocuments();
