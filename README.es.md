# claude-wa-assistant

**🌐 [English](README.md) · Español**

**Convierte [Claude Code](https://claude.com/claude-code) en tu asistente personal
dentro de WhatsApp — con tu suscripción de tarifa plana Pro/Max, no con una API
que cobra por mensaje.**

Mándale un texto, una nota de voz, una foto o un documento y te responde en tu
propio chat de WhatsApp. Transcribe tus audios, contesta **por voz o por texto**,
*mira* las imágenes y archivos que le envías y puede lanzar resúmenes diarios
programados — todo movido por una sesión real de Claude Code, así que **no hay
factura por mensaje**.

> No es "un puente a Claude". Viene con una **personalidad de asistente personal**
> incorporada y un asistente de configuración inicial, así que de serie se comporta
> como un asistente, no como un chat en blanco.

---

## Por qué existe

La mayoría de bots de WhatsApp + IA te cobran por mensaje vía API. Si ya pagas una
cuota mensual plana por Claude Code (Pro/Max), volver a pagar por token para hablar
con él por WhatsApp no tiene sentido. Este proyecto usa **el propio Claude Code**
como cerebro: cada mensaje entrante se entrega a un turno headless de `claude -p`
que te responde. Pagas lo que ya pagas. Nada más.

## Funciones

- 💬 **Texto, voz, imagen y documentos** — todo gestionado.
- 🎙️ **Voz entra → voz sale**: transcribe tus notas de voz
  ([faster‑whisper](https://github.com/SYSTRAN/faster-whisper) local, sin nube) y
  puede responder con una nota de voz natural (edge‑tts).
- 👀 **Mira la media de verdad**: las imágenes y documentos se descargan y se leen,
  no se adivinan por el pie de foto.
- 🧠 **Claude Code como cerebro** — tu suscripción, tus herramientas. Dale tu
  calendario, tus servidores, tus scripts; puede usar la terminal.
- 🧩 **Personalidad de asistente incorporada** + asistente `npm run setup`: eliges
  su nombre, voz, tono y si corre en **tu propio número** o en uno **dedicado**.
- 🔒 **Solo tu dueño**: responde a un único número, el tuyo.
- ♻️ **Auto‑recuperación**: backoff ante fallos del gateway, corre bajo systemd.

## Cómo funciona

```
WhatsApp  ──►  Gateway (OpenWA / WAHA, API REST local)
                   │
          watch-messages.mjs  (sondea mensajes nuevos → eventos)
                   │
            dispatcher.mjs  (el cerebro)
                   │  voz→transcribe · imagen/doc→descarga
                   ▼
            claude -p  +  tu personalidad de asistente
                   │  responde ejecutando…
                   ▼
   send-text.mjs / send-voice.mjs / send-image.mjs / send-document.mjs  ──►  WhatsApp
```

## Requisitos

- **Un gateway de WhatsApp** con API REST local —
  [OpenWA](https://github.com/rmyndharis/OpenWA) o
  [WAHA](https://waha.devlike.pro/). Vinculas tu WhatsApp una vez (QR o código).
- **Claude Code**, instalado y con sesión iniciada (`claude --version`).
- **Node.js ≥ 20** y **ffmpeg**.
- **Python 3** con `faster-whisper` (transcripción) y `edge-tts` (respuestas en voz).

Funciona en **Linux, macOS y Windows** — todo lo que necesita es multiplataforma.
Ver [`docs/SETUP.md`](docs/SETUP.md) para las notas por sistema.

## Inicio rápido

```bash
git clone https://github.com/<tu-usuario>/claude-wa-assistant.git
cd claude-wa-assistant
npm install
python3 -m venv .venv && . .venv/bin/activate
pip install faster-whisper edge-tts

npm run setup     # asistente interactivo → genera .env + personalidad
npm start         # arranca el asistente
```

Luego escríbele desde tu número. Ver [`docs/SETUP.md`](docs/SETUP.md) para el paso
a paso completo y la unidad systemd.

## Configuración

Todo vive en `.env` (lo crea el asistente; ver [`.env.example`](.env.example) para
cada opción). Nada sensible se sube nunca a git: `.env`, claves y datos de sesión
están en `.gitignore`.

## Nota sobre el uso responsable

Usar Claude Code headless como backend de mensajería es un patrón de la comunidad,
no un producto oficial de Anthropic. Usa tu propia cuenta, mantenlo personal y
revisa las condiciones vigentes de Anthropic — a algunos proyectos parecidos les
han restringido el acceso.

## Licencia

MIT — ver [`LICENSE`](LICENSE).
