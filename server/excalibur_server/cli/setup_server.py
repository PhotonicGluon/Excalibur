import binascii
from base64 import b64decode
from typing import Annotated

import typer

from excalibur_server.cli import app


def _vault_key_callback(value: str) -> str:
    if value.isspace():
        raise typer.BadParameter("Vault key cannot be empty.")
    try:
        decoded = b64decode(value)
    except binascii.Error:
        raise typer.BadParameter("Vault key must be a valid base64 string.")

    if len(decoded) != 32:
        raise typer.BadParameter("Vault key must be 32 bytes.")
    return value


# TODO: Change name
@app.command(name="setup")
def setup_server(
    username: Annotated[
        str, typer.Option(help="Username for the API server.", prompt=True)
    ] = "security_details",  # TODO: Remove default
    password: Annotated[
        str, typer.Option(help="Password for the API server.", prompt=True, confirmation_prompt=True)
    ] = ...,
    vault_key: Annotated[
        str,
        typer.Option(
            help="Base64 encoded 32-byte vault key.",
            prompt=True,
            confirmation_prompt=True,
            callback=_vault_key_callback,
        ),
    ] = ...,
    reset: Annotated[bool, typer.Option("--reset", "-r", help="Reset the server.")] = False,
):
    """
    Sets up the API server.

    Adds the required security details and vault key to the server.
    """

    import os
    from base64 import b64decode

    import typer
    from Crypto.Random import get_random_bytes
    from Crypto.Util.number import bytes_to_long, long_to_bytes

    from excalibur_server.cli.reset_server import _reset_server
    from excalibur_server.consts import FILES_FOLDER, ROOT_FOLDER
    from excalibur_server.src.exef.exef import ExEF
    from excalibur_server.src.security.consts import SRP_HANDLER
    from excalibur_server.src.security.keygen import generate_key
    from excalibur_server.src.users import add_user, User

    if reset:
        _reset_server()

    # Make the folders
    os.makedirs(ROOT_FOLDER, exist_ok=True)
    os.makedirs(FILES_FOLDER, exist_ok=True)

    # Generate salts and keys
    auk_salt = get_random_bytes(16)
    auk_key = generate_key(password, auk_salt)

    srp_salt = get_random_bytes(16)
    srp_key = generate_key(password, srp_salt)

    # Generate SRP verifier
    verifier = long_to_bytes(SRP_HANDLER.compute_verifier(bytes_to_long(srp_key)))

    # Encrypt vault key
    vault_key: bytes = b64decode(vault_key)
    vault_key_enc = ExEF(auk_key, get_random_bytes(12)).encrypt(vault_key)

    # Create user
    add_user(
        User(
            username=username,
            auk_key=auk_key,
            srp_key=srp_key,
            verifier=verifier,
            vault_key_enc=vault_key_enc,
        )
    )

    typer.secho("Server initialized.", fg="green")
