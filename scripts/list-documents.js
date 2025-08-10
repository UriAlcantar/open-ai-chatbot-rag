const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({ region: 'us-east-2' });

async function listDocuments(bucketName) {
  try {
    console.log(`📋 Listando documentos en: ${bucketName}\n`);
    
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'documents/',
    });
    
    const response = await s3Client.send(command);
    const objects = response.Contents || [];
    
    if (objects.length === 0) {
      console.log('📭 No hay documentos en el bucket');
      return;
    }
    
    console.log(`📚 Total de documentos: ${objects.length}\n`);
    
    objects.forEach((obj, index) => {
      if (obj.Key) {
        const fileName = obj.Key.replace('documents/', '');
        const size = obj.Size || 0;
        const lastModified = obj.LastModified ? obj.LastModified.toLocaleString() : 'N/A';
        
        console.log(`${index + 1}. 📄 ${fileName}`);
        console.log(`   📏 Tamaño: ${size} bytes`);
        console.log(`   📅 Última modificación: ${lastModified}`);
        console.log('');
      }
    });
    
  } catch (error) {
    console.error('❌ Error listando documentos:', error.message);
  }
}

const bucketName = process.argv[2];

if (!bucketName) {
  console.error('❌ Por favor proporciona el nombre del bucket:');
  console.log('node scripts/list-documents.js <nombre-del-bucket>');
  process.exit(1);
}

listDocuments(bucketName);
