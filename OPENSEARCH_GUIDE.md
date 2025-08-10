# 🧠 **Guía de OpenSearch con Vector Store**

## 📋 **Resumen**

Este proyecto ahora utiliza **OpenSearch** como vector store para implementar un sistema RAG (Retrieval-Augmented Generation) de alta precisión. Los documentos se convierten en embeddings vectoriales y se almacenan en OpenSearch para búsquedas semánticas.

---

## 🏗️ **Arquitectura del Sistema**

```
📄 Documentos → 🪣 S3 → 🔄 Lambda Processor → 🧠 OpenSearch → 🤖 Chat Lambda → 💬 Respuesta
```

### **Componentes:**

1. **S3 Bucket**: Almacena documentos originales
2. **Lambda Processor**: Procesa documentos y crea embeddings
3. **OpenSearch**: Base de datos vectorial para búsqueda semántica
4. **Chat Lambda**: Realiza búsquedas vectoriales y genera respuestas

---

## 🚀 **Deployment**

### **1. Deployar la Infraestructura**
```bash
npm run deploy
```

### **2. Procesar Documentos Existentes**
```bash
# Obtener el nombre del bucket y endpoint de OpenSearch del output del CDK
npm run process-existing-documents <bucket-name> <opensearch-endpoint>
```

### **3. Subir Nuevos Documentos**
```bash
# Los documentos se procesan automáticamente cuando se suben a S3
npm run upload-documents <bucket-name>
```

---

## 🔧 **Configuración de OpenSearch**

### **Índice de Documentos**
```json
{
  "mappings": {
    "properties": {
      "content": {
        "type": "text",
        "analyzer": "standard"
      },
      "embedding": {
        "type": "dense_vector",
        "dims": 1536,
        "index": true,
        "similarity": "cosine"
      },
      "source": {
        "type": "keyword"
      },
      "chunk_index": {
        "type": "integer"
      },
      "timestamp": {
        "type": "date"
      }
    }
  }
}
```

### **Búsqueda Vectorial**
```json
{
  "size": 5,
  "query": {
    "script_score": {
      "query": { "match_all": {} },
      "script": {
        "source": "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
        "params": { "query_vector": [0.1, 0.2, ...] }
      }
    }
  }
}
```

---

## 📊 **Procesamiento de Documentos**

### **1. Chunking**
- Los documentos se dividen en chunks de ~1000 caracteres
- Se mantiene la integridad de las oraciones
- Cada chunk se procesa independientemente

### **2. Embeddings**
- Se usa el modelo `text-embedding-3-small` de OpenAI
- Dimensiones: 1536
- Similaridad: Cosine

### **3. Indexación**
- Cada chunk se indexa con su embedding
- ID único: `{source}-{chunk_index}`
- Metadatos: fuente, índice, timestamp

---

## 🔍 **Búsqueda Semántica**

### **Flujo de Búsqueda:**
1. **Consulta del usuario** → Embedding de la consulta
2. **Búsqueda vectorial** → Chunks más similares
3. **Fallback** → Búsqueda por palabras clave (si falla)
4. **Respuesta** → Contexto + Generación

### **Ventajas:**
- ✅ **Búsqueda semántica** (no solo palabras clave)
- ✅ **Mejor precisión** en respuestas
- ✅ **Escalable** para grandes volúmenes
- ✅ **Fallback automático** si OpenSearch falla

---

## 💰 **Costos Estimados**

### **OpenSearch:**
- **t3.small.search**: ~$30/mes
- **EBS 10GB**: ~$1/mes
- **Data Transfer**: ~$1-5/mes

### **Total OpenSearch:** ~$32-36/mes

### **Lambda (embeddings):**
- **Procesamiento**: ~$5-15/mes (dependiendo del volumen)

---

## 🛠️ **Comandos Útiles**

### **Verificar OpenSearch**
```bash
# Verificar que el dominio está activo
aws opensearch list-domain-names

# Obtener endpoint
aws opensearch describe-domain --domain-name RAGDomain
```

### **Procesar Documentos**
```bash
# Procesar documentos existentes
npm run process-existing-documents <bucket> <endpoint>

# Subir nuevos documentos
npm run upload-documents <bucket>
```

### **Ver Logs**
```bash
# Logs del procesador de documentos
aws logs tail /aws/lambda/AiWebStack-DocumentProcessor

# Logs del chat
aws logs tail /aws/lambda/AiWebStack-ChatHandler
```

---

## 🔧 **Troubleshooting**

### **Problema: OpenSearch no responde**
```bash
# Verificar estado del dominio
aws opensearch describe-domain --domain-name RAGDomain

# Verificar logs de Lambda
aws logs tail /aws/lambda/AiWebStack-DocumentProcessor
```

### **Problema: Embeddings no se crean**
```bash
# Verificar API key de OpenAI
npm run test-weather

# Verificar logs de procesamiento
aws logs tail /aws/lambda/AiWebStack-DocumentProcessor
```

### **Problema: Búsqueda lenta**
- Aumentar `dataNodeInstanceType` en CDK
- Optimizar tamaño de chunks
- Usar índices más pequeños

---

## 📈 **Métricas de OpenSearch**

### **Ver estadísticas del índice:**
```bash
curl -X GET "https://<opensearch-endpoint>/documents/_stats?pretty"
```

### **Ver documentos en OpenSearch:**
```bash
curl -X GET "https://<opensearch-endpoint>/documents/_search?pretty"
```

### **Ver mapping del índice:**
```bash
curl -X GET "https://<opensearch-endpoint>/documents/_mapping?pretty"
```

---

## 🔄 **Flujo Automático**

### **Cuando se sube un documento:**
1. **S3 Event** → Trigger Lambda Processor
2. **Lambda Processor** → Crear embeddings
3. **OpenSearch** → Indexar embeddings
4. **Chat** → Búsqueda vectorial disponible

### **Cuando se hace una pregunta:**
1. **Consulta** → Crear embedding
2. **OpenSearch** → Búsqueda vectorial
3. **Resultados** → Contexto para GPT
4. **Respuesta** → Generación con contexto

---

## 🎯 **Beneficios del Vector Store**

### **Antes (Búsqueda Simple):**
- ❌ Solo palabras clave
- ❌ Sin contexto semántico
- ❌ Respuestas menos precisas

### **Ahora (Vector Store):**
- ✅ Búsqueda semántica
- ✅ Contexto rico
- ✅ Respuestas más precisas
- ✅ Escalabilidad

---

## 🚀 **Próximos Pasos**

1. **Deployar** la nueva infraestructura
2. **Procesar** documentos existentes
3. **Probar** búsquedas semánticas
4. **Optimizar** según necesidades

¡Tu sistema RAG ahora tiene capacidades de búsqueda semántica avanzada! 🎉
