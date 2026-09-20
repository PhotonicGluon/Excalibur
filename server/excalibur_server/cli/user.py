from typing import Annotated

import typer

user_app = typer.Typer(no_args_is_help=True, help="User operations.")


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
