import binascii
from base64 import b64decode
from typing import Annotated

import typer

from excalibur_server.src.auth.enums import AuthProtocol

user_app = typer.Typer(no_args_is_help=True, help="User operations.")


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


@user_app.command(name="add")
def add_user(
    username: Annotated[str, typer.Option(help="Username for the API server.", prompt=True)],
    password: Annotated[
        str, typer.Option(help="Password for the API server.", prompt=True, confirmation_prompt=True, hide_input=True)
    ],
    vault_key: Annotated[
        str,
        typer.Option(
            help="Base64 encoded 32-byte vault key.",
            prompt=True,
            confirmation_prompt=True,
            callback=_vault_key_callback,
        ),
    ],
    auth_protocol: Annotated[
        AuthProtocol,
        typer.Option(
            help="Authentication protocol to use.",
            case_sensitive=False,
        ),
    ] = AuthProtocol.OPAQUE_3DH,
):
    """
    Adds a user to the API server.

    Assumes the server has been initialized.

    Only supports the PBKDF2-based key generation algorithm.
    """

    from base64 import b64decode

    import typer
    from Crypto.Random import get_random_bytes

    from excalibur_server.src.config import CONFIG
    from excalibur_server.src.crypto.exef import ExEF
    from excalibur_server.src.crypto.keygen import generate_key
    from excalibur_server.src.users import User, add_user

    # Generate account unlock key (AUK) values
    auk_salt = get_random_bytes(16)
    auk_key = generate_key(password, {"username": username}, auk_salt)

    # Encrypt vault key
    vault_key: bytes = b64decode(vault_key)
    vault_key_enc = ExEF(auk_key, get_random_bytes(12)).encrypt(vault_key)

    if auth_protocol == AuthProtocol.OPAQUE_3DH:
        from excalibur_server.src.auth.opaque import OPAQUE_OPRF_TYPE, SERVER_IDENTITY, OPAQUEServer
        from excalibur_server.src.auth.opaque.operation import OPAQUEClient

        # Perform OPAQUE registration
        password = password.encode("utf-8")
        opaque_client = OPAQUEClient(oprf_type=OPAQUE_OPRF_TYPE)
        opaque_server = OPAQUEServer(oprf_type=OPAQUE_OPRF_TYPE)

        registration_request, blind = opaque_client.create_registration_request(password)
        registration_response = opaque_server.create_registration_response(
            registration_request,
            CONFIG.security.opaque.public_key,
            username.encode("utf-8"),
            CONFIG.security.opaque.oprf_seed,
        )
        registration_record, _ = opaque_client.finalize_registration_request(
            password,
            blind,
            registration_response,
            SERVER_IDENTITY,
            username.encode("utf-8"),
        )

        # Create user
        add_user(
            User(
                username=username,
                auth_protocol=auth_protocol,
                registration_record=registration_record.serialize(),
                keygen_algorithm="pbkdf2",
                auk_salt=auk_salt,
                key_enc=vault_key_enc,
            )
        )

    typer.secho(f"Added '{username}' to the database.", fg="green")


@user_app.command(name="remove")
def remove_user(username: Annotated[str, typer.Option(help="Username for the API server.", prompt=True)]):
    """
    Removes a user from the API server.

    Assumes the server has been initialized.
    """

    from excalibur_server.src.users import remove_user

    try:
        remove_user(username)
    except ValueError as e:
        typer.secho(str(e), fg="red")
        return

    typer.secho(f"Removed '{username}' from the database.", fg="green")


@user_app.command("ack")
def get_account_creation_key():
    """
    Print the account creation key.

    Assumes the server has been initialized.
    """

    from excalibur_server.src.bip39 import to_mnemonic
    from excalibur_server.src.config import CONFIG

    typer.secho(" ".join(to_mnemonic(CONFIG.security.account_creation.public_key.to_bytes())))
