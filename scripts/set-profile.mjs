#!/usr/bin/env node
// Aplica el nombre y la foto de perfil del asistente en WhatsApp.
// Lee ASSISTANT_NAME y PROFILE_PICTURE del .env. Ejecútalo UNA VEZ cuando la
// sesión del gateway ya esté vinculada (ready).
//   node scripts/set-profile.mjs            (aplica nombre + foto del .env)
//   node scripts/set-profile.mjs <imagen>   (aplica esa imagen como foto)
import { readFileSync, existsSync } from "node:fs";
import { extname } from "node:path";
import { config, requireConfig, waHeaders, apiUrl } from "../config.mjs";

requireConfig(["sessionId", "apiKey"]);

const imgArg = process.argv[2];
const picturePath = imgArg || config.profilePicture;

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

async function put(path, body) {
  const res = await fetch(apiUrl(path), {
    method: "PUT",
    headers: waHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  console.log(`PUT ${path} -> ${res.status} ${await res.text()}`);
}

// Nombre (el "pushname" que ven tus contactos).
if (config.assistantName) {
  await put("/profile/name", { name: config.assistantName });
}

// Foto.
if (picturePath) {
  if (!existsSync(picturePath)) {
    console.error(`No encuentro la imagen: ${picturePath}`);
    process.exit(1);
  }
  const mimetype = MIME[extname(picturePath).toLowerCase()] || "image/jpeg";
  const base64 = readFileSync(picturePath).toString("base64");
  await put("/profile/picture", { base64, mimetype });
} else {
  console.log("(sin PROFILE_PICTURE configurada; solo actualicé el nombre)");
}
