const { SecretsManagerClient, CreateSecretCommand, UpdateSecretCommand } = require('@aws-sdk/client-secrets-manager');

const secretsClient = new SecretsManagerClient({ region: 'us-east-2' });

async function setupWeatherAPI() {
  const secretName = 'weather-api-key';
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    console.log('🌤️ Configuración de API del Clima');
    console.log('');
    console.log('Para obtener datos reales del clima, necesitas una API key gratuita:');
    console.log('');
    console.log('1. 🌐 Ve a: https://openweathermap.org/api');
    console.log('2. 📝 Regístrate gratuitamente');
    console.log('3. 🔑 Obtén tu API key');
    console.log('4. ⚙️ Configúrala con:');
    console.log('');
    console.log('   export WEATHER_API_KEY="tu-api-key-aqui"');
    console.log('   npm run setup-weather-api');
    console.log('');
    console.log('⚠️  Sin API key, el sistema usará datos de ejemplo.');
    console.log('');
    console.log('¿Quieres continuar sin API key? (y/n)');
    
    // En un entorno real, aquí podrías leer input del usuario
    console.log('Continuando sin API key...');
    return;
  }

  const secretValue = JSON.stringify({ apiKey });

  try {
    // Intentar crear el secret
    await secretsClient.send(new CreateSecretCommand({
      Name: secretName,
      Description: 'OpenWeatherMap API Key for Weather Service',
      SecretString: secretValue,
    }));
    console.log('✅ API key del clima configurada exitosamente');
  } catch (error) {
    if (error.name === 'ResourceExistsException') {
      // Si ya existe, actualizarlo
      await secretsClient.send(new UpdateSecretCommand({
        SecretId: secretName,
        SecretString: secretValue,
      }));
      console.log('✅ API key del clima actualizada exitosamente');
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
}

setupWeatherAPI().catch(console.error);
