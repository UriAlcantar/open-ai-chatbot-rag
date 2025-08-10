# AI Assistant (React + AWS Lambda + OpenAI) with CDK (us-east-2)

## Componentes
- **Frontend (Vite/React)** — UI de chat.
- **API Gateway (HTTP API)** → **Lambda (Node.js 20)** — Endpoint `/chat`.
- **OpenAI API** — se llama desde la Lambda con `responses.create`.

## Prerrequisitos
- Node.js 18+ (o 20)
- AWS CLI configurado y `cdk bootstrap` en la cuenta/región
- **OPENAI_API_KEY** disponible (variable de entorno al hacer `cdk deploy`, o via Secrets Manager).

## Deploy (primera vez)
```bash
npm install
npx cdk bootstrap aws://<ACCOUNT_ID>/us-east-2
```

1) **Configura tu API Key de OpenAI** para la Lambda:
   - Opción simple (dev): exporta var de entorno antes de deploy:
     ```bash
     export OPENAI_API_KEY=sk-xxxx
     ```
     Windows (PowerShell):
     ```powershell
     $env:OPENAI_API_KEY="sk-xxxx"
     ```
   - (Prod) Usa Secrets Manager.

2) **Despliega infra** (obtendrás `ApiBaseUrl` y `CloudFrontUrl`):
```bash
npm run deploy
```

3) **Frontend**:
```bash
cd frontend
cp .env.example .env
# VITE_API_URL=<ApiBaseUrl>
npm install
npm run build
cd ..
```

4) **Redeploy** para publicar el build:
```bash
npm run deploy
```

## Streaming (opcional)
- Plantilla responde completo (no streaming). Para streaming usa **Lambda Function URL** con `InvokeMode=RESPONSE_STREAM` y retransmite los chunks al cliente.
