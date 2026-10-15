#!/usr/bin/env node
// Vigilante de mensajes entrantes. Sondea el historial del chat del dueño y
// emite UNA línea de evento por stdout por cada mensaje nuevo entrante:
//   NEW_MESSAGE {id,timestamp,body}
//   VOICE_MESSAGE {id,timestamp}
//   IMAGE_MESSAGE {id,timestamp,caption}
//   DOCUMENT_MESSAGE {id,timestamp,caption}
// El dispatcher lee estas líneas; también sirve suelto para depurar.
//
// Diseño anti-rate-limit: backoff exponencial ante fallos y UN solo aviso por
// racha (POLL_ERROR) + uno al recuperarse (POLL_RECOVERED), nunca uno por intento.
//
// Uso:  node scripts/watch-messages.mjs [checkpointTsUnix]
import { config, requireConfig, waHeaders, apiUrl, toChatId } from "../config.mjs";

requireConfig(["sessionId", "apiKey", "ownerChatId"]);

const CHAT_ID = toChatId(config.ownerChatId);
const POLL_MS = config.pollMs;
const MAX_BACKOFF_MS = 120000;

let checkpointTs = Number(process.argv[2] || 0);
let consecutiveErrors = 0;
let announcedError = false;

function backoffMs() {
  const ms = POLL_MS * Math.pow(2, Math.min(consecutiveErrors - 1, 4));
  return Math.min(ms, MAX_BACKOFF_MS);
}

async function pollOnce() {
  const res = await fetch(
    apiUrl(`/messages/${encodeURIComponent(CHAT_ID)}/history?limit=20`),
    { headers: waHeaders() }
  );
  if (!res.ok) {
    consecutiveErrors++;
    if (!announcedError) {
      console.log(`POLL_ERROR status=${res.status} (reintentando con backoff)`);
      announcedError = true;
    }
    return;
  }
  if (consecutiveErrors > 0) {
    console.log(`POLL_RECOVERED tras ${consecutiveErrors} fallo(s)`);
    consecutiveErrors = 0;
    announcedError = false;
  }

  const messages = await res.json();
  if (!Array.isArray(messages) || messages.length === 0) return;

  let maxTs = checkpointTs;
  for (const m of messages) if (m.timestamp > maxTs) maxTs = m.timestamp;

  const fresh = messages
    .filter((m) => m.timestamp > checkpointTs && m.fromMe === false)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (fresh.length > 0) {
    // Marca el chat como leído (doble check azul).
    fetch(apiUrl("/chats/read"), {
      method: "POST",
      headers: waHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ chatId: CHAT_ID }),
    }).catch(() => {});
  }

  for (const m of fresh) {
    if (m.type === "voice" || m.type === "ptt" || m.type === "audio") {
      console.log(`VOICE_MESSAGE ${JSON.stringify({ id: m.id, timestamp: m.timestamp })}`);
    } else if (m.type === "image") {
      console.log(`IMAGE_MESSAGE ${JSON.stringify({ id: m.id, timestamp: m.timestamp, caption: m.body })}`);
    } else if (m.type === "document") {
      console.log(`DOCUMENT_MESSAGE ${JSON.stringify({ id: m.id, timestamp: m.timestamp, caption: m.body })}`);
    } else {
      console.log(`NEW_MESSAGE ${JSON.stringify({ id: m.id, timestamp: m.timestamp, body: m.body })}`);
    }
  }

  checkpointTs = maxTs;
}

console.log(`WATCH_START checkpoint=${checkpointTs}`);

while (true) {
  let wait = POLL_MS;
  try {
    await pollOnce();
    if (consecutiveErrors > 0) wait = backoffMs();
  } catch (err) {
    consecutiveErrors++;
    if (!announcedError) {
      console.log(`POLL_ERROR ${err && err.message ? err.message : String(err)} (reintentando con backoff)`);
      announcedError = true;
    }
    wait = backoffMs();
  }
  await new Promise((r) => setTimeout(r, wait));
}
