#!/usr/bin/env node
// Envía un mensaje de texto. Uso:
//   node scripts/send-text.mjs <archivo-texto-utf8> [chat-ids-extra-separados-por-coma]
// Si no se pasan chat-ids extra, va al dueño (WA_OWNER_CHAT_ID).
import { readFileSync } from "node:fs";
import { config, requireConfig, waHeaders, apiUrl, toChatId } from "../config.mjs";

requireConfig(["sessionId", "apiKey", "ownerChatId"]);

const [, , textPath, extraChatIds] = process.argv;
if (!textPath) {
  console.error("Uso: send-text.mjs <archivo-texto-utf8> [chat-ids-extra]");
  process.exit(1);
}

const chatIds = [
  config.ownerChatId,
  ...(extraChatIds ? extraChatIds.split(",").map((s) => s.trim()).filter(Boolean) : []),
].map(toChatId);

const text = readFileSync(textPath, "utf8").trim();

for (const chatId of chatIds) {
  // Indicador "escribiendo..." para que se lea natural.
  await fetch(apiUrl("/chats/typing"), {
    method: "POST",
    headers: waHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ chatId, state: "typing" }),
  }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1200));

  const res = await fetch(apiUrl("/messages/send-text"), {
    method: "POST",
    headers: waHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ chatId, text }),
  });
  console.log(`chatId=${chatId} status=${res.status} ${await res.text()}`);
}
