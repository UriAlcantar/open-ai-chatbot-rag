const https = require('https');

const OPENSEARCH_ENDPOINT = 'vpc-ragdomain527eb9-zcksevghilee-nz3keqmn7ofmgn5h5a3dgrkpzi.us-east-2.es.amazonaws.com';
const INDEX_NAME = 'documents';

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: OPENSEARCH_ENDPOINT,
      port: 443,
      path: path,
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

async function checkEmbeddings() {
  try {
    console.log('🔍 Verificando embeddings en OpenSearch...\n');

    // 1. Verificar si el índice existe
    console.log('1. Verificando índice...');
    const indexCheck = await makeRequest(`/${INDEX_NAME}`);
    if (indexCheck.status === 200) {
      console.log('✅ Índice existe');
      console.log(`   - Documentos totales: ${indexCheck.data.count || 'N/A'}`);
      console.log(`   - Tamaño del índice: ${indexCheck.data._all?.primaries?.store?.size_in_bytes || 'N/A'} bytes`);
    } else {
      console.log('❌ Índice no existe');
      return;
    }

    // 2. Obtener estadísticas del índice
    console.log('\n2. Estadísticas del índice...');
    const stats = await makeRequest(`/${INDEX_NAME}/_stats`);
    if (stats.status === 200) {
      const docCount = stats.data._all?.total?.docs?.count || 0;
      console.log(`✅ Documentos indexados: ${docCount}`);
    }

    // 3. Buscar documentos con embeddings
    console.log('\n3. Buscando documentos con embeddings...');
    const searchBody = {
      size: 5,
      query: {
        exists: {
          field: "embedding"
        }
      },
      _source: ["content", "source", "chunk_index", "file_name", "timestamp"]
    };

    const searchResult = await makeRequest(`/${INDEX_NAME}/_search`, 'POST', searchBody);
    
    if (searchResult.status === 200) {
      const hits = searchResult.data.hits?.hits || [];
      console.log(`✅ Encontrados ${hits.length} documentos con embeddings:`);
      
      hits.forEach((hit, index) => {
        const source = hit._source;
        console.log(`\n   📄 Documento ${index + 1}:`);
        console.log(`      - ID: ${hit._id}`);
        console.log(`      - Archivo: ${source.file_name || 'N/A'}`);
        console.log(`      - Chunk: ${source.chunk_index}`);
        console.log(`      - Fuente: ${source.source}`);
        console.log(`      - Timestamp: ${source.timestamp}`);
        console.log(`      - Contenido: ${source.content.substring(0, 100)}...`);
        console.log(`      - Score: ${hit._score}`);
      });
    } else {
      console.log('❌ Error al buscar documentos');
    }

    // 4. Verificar mapping del índice
    console.log('\n4. Verificando mapping del índice...');
    const mapping = await makeRequest(`/${INDEX_NAME}/_mapping`);
    if (mapping.status === 200) {
      const properties = mapping.data[INDEX_NAME]?.mappings?.properties;
      if (properties?.embedding) {
        console.log('✅ Campo embedding configurado correctamente:');
        console.log(`   - Tipo: ${properties.embedding.type}`);
        console.log(`   - Dimensiones: ${properties.embedding.dims}`);
        console.log(`   - Similaridad: ${properties.embedding.similarity}`);
      } else {
        console.log('❌ Campo embedding no encontrado en el mapping');
      }
    }

    // 5. Probar búsqueda semántica
    console.log('\n5. Probando búsqueda semántica...');
    const semanticSearchBody = {
      size: 3,
      query: {
        script_score: {
          query: { match_all: {} },
          script: {
            source: "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
            params: { 
              query_vector: Array(1536).fill(0.1) // Vector de prueba
            }
          }
        }
      },
      _source: ["content", "source", "chunk_index"]
    };

    const semanticResult = await makeRequest(`/${INDEX_NAME}/_search`, 'POST', semanticSearchBody);
    if (semanticResult.status === 200) {
      const semanticHits = semanticResult.data.hits?.hits || [];
      console.log(`✅ Búsqueda semántica funcionando: ${semanticHits.length} resultados`);
      if (semanticHits.length > 0) {
        console.log(`   - Mejor score: ${semanticHits[0]._score}`);
      }
    } else {
      console.log('❌ Error en búsqueda semántica');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Ejecutar la verificación
checkEmbeddings();
