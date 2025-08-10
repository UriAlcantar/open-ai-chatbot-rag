# 🔗 Sistema de Búsqueda Híbrida RAG + Web

## ¿Qué es la Búsqueda Híbrida?

Tu asistente ahora combina **dos fuentes de información**:

1. **📚 Base de Conocimientos Local (RAG)**
   - Documentos específicos de tu empresa/organización
   - Información confidencial y personalizada
   - Respuestas rápidas y precisas

2. **🌐 Búsqueda Web en Tiempo Real**
   - Información actualizada de internet
   - Datos de fuentes confiables
   - Complementa la información local

## 🧠 Cómo Funciona

### Flujo de Búsqueda:
```
Usuario pregunta → Buscar en documentos locales → ¿Encontró info? → Sí: Complementar con web
                                                      ↓
                                                   No: Buscar solo en web
```

### Estrategia Inteligente:
- **Si encuentra documentos locales**: Los usa como base + busca información adicional en web
- **Si NO encuentra documentos locales**: Busca completamente en fuentes web
- **Siempre combina**: Información local + actualizada para respuestas completas

## 🔍 Fuentes Web Utilizadas

### 1. DuckDuckGo Instant Answer API
- **Gratuita** y sin API key
- Respuestas directas y precisas
- Información actualizada

### 2. Wikipedia API
- Información enciclopédica
- Datos históricos y técnicos
- Fuente confiable y verificable

## 💬 Tipos de Respuestas

### 🔗 Respuesta Híbrida
```
📚 Documentos locales + 🌐 Información web
```
- **Ejemplo**: "Según nuestra política interna, los horarios son 9-6 PM. Además, según las últimas tendencias laborales, muchas empresas están adoptando horarios flexibles..."

### 📚 Solo Local
```
📚 Solo documentos de la base de conocimientos
```
- **Ejemplo**: "Según nuestra política de empresa, los empleados tienen derecho a 20 días de vacaciones..."

### 🌐 Solo Web
```
🌐 Solo información de fuentes web
```
- **Ejemplo**: "Según las últimas noticias, el precio del Bitcoin ha alcanzado nuevos máximos..."

### 💡 General
```
💡 Respuesta del modelo AI sin fuentes específicas
```
- **Ejemplo**: "La inteligencia artificial es un campo de la informática que..."

## 🎯 Casos de Uso Ideales

### Para Información Local:
- "¿Cuáles son nuestros horarios de trabajo?"
- "¿Qué beneficios ofrece la empresa?"
- "¿Cómo funciona nuestro proceso de onboarding?"

### Para Información Actualizada:
- "¿Cuál es el precio actual del Bitcoin?"
- "¿Qué pasó en las últimas elecciones?"
- "¿Cuáles son las nuevas tendencias en tecnología?"

### Para Información Híbrida:
- "¿Cómo se compara nuestra política de vacaciones con el mercado?"
- "¿Nuestros precios están alineados con la competencia?"
- "¿Qué tecnologías deberíamos considerar para el futuro?"

## 🔧 Configuración Avanzada

### Personalizar Fuentes Web:
```typescript
// En web-search.ts
export async function searchWeb(query: string, maxResults: number = 5) {
  // Agregar más APIs aquí
  // - Google Custom Search
  // - Bing Search API
  // - News APIs
}
```

### Ajustar Prioridades:
```typescript
// Priorizar información local sobre web
if (relevantDocuments.length > 0) {
  // Usar principalmente documentos locales
  // Web solo como complemento
}
```

## 📊 Monitoreo y Métricas

### Logs de la Lambda:
```bash
aws logs tail /aws/lambda/AiWebStack-ChatHandler --follow
```

### Métricas a Monitorear:
- **Tasa de uso de documentos locales**
- **Tasa de uso de búsqueda web**
- **Tiempo de respuesta promedio**
- **Calidad de respuestas híbridas**

## 🛡️ Seguridad y Privacidad

### Información Local:
- ✅ **Siempre protegida** en S3
- ✅ **Encriptada** en tránsito y reposo
- ✅ **Acceso restringido** por IAM

### Búsqueda Web:
- ✅ **Sin almacenamiento** de consultas
- ✅ **Sin tracking** de usuarios
- ✅ **APIs públicas** confiables

## 🚀 Beneficios del Sistema Híbrido

### Para Usuarios:
- **Respuestas más completas** y actualizadas
- **Información confiable** de múltiples fuentes
- **Experiencia mejorada** con contexto rico

### Para la Organización:
- **Protección de información** confidencial
- **Actualización automática** de conocimiento
- **Escalabilidad** sin límites de documentos

## 🔄 Flujo de Trabajo Completo

1. **Usuario hace pregunta**
2. **Sistema busca en documentos locales**
3. **Si encuentra información local:**
   - Usa como base
   - Busca información adicional en web
   - Combina ambas fuentes
4. **Si NO encuentra información local:**
   - Busca completamente en web
   - Proporciona información actualizada
5. **Genera respuesta híbrida**
6. **Muestra fuentes utilizadas**

## 📈 Próximas Mejoras

### Funcionalidades Planificadas:
- [ ] **Búsqueda de noticias** en tiempo real
- [ ] **Análisis de sentimiento** de fuentes
- [ ] **Verificación de hechos** automática
- [ ] **Caché inteligente** de búsquedas web
- [ ] **Personalización** por usuario

### APIs Adicionales:
- [ ] **Google News API**
- [ ] **Reddit API** para opiniones
- [ ] **Twitter API** para tendencias
- [ ] **ArXiv API** para papers académicos

¡Tu asistente ahora es mucho más inteligente y completo! 🎉
