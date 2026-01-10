#!/bin/bash

# Script para probar la configuración de Checkly

set -e

echo "🔍 Verificando configuración de Checkly..."
echo ""

# Verificar variables de entorno
if [ -z "$CHECKLY_API_KEY" ]; then
  echo "❌ CHECKLY_API_KEY no está configurado"
  echo "   Configúralo con: export CHECKLY_API_KEY=tu_api_key"
  exit 1
else
  echo "✅ CHECKLY_API_KEY configurado (${#CHECKLY_API_KEY} caracteres)"
fi

if [ -z "$CHECKLY_ACCOUNT_ID" ]; then
  echo "❌ CHECKLY_ACCOUNT_ID no está configurado"
  echo "   Obténlo desde: Checkly Dashboard → Account Settings → API Keys"
  echo "   Configúralo con: export CHECKLY_ACCOUNT_ID=tu_account_id"
  exit 1
else
  echo "✅ CHECKLY_ACCOUNT_ID configurado: $CHECKLY_ACCOUNT_ID"
fi

echo ""
echo "🔐 Verificando autenticación con Checkly..."
npx checkly whoami

echo ""
echo "✅ Configuración correcta!"
echo ""
echo "📋 Próximos pasos:"
echo "   1. Configurar variables de entorno en Checkly Dashboard:"
echo "      Settings → Environment Variables"
echo "      - CHECKLY_TEST_USER_EMAIL: Email del usuario de prueba"
echo "      - CHECKLY_TEST_USER_PASSWORD: Password del usuario de prueba"
echo ""
echo "   2. Probar checks localmente:"
echo "      npm run checkly:test"
echo ""
echo "   3. Desplegar checks:"
echo "      npm run checkly:deploy"



