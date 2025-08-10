# 🌤️ Sistema de Consulta del Clima

## ¿Qué es el Sistema de Clima?

Tu asistente ahora puede **consultar información meteorológica en tiempo real** usando APIs gratuitas. El sistema detecta automáticamente cuando preguntas sobre el clima y te proporciona datos actualizados.

## 🧠 Cómo Funciona

### Detección Automática:
El sistema reconoce palabras clave relacionadas con el clima:
- **Español**: clima, tiempo, temperatura, lluvia, sol, nublado, grados, humedad, viento, pronóstico
- **Inglés**: weather, temperature, rain, sunny, cloudy, forecast

### Extracción de Ubicación:
Extrae automáticamente la ciudad de tu pregunta:
- "¿Cómo está el clima en Madrid?" → Madrid
- "Temperatura en Barcelona" → Barcelona
- "¿Lloverá en París mañana?" → París

## 🔍 Tipos de Consultas Soportadas

### **Clima Actual:**
```
- "¿Cómo está el clima en Madrid?"
- "Temperatura en Barcelona"
- "¿Hace frío en París?"
- "Humedad en Londres"
```

### **Pronóstico:**
```
- "Pronóstico del tiempo en Madrid"
- "¿Cómo estará el clima esta semana en Barcelona?"
- "Forecast para París"
- "¿Lloverá mañana en Londres?"
```

## 🌐 APIs Utilizadas

### **1. OpenWeatherMap (Principal)**
- **Gratuita** con registro
- **1000 consultas/día** gratuitas
- **Datos en español**
- **Métricas** (Celsius, km/h)

### **2. Datos de Ejemplo (Fallback)**
- **Sin API key** requerida
- **Datos simulados** realistas
- **Funciona inmediatamente**

## 📊 Información Proporcionada

### **Clima Actual:**
- 🌡️ **Temperatura** (actual y sensación térmica)
- ☁️ **Condición** (soleado, nublado, lluvia, etc.)
- 💧 **Humedad** (porcentaje)
- 💨 **Viento** (velocidad en km/h y m/s)
- 📊 **Presión** (hPa)

### **Pronóstico (5 días):**
- 📅 **Fecha** y día de la semana
- 🌡️ **Temperatura** máxima y mínima
- ☁️ **Condición** predominante
- 💧 **Humedad** promedio

## ⚙️ Configuración

### **Opción 1: Con API Key Real (Recomendado)**

1. **Registrarse gratuitamente:**
   ```
   https://openweathermap.org/api
   ```

2. **Obtener API key:**
   - Ve a tu cuenta
   - Copia tu API key

3. **Configurar:**
   ```bash
   export WEATHER_API_KEY="tu-api-key-aqui"
   npm run setup-weather-api
   ```

4. **Deploy:**
   ```bash
   npm run deploy
   ```

### **Opción 2: Sin API Key (Datos de Ejemplo)**
```bash
npm run deploy
```
El sistema funcionará con datos simulados.

## 🎯 Ejemplos de Uso

### **Preguntas que Funcionan:**

#### **Clima Actual:**
- "¿Cómo está el clima en Madrid?"
- "Temperatura en Barcelona"
- "¿Hace frío en París?"
- "Humedad en Londres"
- "¿Está soleado en Roma?"

#### **Pronóstico:**
- "Pronóstico del tiempo en Madrid"
- "¿Cómo estará el clima esta semana?"
- "Forecast para Barcelona"
- "¿Lloverá mañana en París?"

#### **Consultas Específicas:**
- "¿Cuál es la temperatura en Nueva York?"
- "Humedad en Tokio"
- "Viento en Sydney"
- "Presión atmosférica en Berlín"

### **Respuestas de Ejemplo:**

#### **Clima Actual:**
```
🌤️ Clima Actual en Madrid, ES

🌡️ Temperatura: 22°C
🌡️ Sensación térmica: 24°C
☁️ Condición: Parcialmente nublado
💧 Humedad: 65%
💨 Viento: 12 km/h (3 m/s)
📊 Presión: 1013 hPa

🕐 Última actualización: 9/8/2025, 8:32:15 PM
```

#### **Pronóstico:**
```
🌤️ Pronóstico del Clima para Madrid, ES

📅 Lunes, 9 ago
🌡️ 18°C - 25°C
☁️ Soleado
💧 45% humedad

📅 Martes, 10 ago
🌡️ 20°C - 28°C
☁️ Parcialmente nublado
💧 55% humedad

📅 Miércoles, 11 ago
🌡️ 22°C - 30°C
☁️ Soleado
💧 40% humedad
```

## 🔧 Integración con el Sistema

### **Prioridad de Fuentes:**
1. **🌤️ Clima** (si detecta consulta meteorológica)
2. **📚 Documentos locales** (RAG)
3. **🌐 Búsqueda web** (información adicional)

### **Respuesta Combinada:**
```
🌤️ Información del clima obtenida de OpenWeatherMap
```

## 🛡️ Seguridad y Privacidad

### **Datos del Clima:**
- ✅ **Sin almacenamiento** de consultas
- ✅ **Sin tracking** de usuarios
- ✅ **APIs públicas** confiables
- ✅ **Datos anónimos** únicamente

### **API Keys:**
- ✅ **Almacenadas** en AWS Secrets Manager
- ✅ **Encriptadas** en tránsito y reposo
- ✅ **Acceso restringido** por IAM

## 🚀 Beneficios

### **Para Usuarios:**
- **Información meteorológica** en tiempo real
- **Detección automática** de consultas de clima
- **Datos precisos** y actualizados
- **Interfaz integrada** en el chat

### **Para el Sistema:**
- **Funcionalidad adicional** sin complejidad
- **Fallback robusto** con datos de ejemplo
- **Escalabilidad** automática
- **Sin dependencias** externas críticas

## 🔄 Flujo de Trabajo

1. **Usuario pregunta** sobre el clima
2. **Sistema detecta** palabras clave meteorológicas
3. **Extrae ubicación** de la consulta
4. **Determina tipo** (actual o pronóstico)
5. **Consulta API** o usa datos de ejemplo
6. **Formatea respuesta** con emojis y estructura clara
7. **Muestra fuente** de información

## 📈 Próximas Mejoras

### **Funcionalidades Planificadas:**
- [ ] **Alertas meteorológicas** automáticas
- [ ] **Mapas del clima** interactivos
- [ ] **Historial climático** de ubicaciones
- [ ] **Notificaciones** de cambios de clima
- [ ] **Múltiples unidades** (Fahrenheit, mph)

### **APIs Adicionales:**
- [ ] **AccuWeather API** para más precisión
- [ ] **WeatherAPI.com** como alternativa
- [ ] **Dark Sky API** para pronósticos detallados
- [ ] **AEMET** para datos de España

## 🎉 ¡Tu Asistente Ahora es Meteorólogo!

El sistema de clima está **completamente integrado** y funcionando. Puedes preguntar sobre el clima de cualquier ciudad del mundo y obtendrás información precisa y actualizada.

**¡Prueba preguntando: "¿Cómo está el clima en Madrid?" o "Pronóstico para Barcelona"!** 🌤️
