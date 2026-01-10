# GitHub Actions Self-Hosted Runner Setup

Guía para configurar un runner de GitHub Actions en tu Mac para despliegues automáticos.

## 🎯 Ventajas

- ✅ **Más simple**: No necesitas SSH ni claves
- ✅ **Más rápido**: Se ejecuta directamente en el Mac
- ✅ **Más seguro**: No expones puertos SSH
- ✅ **Sin secrets**: No necesitas configurar secrets adicionales

## 📋 Requisitos

- Mac con acceso a internet
- Docker instalado y funcionando
- Git instalado

## 🚀 Configuración (5 minutos)

### Paso 1: Obtener el token de registro

1. Ve a tu repositorio en GitHub
2. **Settings** → **Actions** → **Runners**
3. Click en **"New self-hosted runner"**
4. Selecciona **macOS** como sistema operativo
5. Copia el token que aparece (algo como `AXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`)

### Paso 2: Instalar el runner en tu Mac

Abre Terminal en tu Mac y ejecuta:

```bash
# Crear carpeta para el runner
mkdir -p ~/actions-runner && cd ~/actions-runner

# Descargar el runner (reemplaza YOUR_TOKEN con el token del paso 1)
curl -o actions-runner-osx-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-osx-x64-2.311.0.tar.gz

# Extraer
tar xzf ./actions-runner-osx-x64-2.311.0.tar.gz

# Configurar (reemplaza YOUR_TOKEN y YOUR_REPO)
./config.sh --url https://github.com/TU_USUARIO/shogun --token YOUR_TOKEN
```

Cuando te pregunte:

- **Runner name**: Presiona Enter para usar el nombre del Mac
- **Labels**: Presiona Enter (no necesitas labels)
- **Work folder**: Presiona Enter (usa el default)

### Paso 3: Instalar como servicio (opcional pero recomendado)

Para que el runner se inicie automáticamente:

```bash
# Instalar como servicio
sudo ./svc.sh install

# Iniciar el servicio
sudo ./svc.sh start

# Verificar que está corriendo
./svc.sh status
```

### Paso 4: Verificar

1. Ve a **Settings** → **Actions** → **Runners** en GitHub
2. Deberías ver tu Mac listado como "Idle" (esperando trabajos)

## 🔧 Configuración del runner en el directorio del proyecto

Si quieres que el runner ejecute los comandos desde el directorio del proyecto:

```bash
cd ~/actions-runner

# Editar el archivo de configuración
nano .runner

# Cambiar el work folder (opcional, el default funciona bien)
```

O simplemente asegúrate de que el workflow use `actions/checkout@v4` (ya lo tiene).

## 🛠️ Comandos útiles

```bash
cd ~/actions-runner

# Ver estado
./svc.sh status

# Detener
sudo ./svc.sh stop

# Iniciar
sudo ./svc.sh start

# Reiniciar
sudo ./svc.sh restart

# Ver logs
tail -f ~/actions-runner/_diag/Runner_*.log
```

## 🔄 Actualizar el runner

```bash
cd ~/actions-runner

# Detener
sudo ./svc.sh stop

# Actualizar
./run.sh

# Reiniciar
sudo ./svc.sh start
```

## ⚠️ Notas importantes

1. **El Mac debe estar encendido** para que el runner funcione
2. **El runner debe tener acceso** al directorio del proyecto
3. **Docker debe estar corriendo** para los despliegues
4. Si el Mac se reinicia, el servicio se iniciará automáticamente (si lo instalaste como servicio)

## 🐛 Troubleshooting

### El runner no aparece en GitHub

- Verifica que el token sea correcto
- Revisa los logs: `tail -f ~/actions-runner/_diag/Runner_*.log`

### El workflow falla con permisos

- Asegúrate de que el usuario del runner tenga permisos para Docker
- Puede que necesites agregar tu usuario al grupo docker: `sudo dseditgroup -o edit -a $USER -t user docker`

### El runner no se conecta

- Verifica la conexión a internet
- Revisa el firewall del Mac
- Verifica que GitHub Actions esté habilitado en el repositorio

## 📚 Referencias

- [Documentación oficial de GitHub](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/about-self-hosted-runners)
- [Configuración para macOS](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/adding-self-hosted-runners)
