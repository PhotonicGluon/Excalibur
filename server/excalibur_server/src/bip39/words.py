import json
from pathlib import Path

WORDS: list[str] = []
with open(Path(__file__).parent / "bip39-english.json") as f:
    WORDS = json.load(f)
