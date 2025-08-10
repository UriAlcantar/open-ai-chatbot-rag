const { S3Client, ListObjectsV2Command, DeleteObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const s3Client = new S3Client({ region: 'us-east-2' });

// Documentos de ejemplo para el dataset
const sampleDocuments = {
  'company-policy.txt': `Política de la Empresa

1. Horarios de Trabajo
Los empleados deben trabajar de 9:00 AM a 6:00 PM de lunes a viernes.
Se permite flexibilidad de horario con aprobación del supervisor.

2. Vacaciones
Cada empleado tiene derecho a 20 días de vacaciones por año.
Las vacaciones deben solicitarse con al menos 2 semanas de anticipación.

3. Beneficios
- Seguro médico completo
- 401k con matching del 6%
- Bonos anuales basados en rendimiento
- Días de enfermedad ilimitados

4. Código de Conducta
Los empleados deben mantener un ambiente de trabajo respetuoso y profesional.
No se tolera el acoso o discriminación de ningún tipo.`,

  'product-manual.txt': `Manual del Producto XYZ

Descripción del Producto:
El Producto XYZ es una solución integral para gestión de proyectos que incluye:
- Planificación de tareas
- Seguimiento de progreso
- Gestión de recursos
- Reportes automáticos

Características Principales:
1. Dashboard intuitivo con métricas en tiempo real
2. Integración con herramientas populares (Slack, Jira, GitHub)
3. Automatización de flujos de trabajo
4. Análisis predictivo de riesgos

Precios:
- Plan Básico: $29/mes por usuario
- Plan Profesional: $59/mes por usuario
- Plan Enterprise: $99/mes por usuario

Soporte:
- Soporte por email 24/7
- Chat en vivo de 9 AM a 6 PM EST
- Documentación completa y videos tutoriales`,

  'faq.txt': `Preguntas Frecuentes

Q: ¿Cómo puedo cambiar mi contraseña?
A: Ve a Configuración > Seguridad > Cambiar Contraseña. Necesitarás tu contraseña actual.

Q: ¿Puedo exportar mis datos?
A: Sí, puedes exportar todos tus datos en formato CSV, JSON o PDF desde la sección de Exportar.

Q: ¿Hay límite en el número de proyectos?
A: El plan básico permite hasta 10 proyectos, el profesional hasta 50, y el enterprise es ilimitado.

Q: ¿Cómo funciona la facturación?
A: La facturación es mensual y se procesa automáticamente. Puedes cancelar en cualquier momento.

Q: ¿Ofrecen capacitación?
A: Sí, ofrecemos sesiones de capacitación gratuitas para nuevos clientes y webinars mensuales.`,

  'technical-specs.txt': `Especificaciones Técnicas

Arquitectura del Sistema:
- Frontend: React.js con TypeScript
- Backend: Node.js con Express
- Base de datos: PostgreSQL
- Cache: Redis
- Almacenamiento: AWS S3
- CDN: CloudFront

Requisitos del Sistema:
- Navegador: Chrome 90+, Firefox 88+, Safari 14+
- Conexión a internet: Mínimo 1 Mbps
- RAM: Mínimo 4GB recomendado
- Procesador: Intel i3 o equivalente

APIs Disponibles:
- REST API con documentación completa
- Webhooks para integraciones
- SDKs para JavaScript, Python, y Java
- Rate limiting: 1000 requests por minuto

Seguridad:
- Encriptación AES-256 en tránsito y reposo
- Autenticación OAuth 2.0
- Certificaciones SOC 2 Type II
- Cumplimiento GDPR y CCPA`,

  'ai-guidelines.txt': `Guías de Inteligencia Artificial

Principios de IA:
1. Transparencia: Los sistemas de IA deben ser explicables
2. Equidad: Evitar sesgos y discriminación
3. Privacidad: Proteger datos personales
4. Seguridad: Prevenir daños y abusos

Mejores Prácticas:
- Validar datos de entrada
- Monitorear rendimiento continuamente
- Documentar decisiones de diseño
- Implementar salvaguardas

Casos de Uso Aprobados:
- Análisis de datos no sensibles
- Automatización de tareas repetitivas
- Asistencia en toma de decisiones
- Optimización de procesos

Restricciones:
- No usar para decisiones críticas sin supervisión
- No procesar datos personales sin consentimiento
- No reemplazar completamente la intervención humana
- Mantener control humano sobre sistemas autónomos`
};

async function clearDocuments(bucketName) {
  console.log('🧹 Limpiando documentos existentes...');
  
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'documents/',
    });
    
    const response = await s3Client.send(listCommand);
    const objects = response.Contents || [];
    
    if (objects.length === 0) {
      console.log('📭 No hay documentos para limpiar');
      return;
    }
    
    for (const obj of objects) {
      if (obj.Key) {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: obj.Key,
        });
        await s3Client.send(deleteCommand);
        console.log(`🗑️ Eliminado: ${obj.Key}`);
      }
    }
    
    console.log(`✅ ${objects.length} documentos eliminados`);
  } catch (error) {
    console.error('❌ Error limpiando documentos:', error.message);
  }
}

async function uploadDocuments(bucketName) {
  console.log(`📁 Subiendo documentos al bucket: ${bucketName}`);
  
  for (const [filename, content] of Object.entries(sampleDocuments)) {
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: `documents/${filename}`,
        Body: content,
        ContentType: 'text/plain',
      });
      
      await s3Client.send(command);
      console.log(`✅ Subido: ${filename}`);
    } catch (error) {
      console.error(`❌ Error subiendo ${filename}:`, error.message);
    }
  }
  
  console.log('🎉 Documentos subidos exitosamente!');
  console.log('📝 Los documentos serán procesados automáticamente por la Lambda de procesamiento.');
}

async function main() {
  const bucketName = process.argv[2];
  
  if (!bucketName) {
    console.error('❌ Por favor proporciona el nombre del bucket:');
    console.log('node scripts/refresh-documents.js <nombre-del-bucket>');
    process.exit(1);
  }
  
  console.log('🔄 Iniciando refresh completo de documentos...\n');
  
  // Paso 1: Limpiar documentos existentes
  await clearDocuments(bucketName);
  
  console.log('');
  
  // Paso 2: Subir documentos nuevos
  await uploadDocuments(bucketName);
  
  console.log('\n✨ Refresh completado!');
}

main().catch(console.error);
