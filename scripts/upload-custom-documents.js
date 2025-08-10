const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const s3Client = new S3Client({ region: 'us-east-2' });

async function uploadCustomDocument(bucketName, filePath, s3Key = null) {
  try {
    // Leer el archivo
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Usar el nombre del archivo como key si no se especifica
    const key = s3Key || `documents/${path.basename(filePath)}`;
    
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: content,
      ContentType: 'text/plain',
    });
    
    await s3Client.send(command);
    console.log(`✅ Subido: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Error subiendo ${filePath}:`, error.message);
    return false;
  }
}

async function uploadFromDirectory(bucketName, directoryPath) {
  console.log(`📁 Subiendo documentos desde: ${directoryPath}`);
  
  try {
    const files = fs.readdirSync(directoryPath);
    const textFiles = files.filter(file => 
      file.endsWith('.txt') || 
      file.endsWith('.md') || 
      file.endsWith('.json')
    );
    
    if (textFiles.length === 0) {
      console.log('❌ No se encontraron archivos .txt, .md o .json en el directorio');
      return;
    }
    
    let successCount = 0;
    for (const file of textFiles) {
      const filePath = path.join(directoryPath, file);
      const success = await uploadCustomDocument(bucketName, filePath);
      if (success) successCount++;
    }
    
    console.log(`🎉 ${successCount}/${textFiles.length} documentos subidos exitosamente!`);
    
  } catch (error) {
    console.error('❌ Error leyendo directorio:', error.message);
  }
}

// Función principal
async function main() {
  const bucketName = process.argv[2];
  const fileOrDirectory = process.argv[3];
  
  if (!bucketName) {
    console.error('❌ Por favor proporciona el nombre del bucket:');
    console.log('node scripts/upload-custom-documents.js <bucket-name> <archivo-o-directorio>');
    console.log('');
    console.log('Ejemplos:');
    console.log('  node scripts/upload-custom-documents.js mi-bucket ./mis-documentos/');
    console.log('  node scripts/upload-custom-documents.js mi-bucket ./documento.txt');
    process.exit(1);
  }
  
  if (!fileOrDirectory) {
    console.error('❌ Por favor proporciona un archivo o directorio:');
    console.log('node scripts/upload-custom-documents.js <bucket-name> <archivo-o-directorio>');
    process.exit(1);
  }
  
  const stats = fs.statSync(fileOrDirectory);
  
  if (stats.isDirectory()) {
    await uploadFromDirectory(bucketName, fileOrDirectory);
  } else if (stats.isFile()) {
    await uploadCustomDocument(bucketName, fileOrDirectory);
  } else {
    console.error('❌ El path proporcionado no es un archivo ni directorio válido');
  }
}

main().catch(console.error);
