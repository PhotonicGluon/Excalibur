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


@app.command(name="add-user")
def add_user(
    username: Annotated[str, typer.Option(help="Username for the API server.", prompt=True)],
    password: Annotated[str, typer.Option(help="Password for the API server.", prompt=True, confirmation_prompt=True)],
    vault_key: Annotated[
        str,
        typer.Option(
            help="Base64 encoded 32-byte vault key.",
            prompt=True,
            confirmation_prompt=True,
            callback=_vault_key_callback,
        ),
    ],
):
    """
    Adds a user to the API server.

    Assumes the server has been initialized.
    """

    from base64 import b64decode

    import typer
    from Crypto.Random import get_random_bytes
    from Crypto.Util.number import bytes_to_long, long_to_bytes

    from excalibur_server.src.exef.exef import ExEF
    from excalibur_server.src.security.consts import SRP_HANDLER
    from excalibur_server.src.security.keygen import generate_key
    from excalibur_server.src.users import add_user, User

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
            auk_salt=auk_salt,
            srp_salt=srp_salt,
            verifier=verifier,
            key_enc=vault_key_enc,
        )
    )

    typer.secho(f"Added '{username}' to the database.", fg="green")
