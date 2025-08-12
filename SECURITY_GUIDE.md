# 🔒 Guía de Seguridad - Archivos Sensibles Protegidos

## 📋 Resumen

Este proyecto contiene información sensible que debe ser protegida. Se ha creado un `.gitignore` completo para evitar que se suban accidentalmente archivos con claves API, credenciales de AWS y otros datos sensibles.

## 🚨 Archivos Sensibles Identificados

### 1. **Claves API y Secretos**
- **OpenAI API Key**: Usada en las funciones Lambda para embeddings y chat
- **Weather API Key**: Usada para obtener información del clima
- **AWS Credentials**: Credenciales de acceso a AWS

### 2. **Artefactos de Despliegue AWS**
- `cdk.out/`: Contiene todos los artefactos de despliegue de CDK
- `cdk.context.json`: Contexto de CDK con información de la cuenta
- `*.template.json`: Plantillas de CloudFormation generadas
- `*.assets.json`: Archivos de assets de CDK

### 3. **Archivos de Configuración**
- `.env*`: Variables de entorno con claves API
- `aws-credentials.json`: Credenciales de AWS
- `config/secrets.json`: Archivos de configuración con secretos

## 🛡️ Archivos Protegidos por .gitignore

### Variables de Entorno
```
.env
.env.local
.env.development
.env.test
.env.production
.env.example
*.env
```

### AWS y CDK
```
cdk.out/
cdk.context.json
*.template.json
*.assets.json
.aws/
aws-credentials.json
aws-config.json
```

### Archivos Compilados
```
dist/
build/
*.js.map
*.d.ts.map
node_modules/
```

### Archivos de Configuración Sensibles
```
config/secrets.json
config/keys.json
secrets/
keys/
```

## 🔐 Mejores Prácticas de Seguridad

### 1. **Gestión de Secretos**
- ✅ Usar AWS Secrets Manager para claves API
- ✅ Nunca hardcodear claves en el código
- ✅ Usar variables de entorno para desarrollo local
- ❌ No subir archivos `.env` al repositorio

### 2. **Credenciales de AWS**
- ✅ Usar IAM roles y políticas mínimas
- ✅ Rotar claves de acceso regularmente
- ✅ Usar AWS SSO cuando sea posible
- ❌ No compartir credenciales en el código

### 3. **Desarrollo Local**
```bash
# Crear archivo .env local (NO subir al repo)
cp .env.example .env
# Editar .env con tus claves reales
```

### 4. **Despliegue Seguro**
```bash
# Configurar secretos en AWS antes del despliegue
aws secretsmanager create-secret --name "openai-api-key" --secret-string '{"apiKey":"tu-clave-aqui"}'
aws secretsmanager create-secret --name "weather-api-key" --secret-string '{"apiKey":"tu-clave-aqui"}'

# Desplegar con CDK
cdk deploy
```

## 🔍 Verificación de Seguridad

### Comandos para Verificar
```bash
# Verificar que no hay claves hardcodeadas
grep -r "sk-" src/
grep -r "AKIA" src/
grep -r "api.openai.com" src/

# Verificar que los archivos sensibles están ignorados
git status --ignored

# Verificar que no hay archivos .env
find . -name ".env*" -type f
```

### Archivos que NO deben estar en el repo
- ❌ `.env`
- ❌ `aws-credentials.json`
- ❌ `cdk.out/`
- ❌ `dist/`
- ❌ `node_modules/`
- ❌ Archivos con claves API hardcodeadas

## 🚀 Configuración Segura para Despliegue

### 1. **Configurar Secretos en AWS**
```bash
# OpenAI API Key
aws secretsmanager create-secret \
  --name "openai-api-key" \
  --description "OpenAI API Key for AI Web App" \
  --secret-string '{"apiKey":"sk-tu-clave-aqui"}'

# Weather API Key
aws secretsmanager create-secret \
  --name "weather-api-key" \
  --description "Weather API Key for AI Web App" \
  --secret-string '{"apiKey":"tu-clave-aqui"}'
```

### 2. **Configurar Variables de Entorno**
```bash
# Para desarrollo local (archivo .env)
OPENAI_API_KEY=sk-tu-clave-aqui
WEATHER_API_KEY=tu-clave-aqui
AWS_REGION=us-east-2
```

### 3. **Verificar Permisos IAM**
- Las funciones Lambda necesitan permisos para leer secretos
- Los roles deben seguir el principio de mínimo privilegio
- Revisar políticas de seguridad regularmente

## 📞 Contacto de Seguridad

Si encuentras algún problema de seguridad:
1. No abrir un issue público
2. Contactar directamente al equipo de desarrollo
3. Reportar vulnerabilidades de forma privada

## 🔄 Actualizaciones de Seguridad

- Revisar regularmente las dependencias con `npm audit`
- Mantener actualizadas las claves API
- Rotar credenciales de AWS periódicamente
- Monitorear logs de acceso y uso

---

**⚠️ Importante**: Este archivo `.gitignore` protege automáticamente los archivos sensibles, pero es responsabilidad del desarrollador no subir manualmente información sensible al repositorio.
