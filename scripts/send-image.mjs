#!/usr/bin/env node
// Envía una imagen con pie de foto. Uso:
//   node scripts/send-image.mjs <imagen> <archivo-caption-utf8> [chat-ids-extra]
import { readFileSync } from "node:fs";
import { extname, basename } from "node:path";
import { config, requireConfig, waHeaders, apiUrl, toChatId } from "../config.mjs";

requireConfig(["sessionId", "apiKey", "ownerChatId"]);

const [, , imagePath, captionPath, extraChatIds] = process.argv;
if (!imagePath || !captionPath) {
  console.error("Uso: send-image.mjs <imagen> <archivo-caption-utf8> [chat-ids-extra]");
  process.exit(1);
}

const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};
const mimetype = MIME[extname(imagePath).toLowerCase()] || "image/png";

const chatIds = [
  config.ownerChatId,
  ...(extraChatIds ? extraChatIds.split(",").map((s) => s.trim()).filter(Boolean) : []),
].map(toChatId);

const base64 = readFileSync(imagePath).toString("base64");
const caption = readFileSync(captionPath, "utf8").trim();

for (const chatId of chatIds) {
  await fetch(apiUrl("/chats/typing"), {
    method: "POST",
    headers: waHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ chatId, state: "typing" }),
  }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1200));

  const res = await fetch(apiUrl("/messages/send-image"), {
    method: "POST",
    headers: waHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ chatId, base64, mimetype, filename: basename(imagePath), caption }),
  });
  console.log(`chatId=${chatId} status=${res.status} ${await res.text()}`);
}
