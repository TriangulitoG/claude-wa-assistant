#!/usr/bin/env python3
"""Transcribe un archivo de audio a texto con faster-whisper (local, sin API).

Uso:  python scripts/transcribe.py <archivo-audio>

Configuración por entorno:
  STT_MODEL  modelo de whisper (tiny|base|small|medium|large-v3). Def: small
  STT_LANG   idioma forzado (ISO 639-1); vacío = autodetectar. Def: es
Imprime la transcripción por stdout.
"""
import os
import sys
from pathlib import Path

from faster_whisper import WhisperModel

# Fuerza UTF-8 en stdout (algunas consolas usan cp1252 y petan con ciertos
# símbolos que Whisper puede emitir).
sys.stdout.reconfigure(encoding="utf-8")

MODEL_DIR = Path(__file__).resolve().parent.parent / "data" / "whisper-models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def main() -> None:
    if len(sys.argv) < 2:
        print("Uso: transcribe.py <archivo-audio>", file=sys.stderr)
        sys.exit(1)

    audio_path = sys.argv[1]
    model_name = os.environ.get("STT_MODEL", "small")
    lang = os.environ.get("STT_LANG", "es").strip() or None

    model = WhisperModel(
        model_name,
        device="cpu",
        compute_type="int8",
        download_root=str(MODEL_DIR),
    )
    segments, _info = model.transcribe(audio_path, beam_size=5, language=lang)
    text = "".join(segment.text for segment in segments).strip()
    print(text)


if __name__ == "__main__":
    main()
