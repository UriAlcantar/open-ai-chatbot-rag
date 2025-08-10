const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const OpenAI = require('openai');

const secretsClient = new SecretsManagerClient({ region: 'us-east-2' });
const s3Client = new S3Client({ region: 'us-east-2' });

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

async function checkS3Documents() {
  try {
    console.log('📁 Verificando documentos en S3...\n');
    
    const bucketName = 'aiwebstack-documentsbucket9ec9deb9-rfwfrncx1qvx';
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'documents/',
      MaxKeys: 20
    });

    const response = await s3Client.send(command);
    const objects = response.Contents || [];

    console.log(`✅ Encontrados ${objects.length} documentos en S3:`);
    
    for (const obj of objects) {
      console.log(`   📄 ${obj.Key} (${obj.Size} bytes) - ${obj.LastModified}`);
      
      // Leer el contenido del primer documento como ejemplo
      if (obj.Key && obj.Key.endsWith('.txt')) {
        try {
          const getCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: obj.Key
          });
          const fileResponse = await s3Client.send(getCommand);
          const content = await fileResponse.Body.transformToString();
          console.log(`      📝 Contenido (primeros 100 chars): ${content.substring(0, 100)}...`);
          break; // Solo mostrar el primer archivo
        } catch (error) {
          console.log(`      ❌ Error leyendo archivo: ${error.message}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error verificando S3:', error.message);
  }
}

async function testEmbeddingCreation() {
  try {
    console.log('\n🧠 Probando creación de embeddings...\n');
    
    const apiKey = await getOpenAIKey();
    if (!apiKey) {
      console.log('❌ No se pudo obtener la API key de OpenAI');
      return;
    }

    const openai = new OpenAI({ apiKey });
    
    // Texto de prueba
    const testText = "Este es un texto de prueba para verificar que los embeddings se crean correctamente.";
    
    console.log(`📝 Texto de prueba: "${testText}"`);
    
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: testText,
    });
    
    const embedding = response.data[0].embedding;
    
    console.log('✅ Embedding creado exitosamente:');
    console.log(`   - Dimensiones: ${embedding.length}`);
    console.log(`   - Primeros 5 valores: [${embedding.slice(0, 5).join(', ')}]`);
    console.log(`   - Últimos 5 valores: [${embedding.slice(-5).join(', ')}]`);
    console.log(`   - Rango de valores: ${Math.min(...embedding)} a ${Math.max(...embedding)}`);
    
    // Verificar que el embedding tiene las dimensiones correctas
    if (embedding.length === 1536) {
      console.log('✅ Dimensiones correctas (1536)');
    } else {
      console.log(`❌ Dimensiones incorrectas: ${embedding.length} (esperado: 1536)`);
    }
    
  } catch (error) {
    console.error('❌ Error creando embedding:', error.message);
  }
}

async function checkLambdaLogs() {
  try {
    console.log('\n📋 Verificando logs de Lambda...\n');
    
    // Verificar logs recientes del Lambda de upload
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    try {
      const { stdout } = await execAsync('aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/AiWebStack-FileUpload" --region us-east-2');
      const logGroups = JSON.parse(stdout);
      
      if (logGroups.logGroups && logGroups.logGroups.length > 0) {
        console.log('✅ Log groups encontrados:');
        for (const group of logGroups.logGroups) {
          console.log(`   📊 ${group.logGroupName}`);
          
          // Obtener streams recientes
          try {
            const { stdout: streamsOutput } = await execAsync(`aws logs describe-log-streams --log-group-name "${group.logGroupName}" --order-by LastEventTime --descending --max-items 3 --region us-east-2`);
            const streams = JSON.parse(streamsOutput);
            
            if (streams.logStreams && streams.logStreams.length > 0) {
              console.log(`      📝 Streams recientes:`);
              for (const stream of streams.logStreams.slice(0, 2)) {
                console.log(`         - ${stream.logStreamName} (${stream.lastEventTimestamp})`);
              }
            }
          } catch (error) {
            console.log(`      ❌ Error obteniendo streams: ${error.message}`);
          }
        }
      } else {
        console.log('❌ No se encontraron log groups');
      }
    } catch (error) {
      console.log(`❌ Error verificando logs: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  console.log('🔍 Verificación completa de embeddings\n');
  console.log('=' .repeat(50));
  
  await checkS3Documents();
  console.log('\n' + '=' .repeat(50));
  
  await testEmbeddingCreation();
  console.log('\n' + '=' .repeat(50));
  
  await checkLambdaLogs();
  
  console.log('\n' + '=' .repeat(50));
  console.log('✅ Verificación completada');
}

main().catch(console.error);
