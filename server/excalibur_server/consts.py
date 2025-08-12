# ruff: noqa: E402
import os
from pathlib import Path

ROOT_FOLDER = Path(os.getenv("EXCALIBUR_ROOT_FOLDER", "excalibur-files")).resolve()

CONFIG_TEMPLATE_FILE = Path(__file__).parent / "config.template.toml"
CONFIG_FILE = ROOT_FOLDER / "config.toml"
