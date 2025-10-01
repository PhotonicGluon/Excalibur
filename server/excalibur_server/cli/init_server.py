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

    from Crypto.Random.random import choice as secure_random_choice

    from excalibur_server.consts import CONFIG_TEMPLATE_FILE, ROOT_FOLDER

    # Handle resetting
    if reset:
        typer.secho("Resetting server...", fg="yellow")
        from excalibur_server.cli.reset_server import _reset_server

        _reset_server()
        typer.secho("Server reset.", fg="yellow")

    # Make the root folder
    os.makedirs(ROOT_FOLDER, exist_ok=True)

    # Handle config file
    config_path = ROOT_FOLDER / "config.toml"
    if not config_path.exists():
        typer.secho("Creating config file...", nl=False, fg="yellow")

        # Copy the config file
        shutil.copyfile(CONFIG_TEMPLATE_FILE, config_path)

        # Replace the default account creation key
        # TODO: Is this character space secure enough?
        KEY_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*(-_=+)"
        account_creation_key = "".join(secure_random_choice(KEY_CHARS) for _ in range(32))

        with config_path.open("r+") as f:
            contents = f.read()
            contents = contents.replace("Account Creation Key Goes Here!!", account_creation_key)
            f.seek(0)
            f.write(contents)
            f.truncate()

        typer.secho("done.", fg="green")
    else:
        typer.secho("Config file already exists; not changing", fg="yellow")

    # Obtain config
    from excalibur_server.src.config import CONFIG

    # Make the folders
    os.makedirs(CONFIG.logging.directory, exist_ok=True)
    os.makedirs(CONFIG.storage.vault_folder, exist_ok=True)

    # Initialize the database
    if with_db:
        upgrade(revision="head")  # Upgrade the database to the latest revision

    typer.secho("Server initialized.", fg="green")
