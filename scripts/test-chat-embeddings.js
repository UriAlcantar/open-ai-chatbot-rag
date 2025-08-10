const https = require('https');

const API_URL = 'https://q7jr6ycekc.execute-api.us-east-2.amazonaws.com';

function makeRequest(path, method = 'POST', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testChatWithRAG() {
  try {
    console.log('🧠 Probando chat con RAG...\n');

    // Pregunta relacionada con el contenido del archivo subido
    const testQuestions = [
      "¿Cuáles son las especificaciones de seguridad para el lanzamiento del cohete?",
      "¿Qué dice el documento sobre el combustible?",
      "¿Cuáles son las medidas de seguridad absurdas mencionadas?",
      "¿Qué tipo de cohete se describe en el documento?"
    ];

    for (let i = 0; i < testQuestions.length; i++) {
      const question = testQuestions[i];
      console.log(`\n${i + 1}. Pregunta: "${question}"`);
      
      try {
        const response = await makeRequest('/chat', 'POST', {
          messages: [{ role: 'user', content: question }]
        });

        if (response.status === 200) {
          console.log('✅ Respuesta recibida:');
          console.log(`   📝 ${response.data.text}`);
          
          // Verificar si se usó RAG
          if (response.data.context_used) {
            console.log('   🔍 RAG utilizado: Sí');
            console.log(`   📄 Documentos encontrados: ${response.data.documents_found}`);
          } else {
            console.log('   ⚠️  RAG no utilizado (puede ser búsqueda web)');
          }
          
          // Verificar fuentes
          if (response.data.sources) {
            console.log('   📊 Fuentes utilizadas:');
            console.log(`      - Local: ${response.data.sources.local ? 'Sí' : 'No'}`);
            console.log(`      - Web: ${response.data.sources.web ? 'Sí' : 'No'}`);
            console.log(`      - Weather: ${response.data.sources.weather ? 'Sí' : 'No'}`);
          }
        } else {
          console.log(`❌ Error ${response.status}: ${response.data.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.log(`❌ Error de conexión: ${error.message}`);
      }

      // Pausa entre preguntas
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

async function testUploadAndChat() {
  try {
    console.log('📤 Probando upload y chat en secuencia...\n');

    // 1. Subir un archivo de prueba
    const testContent = `
Especificaciones de Prueba para Verificación de Embeddings

1. Este es un documento de prueba para verificar que los embeddings funcionan correctamente.
2. El sistema debe poder responder preguntas sobre este contenido.
3. Los embeddings se crean usando el modelo text-embedding-3-small de OpenAI.
4. La búsqueda semántica debe encontrar este documento cuando se pregunte sobre especificaciones.

Información técnica:
- Modelo de embedding: text-embedding-3-small
- Dimensiones: 1536
- Algoritmo de similitud: Cosine
- Almacenamiento: OpenSearch
    `;

    console.log('1. Subiendo archivo de prueba...');
    const uploadResponse = await makeRequest('/upload', 'POST', {
      content: testContent,
      fileName: 'test-embeddings.txt',
      userId: 'test-user-' + Date.now()
    });

    if (uploadResponse.status === 200) {
      console.log('✅ Archivo subido exitosamente');
      console.log(`   📄 ${uploadResponse.data.fileName}`);
      console.log(`   🔢 Chunks procesados: ${uploadResponse.data.chunksProcessed}/${uploadResponse.data.totalChunks}`);
      
      // Esperar un poco para que se procese
      console.log('\n⏳ Esperando 5 segundos para procesamiento...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 2. Hacer preguntas sobre el contenido
      console.log('\n2. Probando preguntas sobre el contenido...');
      const questions = [
        "¿Qué modelo de embedding se usa?",
        "¿Cuántas dimensiones tienen los embeddings?",
        "¿Qué tipo de documento es este?",
        "¿Qué algoritmo de similitud se utiliza?"
      ];

      for (const question of questions) {
        console.log(`\n   🤔 Pregunta: "${question}"`);
        
        try {
          const chatResponse = await makeRequest('/chat', 'POST', {
            messages: [{ role: 'user', content: question }]
          });

          if (chatResponse.status === 200) {
            console.log(`   ✅ Respuesta: ${chatResponse.data.text.substring(0, 100)}...`);
            
            if (chatResponse.data.context_used) {
              console.log(`   🔍 RAG: Sí (${chatResponse.data.documents_found} documentos)`);
            } else {
              console.log(`   🔍 RAG: No (búsqueda web)`);
            }
          } else {
            console.log(`   ❌ Error: ${chatResponse.status}`);
          }
        } catch (error) {
          console.log(`   ❌ Error: ${error.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } else {
      console.log(`❌ Error en upload: ${uploadResponse.status} - ${uploadResponse.data.error || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  console.log('🔍 Verificación de Embeddings vía Chat API\n');
  console.log('=' .repeat(60));
  
  await testChatWithRAG();
  
  console.log('\n' + '=' .repeat(60));
  
  await testUploadAndChat();
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ Verificación completada');
}

main().catch(console.error);
