#!/usr/bin/env node
// Asistente de configuración inicial (primer arranque).
// Pregunta lo justo y genera:
//   - .env                         (configuración)
//   - prompts/assistant.local.md   (personalidad personalizada)
// No hay que editar ningún archivo a mano.
//
//   node setup.mjs          (interactivo)
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const rl = createInterface({ input: stdin, output: stdout });

async function ask(q, def = "") {
  const hint = def ? ` [${def}]` : "";
  const a = (await rl.question(`${q}${hint}: `)).trim();
  return a || def;
}
async function askYN(q, def = true) {
  const a = (await rl.question(`${q} (${def ? "S/n" : "s/N"}): `)).trim().toLowerCase();
  if (!a) return def;
  return a === "s" || a === "si" || a === "sí" || a === "y" || a === "yes";
}

console.log(`
╔══════════════════════════════════════════════╗
║   claude-wa-assistant · configuración inicial  ║
╚══════════════════════════════════════════════╝
Te hago unas preguntas y te dejo todo listo. Enter = valor por defecto.
`);

if (existsSync(join(ROOT, ".env"))) {
  const ok = await askYN("Ya existe un .env. ¿Sobrescribir?", false);
  if (!ok) {
    console.log("Cancelado. No he tocado nada.");
    rl.close();
    process.exit(0);
  }
}

// --- Personalidad -----------------------------------------------------------
console.log("\n— Tu asistente —");
const name = await ask("¿Cómo se llama tu asistente?", "Viernes");
const lang = await ask("Idioma principal (es, en, pt, fr...)", "es");
const tone = await ask(
  "¿Cómo quieres que hable? (describe el tono)",
  "cercano, directo y con sentido del humor"
);
const picture = await ask(
  "Ruta a una imagen para la foto de perfil (opcional, Enter para saltar)",
  ""
);

// --- Voz --------------------------------------------------------------------
console.log("\n— Voz (notas de voz) —");
const ttsVoice = await ask(
  "Voz de edge-tts (mira `edge-tts --list-voices`)",
  lang === "es" ? "es-ES-AlvaroNeural" : "en-US-GuyNeural"
);
const ttsReply = await askYN("¿Contestar con nota de voz cuando te hablen por voz?", true);

// --- Transcripción ----------------------------------------------------------
console.log("\n— Transcripción de audios entrantes —");
const sttModel = await ask("Modelo whisper (tiny/base/small/medium/large-v3)", "small");
const sttLang = await ask("Idioma a forzar en transcripción (vacío = autodetectar)", lang);

// --- Número / gateway -------------------------------------------------------
console.log("\n— WhatsApp —");
console.log(
  "Modo 'own'      = el asistente va en TU PROPIO número (te hablas a ti mismo).\n" +
  "Modo 'dedicated'= va en un número APARTE y le escribes desde el tuyo."
);
const mode = (await ask("Modo (own/dedicated)", "dedicated")).toLowerCase() === "own"
  ? "own"
  : "dedicated";
const ownerNum = await ask(
  "Tu número (con prefijo de país, sin +). Es a quien responde el asistente",
  "34600000000"
);
const baseUrl = await ask("URL del gateway de WhatsApp (OpenWA/WAHA)", "http://localhost:2785");
const sessionId = await ask("Id de sesión del gateway", "");
const apiKey = await ask("API key del gateway (se guarda en .env)", "");

// --- Claude Code ------------------------------------------------------------
console.log("\n— Cerebro (Claude Code) —");
const claudeBin = await ask("Ruta al binario de Claude Code", "claude");

rl.close();

// --- escribir .env ----------------------------------------------------------
const env = `# Generado por setup.mjs el ${new Date().toISOString()}
WA_BASE_URL=${baseUrl}
WA_SESSION_ID=${sessionId}
WA_API_KEY=${apiKey}
WA_OWNER_CHAT_ID=${ownerNum.replace(/[^0-9]/g, "")}@c.us
WA_MODE=${mode}

ASSISTANT_NAME=${name}
ASSISTANT_LANG=${lang}
PROFILE_PICTURE=${picture}

TTS_VOICE=${ttsVoice}
TTS_REPLY_TO_VOICE=${ttsReply}

STT_MODEL=${sttModel}
STT_LANG=${sttLang}

CLAUDE_BIN=${claudeBin}
CLAUDE_EXTRA_ARGS=
POLL_MS=12000
`;
writeFileSync(join(ROOT, ".env"), env, "utf8");

// --- escribir personalidad personalizada ------------------------------------
const template = readFileSync(join(ROOT, "prompts", "assistant.md"), "utf8")
  // quita el comentario-guía de la plantilla
  .replace(/<!--[\s\S]*?-->\n?/, "")
  .replaceAll("{{ASSISTANT_NAME}}", name)
  .replaceAll("{{LANG}}", lang)
  .replaceAll("{{TONE}}", tone);
writeFileSync(join(ROOT, "prompts", "assistant.local.md"), template, "utf8");

console.log(`
✅ Listo.
   · .env creado.
   · prompts/assistant.local.md con la personalidad de "${name}".

Siguientes pasos:
   1. Asegúrate de que el gateway de WhatsApp está corriendo y la sesión vinculada.
   2. Aplica nombre${picture ? " y foto" : ""} de perfil:   node scripts/set-profile.mjs
   3. Arranca el asistente:   npm start
   4. Escríbele por WhatsApp desde ${ownerNum}.

Para cambiar el carácter, edita prompts/assistant.local.md cuando quieras.
`);
