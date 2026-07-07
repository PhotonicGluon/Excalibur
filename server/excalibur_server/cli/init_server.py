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

    from excalibur_server.cli.config import generate_keys
    from excalibur_server.consts import CONFIG_TEMPLATE_FILE, ROOT_FOLDER
    from excalibur_server.src.auth.opaque import OPAQUE_OPRF_TYPE, OPAQUEServer
    from excalibur_server.src.bip39.operation import to_mnemonic

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
    does_config_exist = config_path.exists()
    if not does_config_exist:
        typer.secho("Creating config file...", nl=False, fg="yellow")

        # Copy the config file
        shutil.copyfile(CONFIG_TEMPLATE_FILE, config_path)

        # Replace the default parameters
        oprf_seed = OPAQUEServer(oprf_type=OPAQUE_OPRF_TYPE).generate_seed()

        with config_path.open("r+") as f:
            contents = f.read()
            contents = contents.replace("OPRF seed goes here!", oprf_seed.hex())
            f.seek(0)
            f.write(contents)
            f.truncate()

        generate_keys(validate_config=False, silent=True)

        # Report completion
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

    if not does_config_exist:
        typer.secho("Account Creation Key Mnemonic:", fg="cyan")
        typer.secho("    " + " ".join(to_mnemonic(CONFIG.security.account_creation.public_key.to_bytes())), fg="cyan")
