# 🔒 Guía de Seguridad - API Keys

## ⚠️ IMPORTANTE: Tu API Key de OpenAI está EXPUESTA

### Problemas Actuales:
1. **API Key en variables de entorno** - Visible en terminal y logs
2. **API Key en CloudFormation** - Almacenada en parámetros de AWS
3. **API Key en código** - Puede aparecer en logs de deploy

### 🔧 Solución: Usar AWS Secrets Manager

#### Paso 1: Configurar el Secret
```bash
# Configurar tu API key de manera segura
npm run setup-secret
```

#### Paso 2: Deploy Seguro
```bash
# Deploy con secret configurado
npm run deploy:secure
```

### 🛡️ Beneficios de Secrets Manager:
- ✅ **Encriptado automáticamente**
- ✅ **Rotación automática de claves**
- ✅ **Auditoría completa**
- ✅ **No aparece en logs**
- ✅ **Permisos granulares**

### 🚨 Acciones Inmediatas:

1. **Revoca tu API key actual** en OpenAI:
   - Ve a https://platform.openai.com/api-keys
   - Encuentra tu key actual y revócala
   - Crea una nueva key

2. **Configura el secret**:
   ```bash
   export OPENAI_API_KEY="tu-nueva-api-key"
   npm run setup-secret
   ```

3. **Deploy seguro**:
   ```bash
   npm run deploy:secure
   ```

### 🔍 Verificar Seguridad:
```bash
# Verificar que el secret existe
aws secretsmanager describe-secret --secret-id openai-api-key

# Verificar permisos de la Lambda
aws iam get-role-policy --role-name AiWebStack-ChatHandlerServiceRole --policy-name default
```

### 📋 Checklist de Seguridad:
- [ ] API key revocada en OpenAI
- [ ] Nueva API key creada
- [ ] Secret configurado en AWS
- [ ] Deploy realizado con secret
- [ ] Variables de entorno limpiadas
- [ ] Logs verificados (no contienen API key)

### 🆘 Si tu API key fue comprometida:
1. **Revoca inmediatamente** en OpenAI
2. **Revisa logs** de uso en OpenAI
3. **Crea nueva key**
4. **Configura secret** con nueva key
5. **Redeploy** la aplicación
6. **Monitorea** uso de la nueva key
