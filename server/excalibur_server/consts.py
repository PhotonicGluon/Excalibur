import os
from pathlib import Path

ROOT_FOLDER = Path(os.getenv("EXCALIBUR_ROOT_FOLDER", "excalibur-files")).resolve()
FILES_FOLDER = ROOT_FOLDER / "vault"

MAX_FILE_SIZE = 50_000 * 1024  # 50 MiB
