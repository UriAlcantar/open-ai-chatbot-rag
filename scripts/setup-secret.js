const { SecretsManagerClient, CreateSecretCommand, UpdateSecretCommand } = require('@aws-sdk/client-secrets-manager');

const secretsClient = new SecretsManagerClient({ region: 'us-east-2' });

async function setupOpenAISecret() {
  const secretName = 'openai-api-key';
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY environment variable is not set');
    console.log('Please set your OpenAI API key:');
    console.log('export OPENAI_API_KEY="your-api-key-here"');
    process.exit(1);
  }

  const secretValue = JSON.stringify({ apiKey });

  try {
    // Intentar crear el secret
    await secretsClient.send(new CreateSecretCommand({
      Name: secretName,
      Description: 'OpenAI API Key for AI Assistant',
      SecretString: secretValue,
    }));
    console.log('✅ Secret created successfully');
  } catch (error) {
    if (error.name === 'ResourceExistsException') {
      // Si ya existe, actualizarlo
      await secretsClient.send(new UpdateSecretCommand({
        SecretId: secretName,
        SecretString: secretValue,
      }));
      console.log('✅ Secret updated successfully');
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
}

setupOpenAISecret().catch(console.error);
