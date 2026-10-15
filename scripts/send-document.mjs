#!/usr/bin/env node
// Envía un archivo/documento. Uso:
//   node scripts/send-document.mjs <archivo> [archivo-caption-utf8] [chat-ids-extra]
import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";
import { config, requireConfig, waHeaders, apiUrl, toChatId } from "../config.mjs";

requireConfig(["sessionId", "apiKey", "ownerChatId"]);

const [, , filePath, captionPath, extraChatIds] = process.argv;
if (!filePath) {
  console.error("Uso: send-document.mjs <archivo> [archivo-caption-utf8] [chat-ids-extra]");
  process.exit(1);
}

const MIME = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".zip": "application/zip",
};
const mimetype = MIME[extname(filePath).toLowerCase()] || "application/octet-stream";

const chatIds = [
  config.ownerChatId,
  ...(extraChatIds ? extraChatIds.split(",").map((s) => s.trim()).filter(Boolean) : []),
].map(toChatId);

const base64 = readFileSync(filePath).toString("base64");
const caption = captionPath ? readFileSync(captionPath, "utf8").trim() : "";

for (const chatId of chatIds) {
  const res = await fetch(apiUrl("/messages/send-file"), {
    method: "POST",
    headers: waHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ chatId, base64, mimetype, filename: basename(filePath), caption }),
  });
  console.log(`chatId=${chatId} status=${res.status} ${await res.text()}`);
}
