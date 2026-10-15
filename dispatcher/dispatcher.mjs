#!/usr/bin/env node
// EL CEREBRO. Conecta los mensajes entrantes de WhatsApp con Claude Code.
//
// Flujo:
//   1. Lanza el vigilante (scripts/watch-messages.mjs) como subproceso.
//   2. Por cada evento (texto/voz/imagen/documento) de un mensaje nuevo del dueño:
//        - voz      -> descarga el audio y lo transcribe (faster-whisper).
//        - imagen/doc-> descarga el archivo a data/incoming/ y pasa la ruta.
//        - texto    -> usa el cuerpo del mensaje.
//   3. Invoca `claude -p` en modo headless con la personalidad (prompts/) como
//      system prompt añadido. La propia sesión de Claude responde al dueño
//      ejecutando los scripts de envío (send-text / send-voice / ...).
//
// Así el asistente NO cuesta por mensaje: usa tu suscripción de Claude Code.
// Procesa un mensaje a la vez (cola) para no solapar sesiones de Claude.
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { config, requireConfig, ROOT, waHeaders, apiUrl, toChatId } from "../config.mjs";

requireConfig(["sessionId", "apiKey", "ownerChatId"]);

const CHAT_ID = toChatId(config.ownerChatId);
const INCOMING_DIR = join(ROOT, "data", "incoming");
mkdirSync(INCOMING_DIR, { recursive: true });

// Personalidad: prefiere la versión personalizada por el wizard.
const personaPath = existsSync(join(ROOT, "prompts", "assistant.local.md"))
  ? join(ROOT, "prompts", "assistant.local.md")
  : join(ROOT, "prompts", "assistant.md");
const persona = readFileSync(personaPath, "utf8");

const PYTHON = process.env.PYTHON_BIN || "python3";

function log(...a) {
  console.log(new Date().toISOString(), ...a);
}

// ---- descarga de media de un mensaje -------------------------------------
async function downloadMedia(messageId, outPath) {
  const url = apiUrl(
    `/messages/${encodeURIComponent(CHAT_ID)}/${encodeURIComponent(messageId)}/media`
  );
  const res = await fetch(url, { headers: waHeaders() });
  if (!res.ok) throw new Error(`download media ${res.status}`);
  writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
  return outPath;
}

function transcribe(audioPath) {
  return execFileSync(PYTHON, [join(ROOT, "scripts", "transcribe.py"), audioPath], {
    encoding: "utf8",
    env: { ...process.env, STT_MODEL: config.sttModel, STT_LANG: config.sttLang },
  }).trim();
}

// ---- construye el contexto que ve Claude ---------------------------------
async function buildContext(kind, data) {
  const stamp = Date.now();
  if (kind === "VOICE_MESSAGE") {
    const audio = await downloadMedia(data.id, join(INCOMING_DIR, `${stamp}.ogg`));
    const text = transcribe(audio);
    const voiceHint = config.ttsReplyToVoice
      ? "Te han hablado por NOTA DE VOZ: contesta con una nota de voz (scripts/send-voice.mjs), salvo que la respuesta sean datos copiables (entonces texto)."
      : "Te han hablado por nota de voz.";
    return `[Mensaje de voz de tu dueño]\n${voiceHint}\n\nTranscripción: "${text}"`;
  }
  if (kind === "IMAGE_MESSAGE") {
    const img = await downloadMedia(data.id, join(INCOMING_DIR, `${stamp}.img`));
    return `[Imagen de tu dueño]\nArchivo descargado en: ${img}\nÁbrelo y míralo de verdad antes de responder.\nPie de foto: ${data.caption || "(sin pie)"}`;
  }
  if (kind === "DOCUMENT_MESSAGE") {
    const doc = await downloadMedia(data.id, join(INCOMING_DIR, `${stamp}.bin`));
    return `[Documento de tu dueño]\nArchivo descargado en: ${doc}\nÁbrelo y léelo antes de responder (no te fíes del pie).\nPie: ${data.caption || "(sin pie)"}`;
  }
  // NEW_MESSAGE
  return `[Mensaje de texto de tu dueño]\n"${data.body}"`;
}

// ---- invoca Claude Code headless -----------------------------------------
function runClaude(contextPrompt) {
  return new Promise((resolve) => {
    const prompt =
      `${contextPrompt}\n\n` +
      `Responde a tu dueño por WhatsApp usando los scripts de envío del proyecto ` +
      `(escribe el texto a un archivo y lanza scripts/send-text.mjs o scripts/send-voice.mjs). ` +
      `La raíz del proyecto es ${ROOT}. No imprimas la respuesta aquí: envíala por WhatsApp.`;

    const args = [
      "-p", prompt,
      "--append-system-prompt", persona,
      "--allowedTools", "Bash Read Write WebSearch",
      "--dangerously-skip-permissions",
      ...(config.claudeExtraArgs ? config.claudeExtraArgs.split(" ").filter(Boolean) : []),
    ];

    const child = spawn(config.claudeBin, args, {
      cwd: ROOT,
      // IS_SANDBOX=1: Claude Code no pide permisos interactivos (headless).
      env: { ...process.env, IS_SANDBOX: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      // En Windows, `claude` suele ser un .cmd y spawn necesita shell para lanzarlo.
      shell: process.platform === "win32",
    });
    let out = "", err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => {
      if (code !== 0) log(`claude salió con código ${code}: ${err.slice(0, 500)}`);
      resolve({ code, out, err });
    });
    child.on("error", (e) => {
      log(`no se pudo lanzar claude (${config.claudeBin}): ${e.message}`);
      resolve({ code: -1, out: "", err: e.message });
    });
  });
}

// ---- cola serial ----------------------------------------------------------
let chain = Promise.resolve();
function enqueue(kind, data) {
  chain = chain.then(async () => {
    try {
      log(`procesando ${kind} id=${data.id}`);
      const ctx = await buildContext(kind, data);
      await runClaude(ctx);
      log(`respondido ${kind} id=${data.id}`);
    } catch (e) {
      log(`error procesando ${kind}: ${e.message}`);
    }
  });
}

// ---- arranque: vigilante como subproceso ----------------------------------
const checkpoint = Math.floor(Date.now() / 1000); // ignora historial viejo
log(`claude-wa-assistant arrancando. persona=${personaPath.split("/").pop()} mode=${config.mode}`);
log(`vigilando chat del dueño ${CHAT_ID} desde checkpoint=${checkpoint}`);

const watcher = spawn("node", [join(ROOT, "scripts", "watch-messages.mjs"), String(checkpoint)], {
  cwd: ROOT,
  env: process.env,
  stdio: ["ignore", "pipe", "inherit"],
  shell: process.platform === "win32",
});

let buf = "";
watcher.stdout.on("data", (chunk) => {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf("\n")) !== -1) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    const sp = line.indexOf(" ");
    const tag = sp === -1 ? line : line.slice(0, sp);
    const rest = sp === -1 ? "" : line.slice(sp + 1);
    if (["NEW_MESSAGE", "VOICE_MESSAGE", "IMAGE_MESSAGE", "DOCUMENT_MESSAGE"].includes(tag)) {
      try {
        enqueue(tag, JSON.parse(rest));
      } catch {
        log(`no pude parsear evento: ${line}`);
      }
    } else {
      // WATCH_START / POLL_ERROR / POLL_RECOVERED → solo log.
      log(`[watch] ${line}`);
    }
  }
});

watcher.on("close", (code) => {
  log(`el vigilante terminó (código ${code}); saliendo para que systemd reinicie.`);
  process.exit(code ?? 1);
});
