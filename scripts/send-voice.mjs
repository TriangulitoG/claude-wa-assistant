#!/usr/bin/env node
// Envía una NOTA DE VOZ a partir de un texto.
// Flujo: texto -> edge-tts (mp3) -> ffmpeg (ogg/opus mono) -> send-audio ptt.
// Uso:  node scripts/send-voice.mjs <archivo-texto-utf8> [chat-ids-extra]
//
// Requisitos: `edge-tts` (pip) y `ffmpeg` en el PATH. Si edge-tts da un 403
// (Microsoft cambió el token), actualízalo: `pip install -U edge-tts`.
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { config, requireConfig, waHeaders, apiUrl, toChatId } from "../config.mjs";

requireConfig(["sessionId", "apiKey", "ownerChatId"]);

const [, , textPath, extraChatIds] = process.argv;
if (!textPath) {
  console.error("Uso: send-voice.mjs <archivo-texto-utf8> [chat-ids-extra]");
  process.exit(1);
}

const EDGE_TTS = process.env.EDGE_TTS_BIN || "edge-tts";

const chatIds = [
  config.ownerChatId,
  ...(extraChatIds ? extraChatIds.split(",").map((s) => s.trim()).filter(Boolean) : []),
].map(toChatId);

const work = mkdtempSync(join(tmpdir(), "wa-voice-"));
const mp3 = join(work, "tts.mp3");
const ogg = join(work, "voice.ogg");

try {
  execFileSync(EDGE_TTS, ["--voice", config.ttsVoice, "--file", textPath, "--write-media", mp3], {
    stdio: "inherit",
  });

  // WhatsApp solo reproduce notas de voz en ogg/opus mono; el gateway no transcodifica.
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-i", mp3, "-c:a", "libopus", "-b:a", "32k", "-ar", "48000", "-ac", "1", ogg,
  ], { stdio: "inherit" });

  const base64 = readFileSync(ogg).toString("base64");

  for (const chatId of chatIds) {
    await fetch(apiUrl("/chats/typing"), {
      method: "POST",
      headers: waHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ chatId, state: "recording" }),
    }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1200));

    const res = await fetch(apiUrl("/messages/send-audio"), {
      method: "POST",
      headers: waHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        chatId,
        base64,
        mimetype: "audio/ogg; codecs=opus",
        filename: "voice.ogg",
        ptt: true,
      }),
    });
    console.log(`chatId=${chatId} status=${res.status} ${await res.text()}`);
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
