# Checkly Monitoring Configuration

This directory contains the Checkly monitoring configuration for Shogun production environment.

## Setup

1. **Install Checkly CLI** (if not already installed):
   ```bash
   npm install --save-dev checkly
   ```

2. **Autenticarse con Checkly**:

   **Opción A: Usar API Key de Checkly (Recomendado)**
   ```bash
   # 1. Obtener API Key desde Checkly Dashboard
   #    Account Settings → API Keys → Create new API Key
   
   # 2. Configurar variables de entorno
   export CHECKLY_API_KEY=your_checkly_api_key
   export CHECKLY_ACCOUNT_ID=your_account_id
   
   # 3. Verificar autenticación
   npx checkly whoami
   ```

   **Opción B: Login interactivo**
   ```bash
   npx checkly login
   ```

3. **Configurar Variables de Entorno en Checkly Dashboard**:
   - Ir a Settings → Environment Variables
   - Agregar:
     - `CHECKLY_TEST_USER_EMAIL`: Email del usuario de prueba de Shogun
     - `CHECKLY_TEST_USER_PASSWORD`: Password del usuario de prueba de Shogun
   - ⚠️ **Importante**: Crear un usuario específico para monitoring con permisos mínimos

## Commands

```bash
# Test checks locally
npm run checkly:test

# Deploy checks to Checkly
npm run checkly:deploy

# List deployed checks
npm run checkly:list
```

## Structure

- `api-checks/` - API monitoring checks
  - `health.check.ts` - Health check monitors (#1, #2)
  - `cloudflare.check.ts` - Cloudflare Tunnel monitors (#3, #5, #10)
  - `auth.check.ts` - Authentication login monitor (#6)
  - `services.check.ts` - Service monitors (#7, #9)
- `browser-checks/` - Browser monitoring checks
  - `homepage.spec.ts` - Frontend homepage monitor (#4)
  - `login.spec.ts` - Login flow monitor (#8)

## Monitors (10 total - Free Tier limit)

### Critical (5)
1. API Health Basic - 10 min
2. API Health Complete - 20 min
3. CF Tunnel API - 20 min
4. Frontend Homepage - 90 min
5. CF Tunnel Frontend - 20 min

### Important (3)
6. Authentication Login - 60 min
7. Get Projects - 60 min
8. Login Flow - 180 min

### Informative (2)
9. Swagger Docs - 120 min
10. MinIO Health - 60 min

## Free Tier Limits

- ✅ 10 Uptime Monitors (API + Browser combined)
- ✅ 10,000 API checks/month (~9,560 planned)
- ✅ 1,000 Browser checks/month (~720 planned)
- ✅ Minimum frequency: 2 minutes

