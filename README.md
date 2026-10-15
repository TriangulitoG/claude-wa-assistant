# claude-wa-assistant

**Turn [Claude Code](https://claude.com/claude-code) into your own personal
assistant on WhatsApp — powered by your flat‑rate Pro/Max subscription, not a
pay‑per‑token API.**

Send it a text, a voice note, a photo or a document and it replies right in your
WhatsApp chat. It transcribes your voice notes, answers back **by voice or text**,
*reads* the images and files you send, and can run scheduled daily briefings —
all driven by a real Claude Code session, so there's **no per‑message API bill**.

> It's not "a bridge to Claude". It ships with a built‑in **personal‑assistant
> personality** and a first‑run setup wizard, so out of the box it behaves like
> an assistant — not a blank chat window.

---

## Why this exists

Most WhatsApp + AI bots bill you per message through an API key. If you already
pay a flat monthly fee for Claude Code (Pro/Max), paying again per token to chat
with it over WhatsApp makes no sense. This project uses **Claude Code itself** as
the brain: each incoming WhatsApp message is handed to a headless `claude -p`
turn that answers you back. You pay what you already pay. Nothing more.

## Features

- 💬 **Text, voice, image & document** messages — all handled.
- 🎙️ **Voice in → voice out**: transcribes your voice notes (local
  [faster‑whisper](https://github.com/SYSTRAN/faster-whisper), no cloud) and can
  reply with a natural voice note (edge‑tts).
- 👀 **Actually looks at media**: images and documents are downloaded and read,
  not guessed from the caption.
- 🧠 **Claude Code as the brain** — your subscription, your tools. Give it your
  calendar, your servers, your scripts; it can use the terminal.
- 🧩 **Built‑in assistant persona** + `npm run setup` wizard: pick its name,
  voice, tone, and whether it runs on your **own number** or a **dedicated** one.
- 🔒 **Owner‑only**: it answers a single number — yours.
- ♻️ **Self‑healing**: backoff on gateway hiccups, runs under systemd.

## How it works

```
WhatsApp  ──►  Gateway (OpenWA / WAHA, local REST API)
                   │
          watch-messages.mjs  (polls for new messages → events)
                   │
            dispatcher.mjs  (the brain)
                   │  voice→transcribe · image/doc→download
                   ▼
            claude -p  +  your assistant persona
                   │  replies by running…
                   ▼
   send-text.mjs / send-voice.mjs / send-image.mjs / send-document.mjs  ──►  WhatsApp
```

## Requirements

- **A WhatsApp gateway** exposing a local REST API —
  [OpenWA](https://github.com/rmyndharis/OpenWA) or
  [WAHA](https://waha.devlike.pro/). You link your WhatsApp to it once (QR or
  pairing code).
- **Claude Code**, installed and logged in (`claude --version`).
- **Node.js ≥ 20** and **ffmpeg**.
- **Python 3** with `faster-whisper` (transcription) and `edge-tts` (voice replies).

Runs on **Linux, macOS and Windows** — everything it depends on is
cross‑platform. See [`docs/SETUP.md`](docs/SETUP.md) for the per‑OS notes
(`install.sh`/systemd on Linux; venv + Task Scheduler/NSSM on Windows).

## Quick start

```bash
git clone https://github.com/<you>/claude-wa-assistant.git
cd claude-wa-assistant
npm install                      # (no runtime deps; sets up bins)
python3 -m venv .venv && . .venv/bin/activate
pip install faster-whisper edge-tts

npm run setup                    # interactive wizard → writes .env + persona
npm start                        # start the assistant
```

Then message yourself/your bot from your own number. See
[`docs/SETUP.md`](docs/SETUP.md) for the full walk‑through and the systemd unit.

## Configuration

Everything lives in `.env` (created by the wizard; see
[`.env.example`](.env.example) for every option). Nothing sensitive is ever
committed — `.env`, API keys and session data are git‑ignored.

## A note on fair use

Running Claude Code headless as a messaging backend is a community pattern, not
an official Anthropic product. Use your own account, keep it personal, and review
Anthropic's current terms — some similar projects have had access restricted.

## License

MIT — see [`LICENSE`](LICENSE).
