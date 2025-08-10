# 📄 **Guía de Upload de Archivos con Embeddings**

## 📋 **Resumen**

Este sistema permite a los usuarios subir archivos de texto directamente desde la interfaz web, procesarlos automáticamente para crear embeddings vectoriales, y hacerlos disponibles para búsquedas semánticas en el chat.

---

## 🚀 **Características Principales**

### **✅ Funcionalidades:**
- **Drag & Drop** de archivos
- **Preview** del contenido antes de subir
- **Procesamiento automático** de embeddings
- **Barra de progreso** en tiempo real
- **Validación** de tipos y tamaños de archivo
- **Integración** con OpenSearch vector store
- **Almacenamiento** en S3 con metadatos

### **📁 Formatos Soportados:**
- `.txt` - Archivos de texto plano
- `.md` - Archivos Markdown
- `.json` - Archivos JSON
- `.csv` - Archivos CSV
- `text/*` - Cualquier tipo de texto

### **📏 Límites:**
- **Tamaño máximo**: 5MB por archivo
- **Chunking**: ~1000 caracteres por chunk
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensiones)

---

## 🏗️ **Arquitectura del Sistema**

```
📄 Archivo → 🌐 Frontend → 🔄 Lambda Upload → 🪣 S3 → 🧠 OpenSearch → 💬 Chat
```

### **Flujo Completo:**
1. **Usuario** sube archivo via drag & drop
2. **Frontend** valida y muestra preview
3. **Lambda Upload** procesa el contenido
4. **S3** almacena archivo original
5. **OpenSearch** indexa embeddings
6. **Chat** usa embeddings para búsquedas

---

## 🎯 **Cómo Usar**

### **1. Acceder al Upload**
- Haz clic en el botón **"📄 Upload"** en la interfaz
- Se abrirá la pantalla de upload de archivos

### **2. Subir Archivo**
- **Opción A**: Arrastra y suelta el archivo en el área designada
- **Opción B**: Haz clic en "Seleccionar Archivo" para buscar

### **3. Revisar Preview**
- El sistema mostrará una vista previa del contenido
- Verifica que sea el archivo correcto

### **4. Procesar**
- Haz clic en **"Subir y Procesar"**
- Observa la barra de progreso
- Espera a que se complete el procesamiento

### **5. Usar en Chat**
- Regresa al chat haciendo clic en **"📝 Chat"**
- Haz preguntas sobre el contenido subido
- El sistema usará embeddings para respuestas precisas

---

## 🔧 **Configuración Técnica**

### **Lambda de Upload (`file-upload.ts`)**
```typescript
// Endpoint: POST /upload
// Body: { content: string, fileName: string, userId: string }
// Response: { success: boolean, chunksProcessed: number, ... }
```

### **Variables de Entorno:**
```bash
OPENAI_SECRET_NAME=openai-api-key
DOCUMENTS_BUCKET=my-documents-bucket
OPENSEARCH_ENDPOINT=vpc-ragdomain-xxxxx.us-east-2.es.amazonaws.com
OPENSEARCH_INDEX=documents
```

### **Estructura de Datos en OpenSearch:**
```json
{
  "content": "texto del chunk",
  "embedding": [0.1, 0.2, ...], // 1536 dimensiones
  "source": "documents/user-123/timestamp-filename.txt",
  "chunk_index": 0,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "user_id": "user-123",
  "file_name": "filename.txt"
}
```

---

## 📊 **Procesamiento de Archivos**

### **1. Chunking Inteligente**
```typescript
// Divide por oraciones para mantener contexto
const chunks = await chunkText(content, 1000);
```

### **2. Creación de Embeddings**
```typescript
// Usa OpenAI text-embedding-3-small
const embedding = await createEmbedding(chunk, openai);
```

### **3. Indexación en OpenSearch**
```typescript
// Almacena con metadatos completos
await indexDocument(chunk, embedding, s3Key, index, userId, fileName);
```

### **4. Almacenamiento en S3**
```typescript
// Guarda con estructura organizada
const key = `documents/${userId}/${timestamp}-${fileName}`;
```

---

## 🎨 **Interfaz de Usuario**

### **Componente FileUpload**
- **Drag & Drop** con feedback visual
- **Validación** en tiempo real
- **Preview** del contenido
- **Barra de progreso** animada
- **Mensajes de estado** claros

### **Estados de la Interfaz:**
1. **Vacío**: Área de drop con instrucciones
2. **Archivo seleccionado**: Preview y botones de acción
3. **Procesando**: Barra de progreso
4. **Completado**: Mensaje de éxito
5. **Error**: Mensaje de error con detalles

---

## 🔍 **Búsqueda Semántica**

### **Después del Upload:**
- Los embeddings están disponibles inmediatamente
- El chat puede hacer búsquedas vectoriales
- Respuestas más precisas y contextuales

### **Ejemplo de Uso:**
```
Usuario: "¿Qué dice el documento sobre machine learning?"
Sistema: [Busca embeddings similares] → [Encuentra chunks relevantes] → [Genera respuesta]
```

---

## 🛠️ **Comandos de Desarrollo**

### **Deployar la Infraestructura:**
```bash
npm run deploy
```

### **Probar Upload Localmente:**
```bash
cd frontend
npm run dev
```

### **Ver Logs de Upload:**
```bash
aws logs tail /aws/lambda/AiWebStack-FileUpload
```

### **Verificar OpenSearch:**
```bash
curl -X GET "https://<endpoint>/documents/_search?pretty"
```

---

## 🔧 **Troubleshooting**

### **Problema: Archivo no se sube**
- Verificar tamaño (máximo 5MB)
- Verificar formato (.txt, .md, .json, .csv)
- Revisar logs de Lambda

### **Problema: Embeddings no se crean**
- Verificar API key de OpenAI
- Revisar logs de procesamiento
- Verificar conectividad con OpenSearch

### **Problema: Búsqueda no funciona**
- Verificar que el archivo se procesó correctamente
- Revisar índices en OpenSearch
- Verificar permisos de Lambda

---

## 💰 **Costos**

### **Por Upload:**
- **Lambda**: ~$0.0001-0.001 (dependiendo del tamaño)
- **OpenAI Embeddings**: ~$0.0001 por 1K tokens
- **S3**: ~$0.000023 por GB
- **OpenSearch**: Costo fijo mensual

### **Ejemplo para archivo de 1MB:**
- **Procesamiento**: ~$0.001
- **Embeddings**: ~$0.0005
- **Almacenamiento**: ~$0.000023

---

## 🚀 **Próximos Pasos**

### **Mejoras Futuras:**
1. **Autenticación** de usuarios
2. **Gestión** de archivos subidos
3. **Procesamiento** de PDFs y Word
4. **OCR** para imágenes
5. **Compresión** de embeddings
6. **Cache** de búsquedas frecuentes

---

## 🎉 **¡Listo para Usar!**

El sistema de upload está completamente integrado y listo para procesar archivos de texto y crear embeddings vectoriales para búsquedas semánticas avanzadas.

**¿Necesitas ayuda con algo específico?** 🤔
