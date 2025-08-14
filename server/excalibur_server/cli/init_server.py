from typing import Annotated

import typer

from excalibur_server.cli import app
from excalibur_server.cli.db import upgrade


@app.command(name="init")
def init_server(
    reset: Annotated[bool, typer.Option("--reset", "-r", help="Reset the server.")] = False,
    with_db: Annotated[bool, typer.Option("--with-db", "-d", help="Initialize the database.")] = True,
):
    """
    Initializes the API server.
    """

    import os
    import shutil

    from excalibur_server.consts import CONFIG_TEMPLATE_FILE, ROOT_FOLDER

    # Handle resetting
    if reset:
        from excalibur_server.cli.reset_server import _reset_server

        _reset_server()

    # Make the root folder
    os.makedirs(ROOT_FOLDER, exist_ok=True)

    # Copy the config file
    config_path = ROOT_FOLDER / "config.toml"
    if not config_path.exists():
        shutil.copyfile(CONFIG_TEMPLATE_FILE, config_path)

    # Obtain config
    from excalibur_server.src.config import CONFIG

    # Make the folders
    os.makedirs(CONFIG.server.vault_folder, exist_ok=True)

    # Initialize the database
    if with_db:
        upgrade(revision="head")  # Upgrade the database to the latest revision

    typer.secho("Server initialized.", fg="green")
