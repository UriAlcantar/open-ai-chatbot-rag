import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import OpenAI from 'openai'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { searchWeb, getCurrentInfo } from './web-search'
import { isWeatherQuery, extractLocation, getCurrentWeather, getWeatherForecast } from './weather'

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION })
const s3Client = new S3Client({ region: process.env.AWS_REGION })

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

let openaiClient: OpenAI | null = null;

async function getOpenAIClient(): Promise<OpenAI> {
  if (!openaiClient) {
    const apiKey = await getOpenAIKey();
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

async function createEmbedding(text: string, openai: OpenAI): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function searchSimilarDocuments(query: string, openai: OpenAI, limit: number = 5): Promise<string[]> {
  try {
    const bucketName = process.env.DOCUMENTS_BUCKET;
    if (!bucketName) {
      console.error('DOCUMENTS_BUCKET environment variable not set');
      return [];
    }

    // Listar documentos en S3
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'documents/',
    });
    
    const listResponse = await s3Client.send(listCommand);
    const documents = listResponse.Contents || [];
    
    if (documents.length === 0) {
      console.log('No documents found in S3');
      return [];
    }

    // Obtener contenido de los documentos
    const documentContents: string[] = [];
    
    for (const doc of documents.slice(0, limit)) {
      if (!doc.Key) continue;
      
      try {
        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: doc.Key,
        });
        
        const response = await s3Client.send(getCommand);
        if (response.Body) {
          const content = await response.Body.transformToString();
          documentContents.push(content);
        }
      } catch (error) {
        console.error(`Error reading document ${doc.Key}:`, error);
      }
    }

    // Búsqueda simple por palabras clave
    const queryWords = query.toLowerCase().split(/\s+/);
    const relevantDocuments = documentContents.filter(content => {
      const contentLower = content.toLowerCase();
      return queryWords.some(word => contentLower.includes(word));
    });

    return relevantDocuments.slice(0, limit);
  } catch (error) {
    console.error('Error searching documents:', error);
    return [];
  }
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    if (event.requestContext.http.method !== 'POST') {
      return resp(405, { error: 'Method not allowed' })
    }
    const body = event.body ? JSON.parse(event.body) : {}
    const messages = body.messages as Array<{ role: 'user'|'assistant'|'system', content: string }>
    const model = body.model ?? 'gpt-4o-mini'

    if (!Array.isArray(messages) || messages.length === 0) {
      return resp(400, { error: 'messages[] required' })
    }

    const client = await getOpenAIClient();
    
    // Obtener el último mensaje del usuario
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
      return resp(400, { error: 'No user message found' })
    }

               // PASO 1: Verificar si es una consulta de clima
           let weatherInfo = '';
           let weatherUsed = false;
           
           if (isWeatherQuery(lastUserMessage.content)) {
             console.log('Weather query detected, getting weather info...');
             const location = extractLocation(lastUserMessage.content) || 'Madrid';
             
             if (lastUserMessage.content.toLowerCase().includes('pronóstico') || 
                 lastUserMessage.content.toLowerCase().includes('forecast') ||
                 lastUserMessage.content.toLowerCase().includes('semana')) {
               weatherInfo = await getWeatherForecast(location, 5);
             } else {
               weatherInfo = await getCurrentWeather(location);
             }
             weatherUsed = true;
           }
           
           // PASO 2: Buscar en documentos locales (RAG)
           const relevantDocuments = await searchSimilarDocuments(lastUserMessage.content, client, 3);
           
           // PASO 3: Si no hay documentos relevantes, buscar en web
           let webInfo = '';
           let webSearchUsed = false;
    
    if (relevantDocuments.length === 0) {
      console.log('No local documents found, searching web...');
      webInfo = await getCurrentInfo(lastUserMessage.content);
      webSearchUsed = true;
    } else {
      // También buscar información adicional en web para complementar
      console.log('Local documents found, adding web context...');
      const additionalInfo = await getCurrentInfo(lastUserMessage.content);
      if (additionalInfo && !additionalInfo.includes('No se encontró')) {
        webInfo = `\n\nInformación adicional de fuentes externas:\n${additionalInfo}`;
        webSearchUsed = true;
      }
    }

               // Crear contexto combinado
           let context = '';
           if (weatherInfo) {
             context += `\n\nInformación del clima:\n${weatherInfo}`;
           }
           if (relevantDocuments.length > 0) {
             context += `\n\nContexto de la base de conocimientos local:\n${relevantDocuments.join('\n\n')}`;
           }
           if (webInfo) {
             context += webInfo;
           }

               // Crear mensaje del sistema con contexto híbrido
           const systemMessage = {
             role: 'system' as const,
             content: `Eres un asistente AI experto que combina información de múltiples fuentes para dar respuestas completas y actualizadas.
           
           Instrucciones:
           1. Si hay información del clima, preséntala de manera clara y organizada
           2. Si hay información local relevante, úsala como base
           3. Si hay información web, compleméntala con datos actualizados
           4. Siempre cita las fuentes cuando sea posible
           5. Si la información local y web se contradicen, menciona ambas perspectivas
           6. Sé honesto sobre las limitaciones de la información
           
           ${context}`
           };

    // Crear mensajes para la conversación
    const conversationMessages = [systemMessage, ...messages];

    const result = await client.chat.completions.create({ 
      model, 
      messages: conversationMessages,
      max_tokens: 2000,
      temperature: 0.7
    })
    const text = result.choices[0]?.message?.content ?? ''

               return resp(200, { 
             text,
             context_used: relevantDocuments.length > 0,
             documents_found: relevantDocuments.length,
             web_search_used: webSearchUsed,
             weather_used: weatherUsed,
             sources: {
               local: relevantDocuments.length > 0,
               web: webSearchUsed,
               weather: weatherUsed
             }
           })
  } catch (err: any) {
    console.error(err)
    return resp(500, { error: 'Internal error', detail: err?.message || String(err) })
  }
}

function resp(statusCode: number, body: any): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*'
    },
    body: JSON.stringify(body)
  }
}
