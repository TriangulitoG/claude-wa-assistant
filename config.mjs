// Cargador de configuración compartido.
// Lee `.env` (formato KEY=VALUE, sin dependencias externas) y las variables de
// entorno del proceso. NO contiene ningún secreto: todo viene del .env local,
// que está en .gitignore.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const ROOT = dirname(fileURLToPath(import.meta.url));

function parseEnvFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  const text = readFileSync(path, "utf8");
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    // Quita comillas envolventes si las hay.
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

// Prioridad: variable de entorno del proceso > .env.
const fileEnv = parseEnvFile(join(ROOT, ".env"));
function get(key, fallback = "") {
  const v = process.env[key] ?? fileEnv[key];
  return v === undefined || v === "" ? fallback : v;
}

function resolveApiKey() {
  const direct = get("WA_API_KEY");
  if (direct) return direct;
  const file = get("WA_API_KEY_FILE");
  if (file && existsSync(file)) return readFileSync(file, "utf8").trim();
  return "";
}

export const config = {
  baseUrl: get("WA_BASE_URL", "http://localhost:2785").replace(/\/+$/, ""),
  sessionId: get("WA_SESSION_ID"),
  apiKey: resolveApiKey(),
  ownerChatId: get("WA_OWNER_CHAT_ID"),
  mode: get("WA_MODE", "dedicated"),

  assistantName: get("ASSISTANT_NAME", "Asistente"),
  lang: get("ASSISTANT_LANG", "es"),
  profilePicture: get("PROFILE_PICTURE"),

  ttsVoice: get("TTS_VOICE", "es-ES-AlvaroNeural"),
  ttsReplyToVoice: get("TTS_REPLY_TO_VOICE", "true") === "true",

  sttModel: get("STT_MODEL", "small"),
  sttLang: get("STT_LANG", "es"),

  claudeBin: get("CLAUDE_BIN", "claude"),
  claudeExtraArgs: get("CLAUDE_EXTRA_ARGS", ""),

  pollMs: Number(get("POLL_MS", "12000")),
};

// Comprueba que lo esencial está presente; da un error claro si no.
export function requireConfig(keys) {
  const missing = [];
  for (const k of keys) {
    if (!config[k]) missing.push(k);
  }
  if (missing.length) {
    console.error(
      `[config] Faltan valores obligatorios: ${missing.join(", ")}.\n` +
        `Ejecuta \`npm run setup\` o edita el archivo .env (ver .env.example).`
    );
    process.exit(1);
  }
}

// Cabeceras HTTP para el gateway.
export function waHeaders(extra = {}) {
  return { "x-api-key": config.apiKey, ...extra };
}

export function apiUrl(path) {
  return `${config.baseUrl}/api/sessions/${config.sessionId}${path}`;
}

// Normaliza un número suelto a chatId <numero>@c.us; deja intactos los que ya
// traen sufijo (@c.us / @g.us / @lid).
export function toChatId(x) {
  const s = String(x).trim();
  if (s.includes("@")) return s;
  return `${s.replace(/[^0-9]/g, "")}@c.us`;
}
