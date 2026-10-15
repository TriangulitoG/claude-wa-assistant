# Roadmap / ideas pendientes

Lista viva de lo que falta o se puede mejorar antes de publicar. (Notas internas.)

## Hecho (v0.1)
- [x] Scripts de envío generalizados (texto, voz, imagen, documento) por `config.mjs`.
- [x] Vigilante generalizado con backoff anti‑rate‑limit.
- [x] Transcripción local (faster‑whisper) con modelo/idioma configurables.
- [x] Dispatcher: mensaje entrante → `claude -p` con la personalidad → responde.
- [x] Personalidad de asistente personal incorporada (plantilla + versión .local).
- [x] Wizard de configuración inicial (nombre, voz, tono, número propio/dedicado).
- [x] README con enfoque de producto, licencia MIT, unidad systemd, guía de setup.

## Pendiente antes de publicar
- [ ] **Foto de perfil desde el wizard**: preguntar por una imagen y ponerla como
      avatar del asistente vía el endpoint del gateway (set profile picture).
      Pedido explícitamente; falta implementarlo en `setup.mjs`.
- [ ] **Briefings programados** (resumen diario: tiempo, agenda, correos/paquetes):
      portar la arquitectura headless + timers systemd como módulo opcional.
- [ ] Verificar el flujo completo end‑to‑end con un gateway real de prueba
      (no el de producción del autor).
- [ ] Probar con **WAHA** además de OpenWA y documentar diferencias de endpoints
      (nombres de rutas de envío pueden variar).
- [ ] `npm install` real: ¿añadir deps o dejarlo sin dependencias de runtime?
- [ ] Script `install.sh` que cree el venv e instale faster‑whisper/edge‑tts.
- [ ] GIF/vídeo demo para el README (lo que más engancha: voz + briefing).
- [ ] Topics de GitHub y descripción para SEO; nombre final del repo.

## Ideas / dudas abiertas
- Soporte multi‑dueño opcional (allowlist de números) manteniendo el default a 1.
- Modo "sólo sugerir" vs "actuar" para acciones sensibles.
- ¿Publicar también como plugin de Claude Code?
