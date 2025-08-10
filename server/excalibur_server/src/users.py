from excalibur_server.src.db.operations import add_user as _add_user
from excalibur_server.src.db.operations import get_user as _get_user
from excalibur_server.src.db.operations import set_vault_key as _set_vault_key
from excalibur_server.src.db.tables import User


def is_user(username: str) -> bool:
    """
    Checks if a user exists.

    :param username: The username to check
    :return: Whether the user exists
    """

    return _get_user(username) is not None


add_user = _add_user
get_user = _get_user


def is_vault_key() -> bool:
    """
    TODO: Change
    """

    return _get_user("security_details").key_enc is not None


set_vault_key = _set_vault_key


def get_vault_key() -> bytes | None:
    """
    TODO: Change
    """

    return _get_user("security_details").key_enc


__all__ = ["is_user", "add_user", "get_user", "is_vault_key", "set_vault_key", "get_vault_key", "User"]
