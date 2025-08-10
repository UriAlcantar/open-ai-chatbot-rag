const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const secretsClient = new SecretsManagerClient({ region: 'us-east-2' });

async function testWeatherAPI() {
  console.log('🌤️ Probando API del Clima...\n');
  
  try {
    // Paso 1: Obtener API key desde Secrets Manager
    console.log('1️⃣ Obteniendo API key desde Secrets Manager...');
    const command = new GetSecretValueCommand({
      SecretId: 'weather-api-key',
    });
    
    const response = await secretsClient.send(command);
    const secret = JSON.parse(response.SecretString || '{}');
    const apiKey = secret.apiKey;
    
    if (!apiKey || apiKey === 'demo') {
      console.log('❌ No se encontró API key válida en Secrets Manager');
      console.log('💡 Ejecuta: npm run setup-weather-api');
      return;
    }
    
    console.log('✅ API key obtenida correctamente');
    console.log(`🔑 API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
    
    // Paso 2: Probar la API de OpenWeatherMap
    console.log('\n2️⃣ Probando API de OpenWeatherMap...');
    
    const testCity = 'Madrid';
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(testCity)}&appid=${apiKey}&units=metric&lang=es`;
    
    console.log(`🌐 URL de prueba: ${url.replace(apiKey, '***API_KEY***')}`);
    
    const weatherResponse = await fetch(url);
    
    console.log(`📊 Status Code: ${weatherResponse.status}`);
    console.log(`📊 Status Text: ${weatherResponse.statusText}`);
    
    if (!weatherResponse.ok) {
      const errorText = await weatherResponse.text();
      console.log(`❌ Error Response: ${errorText}`);
      
      if (weatherResponse.status === 401) {
        console.log('\n🔍 Diagnóstico: API key no válida o expirada');
        console.log('💡 Solución: Verifica tu API key en https://openweathermap.org/api');
      } else if (weatherResponse.status === 429) {
        console.log('\n🔍 Diagnóstico: Límite de consultas excedido');
        console.log('💡 Solución: Espera un momento y vuelve a intentar');
      } else if (weatherResponse.status === 404) {
        console.log('\n🔍 Diagnóstico: Ciudad no encontrada');
        console.log('💡 Solución: Verifica el nombre de la ciudad');
      }
      return;
    }
    
    const weatherData = await weatherResponse.json();
    
    console.log('✅ API funcionando correctamente');
    console.log(`📍 Ciudad: ${weatherData.name}, ${weatherData.sys.country}`);
    console.log(`🌡️ Temperatura: ${weatherData.main.temp}°C`);
    console.log(`☁️ Condición: ${weatherData.weather[0].description}`);
    console.log(`💧 Humedad: ${weatherData.main.humidity}%`);
    
    // Paso 3: Probar pronóstico
    console.log('\n3️⃣ Probando API de pronóstico...');
    
    const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(testCity)}&appid=${apiKey}&units=metric&lang=es&cnt=8`;
    
    const forecastResponse = await fetch(forecastUrl);
    
    console.log(`📊 Status Code: ${forecastResponse.status}`);
    
    if (!forecastResponse.ok) {
      const errorText = await forecastResponse.text();
      console.log(`❌ Error Response: ${errorText}`);
      return;
    }
    
    const forecastData = await forecastResponse.json();
    
    console.log('✅ API de pronóstico funcionando correctamente');
    console.log(`📍 Ciudad: ${forecastData.city.name}, ${forecastData.city.country}`);
    console.log(`📅 Pronósticos disponibles: ${forecastData.list.length}`);
    
    console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
    console.log('💡 El problema podría estar en el código de la Lambda');
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
    
    if (error.name === 'ResourceNotFoundException') {
      console.log('\n🔍 Diagnóstico: Secret no encontrado');
      console.log('💡 Solución: Ejecuta: npm run setup-weather-api');
    } else if (error.name === 'AccessDeniedException') {
      console.log('\n🔍 Diagnóstico: Sin permisos para acceder al secret');
      console.log('💡 Solución: Verifica las credenciales de AWS');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n🔍 Diagnóstico: Problema de conectividad');
      console.log('💡 Solución: Verifica tu conexión a internet');
    }
  }
}

testWeatherAPI();
