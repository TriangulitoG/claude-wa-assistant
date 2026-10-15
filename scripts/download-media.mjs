#!/usr/bin/env node
// Descarga el adjunto (audio/imagen/documento) de un mensaje concreto.
// Uso:  node scripts/download-media.mjs <messageId> <ruta-salida> [chatId]
// Si no se pasa chatId, usa el del dueño. Imprime la ruta y el content-type.
import { writeFileSync } from "node:fs";
import { config, requireConfig, waHeaders, apiUrl, toChatId } from "../config.mjs";

requireConfig(["sessionId", "apiKey", "ownerChatId"]);

const [, , messageId, outPath, chatArg] = process.argv;
if (!messageId || !outPath) {
  console.error("Uso: download-media.mjs <messageId> <ruta-salida> [chatId]");
  process.exit(1);
}

const chatId = toChatId(chatArg || config.ownerChatId);
const url = apiUrl(
  `/messages/${encodeURIComponent(chatId)}/${encodeURIComponent(messageId)}/media`
);

const res = await fetch(url, { headers: waHeaders() });
if (!res.ok) {
  console.error(`ERROR status=${res.status} ${await res.text()}`);
  process.exit(1);
}
const buf = Buffer.from(await res.arrayBuffer());
writeFileSync(outPath, buf);
console.log(`OK path=${outPath} ctype=${res.headers.get("content-type")} bytes=${buf.length}`);
