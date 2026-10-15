# Guía de instalación

## 1. El gateway de WhatsApp

El asistente no habla con WhatsApp directamente: se apoya en un **gateway** que
expone una API REST local y mantiene la sesión de WhatsApp Web. Dos opciones
probadas:

- **[OpenWA](https://github.com/rmyndharis/OpenWA)** (NestJS, el que usa el autor).
- **[WAHA](https://waha.devlike.pro/)** (Docker, muy fácil de levantar).

Levántalo siguiendo su propio README. Al final tendrás tres datos:
- **URL base** (p. ej. `http://localhost:2785`)
- **Session ID**
- **API key**

Vincula tu WhatsApp al gateway **una vez** (código QR o código de emparejamiento
de 8 dígitos desde *Ajustes → Dispositivos vinculados* en el móvil).

> **Número propio vs dedicado.** Puedes vincular tu número de siempre (modo
> `own`: te escribes "contigo mismo") o un segundo número solo para el asistente
> (modo `dedicated`, recomendado para separar). El wizard te lo pregunta.

## 2. Dependencias

```bash
# Node y ffmpeg
node --version      # >= 20
ffmpeg -version

# Claude Code, instalado y con sesión iniciada
claude --version

# Python + modelos de voz
python3 -m venv .venv
. .venv/bin/activate
pip install faster-whisper edge-tts
```

## 3. Configuración

```bash
npm run setup
```

Responde a las preguntas (nombre del asistente, voz, tono, número, datos del
gateway...). Genera `.env` y `prompts/assistant.local.md`. Puedes reeditar ese
`.local.md` cuando quieras para afinar el carácter.

## 4. Prueba y arranque

```bash
# prueba suelta de que envía:
echo "hola, ya estoy en marcha" > /tmp/t.txt
node scripts/send-text.mjs /tmp/t.txt

# arranca el asistente (vigila + responde):
npm start
```

Escríbele por WhatsApp desde tu número. Debería contestar.

## 5. Dejarlo siempre encendido

### Linux (systemd)
Ver [`systemd/claude-wa-assistant.service.example`](../systemd/claude-wa-assistant.service.example).

### Windows
El asistente también corre en Windows (Node, Python, ffmpeg y Claude Code son
multiplataforma). Diferencias:

```powershell
# En vez de install.sh:
python -m venv .venv
.venv\Scripts\activate
pip install faster-whisper edge-tts

npm run setup
npm start
```

En tu `.env`, apunta los binarios de Python al venv de Windows:
```
PYTHON_BIN=.venv\Scripts\python.exe
EDGE_TTS_BIN=.venv\Scripts\edge-tts.exe
```
Asegúrate de que `ffmpeg` está en el PATH y de que `claude --version` funciona.
El dispatcher ya lanza `claude` con shell en Windows (porque suele ser un `.cmd`).

Para dejarlo siempre encendido usa el **Programador de tareas** (trigger "Al
iniciar sesión") o [NSSM](https://nssm.cc/) para correrlo como servicio, en vez
de systemd.

### macOS
Igual que Linux pero con `launchd` en lugar de systemd para el arranque
automático (o simplemente `npm start` en una sesión persistente).

## Resolución de problemas

- **`edge-tts` da 403 al generar voz** → `pip install -U edge-tts` (Microsoft
  rota un token y las versiones viejas dejan de funcionar).
- **`POLL_ERROR status=409/500` sueltos** → transitorios cuando WhatsApp Web se
  recarga; el vigilante se recupera solo (`POLL_RECOVERED`). No reinicies por eso.
- **Se desvincula la sesión cada pocos minutos** → tu gateway está fijando una
  versión de WhatsApp Web que quedó obsoleta; actualízala (en OpenWA, la variable
  de versión de WWEBJS a la última de
  [wa-version](https://github.com/wppconnect-team/wa-version)).
- **No responde** → mira que `claude` arranca solo (`claude -p "hola"`), que la
  sesión del gateway está `ready`, y los logs del dispatcher.
