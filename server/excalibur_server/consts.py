# ruff: noqa: E402
import os
from pathlib import Path

ROOT_FOLDER = Path(os.getenv("EXCALIBUR_ROOT_FOLDER", "excalibur-files")).resolve()

FILES_FOLDER = ROOT_FOLDER / "vault"

CONFIG_TEMPLATE_FILE = Path(__file__).parent / "config.template.toml"
CONFIG_FILE = ROOT_FOLDER / "config.toml"

MAX_FILE_SIZE = 50_000 * 1024  # 50 MiB

from excalibur_server.src.config import Config

CONFIG = Config()
