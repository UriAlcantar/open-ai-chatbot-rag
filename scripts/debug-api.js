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
          resolve({ status: res.statusCode, data: jsonData, raw: data });
        } catch (error) {
          resolve({ status: res.statusCode, data: data, raw: data });
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

async function debugAPI() {
  try {
    console.log('🔍 Debuggeando API...\n');

    // 1. Probar chat simple
    console.log('1. Probando chat simple...');
    const chatResponse = await makeRequest('/chat', 'POST', {
      messages: [{ role: 'user', content: 'Hola, ¿cómo estás?' }]
    });

    console.log(`Status: ${chatResponse.status}`);
    console.log('Raw response:');
    console.log(JSON.stringify(chatResponse.data, null, 2));
    console.log('\n' + '='.repeat(50));

    // 2. Probar upload
    console.log('\n2. Probando upload...');
    const uploadResponse = await makeRequest('/upload', 'POST', {
      content: 'Este es un archivo de prueba para debuggear.',
      fileName: 'debug-test.txt',
      userId: 'debug-user-' + Date.now()
    });

    console.log(`Status: ${uploadResponse.status}`);
    console.log('Raw response:');
    console.log(JSON.stringify(uploadResponse.data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugAPI();
