#!/usr/bin/env bash
# Instalador de dependencias de claude-wa-assistant.
# Crea el venv de Python e instala faster-whisper y edge-tts. Comprueba el resto.
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Comprobando requisitos del sistema"
command -v node >/dev/null || { echo "Falta Node.js (>=20). Instálalo primero."; exit 1; }
command -v ffmpeg >/dev/null || echo "AVISO: falta ffmpeg (hace falta para las notas de voz)."
command -v claude >/dev/null || echo "AVISO: falta 'claude' (Claude Code) o no está en el PATH."
command -v python3 >/dev/null || { echo "Falta python3."; exit 1; }

echo "==> Node: $(node --version)"

echo "==> Creando entorno virtual de Python (.venv)"
python3 -m venv .venv
# shellcheck disable=SC1091
. .venv/bin/activate
pip install --quiet --upgrade pip
echo "==> Instalando faster-whisper y edge-tts"
pip install --quiet faster-whisper edge-tts

echo
echo "✅ Dependencias listas."
echo "   Ahora:  npm run setup   (configura tu asistente)"
echo "   Luego:  npm start       (arráncalo)"
