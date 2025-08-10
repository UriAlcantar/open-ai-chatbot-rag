# 🧠 Guía del Sistema RAG (Retrieval-Augmented Generation)

## ¿Qué es RAG?

RAG (Retrieval-Augmented Generation) es una técnica que combina:
- **Búsqueda semántica** en una base de conocimientos
- **Generación de respuestas** basada en el contexto encontrado

Tu asistente ahora puede responder preguntas específicas sobre tu dataset personalizado.

## 🏗️ Arquitectura del Sistema

```
📄 Documentos → 🪣 S3 → 🔄 Lambda Processor → 🔍 OpenSearch → 🤖 Chat Lambda → 💬 Respuesta
```

### Componentes:
1. **S3 Bucket**: Almacena documentos del dataset
2. **Lambda Processor**: Procesa documentos y crea embeddings
3. **OpenSearch**: Base de datos vectorial para búsqueda semántica
4. **Chat Lambda**: Busca contexto relevante y genera respuestas

## 🚀 Deploy del Sistema RAG

### 1. Deploy de la Infraestructura
```bash
npm run deploy:rag
```

### 2. Configurar API Key (si no lo has hecho)
```bash
export OPENAI_API_KEY="tu-api-key"
npm run setup-secret
```

### 3. Subir Documentos de Ejemplo
```bash
# Obtener el nombre del bucket del output del deploy
npm run upload-documents <nombre-del-bucket>
```

## 📚 Documentos Incluidos

El sistema viene con documentos de ejemplo:

1. **company-policy.txt** - Políticas de la empresa
2. **product-manual.txt** - Manual del producto
3. **faq.txt** - Preguntas frecuentes
4. **technical-specs.txt** - Especificaciones técnicas

## 💬 Cómo Usar el Asistente RAG

### Preguntas que Funcionan Bien:
- "¿Cuáles son los horarios de trabajo?"
- "¿Qué beneficios ofrece la empresa?"
- "¿Cuánto cuesta el plan profesional?"
- "¿Cómo puedo cambiar mi contraseña?"
- "¿Qué tecnologías usa el sistema?"

### Ejemplos de Respuestas:
```
Usuario: "¿Cuáles son los horarios de trabajo?"
Asistente: "Según la política de la empresa, los empleados deben trabajar de 9:00 AM a 6:00 PM de lunes a viernes. Se permite flexibilidad de horario con aprobación del supervisor."

📚 Respuesta basada en 1 documento(s) de la base de conocimientos
```

## 🔧 Personalización

### Agregar Tus Propios Documentos:
1. Sube archivos .txt al bucket S3 en la carpeta `documents/`
2. Los documentos se procesarán automáticamente
3. El asistente podrá responder preguntas sobre ellos

### Formatos Soportados:
- **Texto plano** (.txt) - Procesamiento inmediato
- **Markdown** (.md) - Se convierte a texto
- **PDF** (.pdf) - Requiere procesamiento adicional

### Configuración Avanzada:
- **Chunk size**: Tamaño de fragmentos (default: 1000 caracteres)
- **Search limit**: Número de documentos a buscar (default: 3)
- **Model**: Modelo de OpenAI a usar (default: gpt-4o-mini)

## 📊 Monitoreo

### Logs de la Lambda:
```bash
aws logs tail /aws/lambda/AiWebStack-ChatHandler --follow
```

### Métricas de OpenSearch:
- Número de documentos indexados
- Tiempo de búsqueda
- Precisión de resultados

### Verificar Documentos Procesados:
```bash
# Ver documentos en OpenSearch
curl -X GET "https://<opensearch-endpoint>/documents/_search?pretty"
```

## 🛠️ Troubleshooting

### Problema: No encuentra documentos relevantes
**Solución:**
1. Verificar que los documentos se subieron correctamente
2. Revisar logs de la Lambda processor
3. Comprobar que OpenSearch está funcionando

### Problema: Respuestas genéricas
**Solución:**
1. Verificar que la API key de OpenAI es válida
2. Comprobar que los embeddings se crearon correctamente
3. Revisar la configuración de búsqueda

### Problema: Errores de OpenSearch
**Solución:**
1. Verificar conectividad de red
2. Comprobar permisos de la Lambda
3. Revisar configuración de VPC

## 🔒 Seguridad

- **Documentos encriptados** en S3
- **Embeddings seguros** en OpenSearch
- **API key protegida** en Secrets Manager
- **Acceso restringido** por VPC

## 📈 Escalabilidad

### Para Más Documentos:
- Aumentar memoria de Lambda processor
- Configurar procesamiento en lotes
- Usar OpenSearch con más nodos

### Para Más Usuarios:
- Configurar API Gateway con throttling
- Usar CloudFront para cache
- Implementar autenticación

## 🎯 Casos de Uso

### Empresarial:
- **Soporte al cliente** con base de conocimientos
- **Onboarding** de empleados
- **Documentación técnica** interactiva

### Educativo:
- **Tutoría personalizada** basada en materiales
- **Preguntas sobre cursos** específicos
- **Ayuda con tareas** y proyectos

### Personal:
- **Gestión de notas** y documentos
- **Investigación** y análisis
- **Organización** de información

## 🚀 Próximos Pasos

1. **Sube tus propios documentos**
2. **Personaliza el prompt del sistema**
3. **Configura autenticación**
4. **Implementa feedback de usuarios**
5. **Agrega más formatos de documento**

¡Tu asistente RAG está listo para responder preguntas específicas sobre tu dataset! 🎉
