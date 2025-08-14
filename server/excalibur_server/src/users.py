from excalibur_server.src.config import CONFIG
from excalibur_server.src.db.operations import add_user as _add_user
from excalibur_server.src.db.operations import get_user as _get_user
from excalibur_server.src.db.tables import User


def is_user(username: str) -> bool:
    """
    Checks if a user exists.

    :param username: The username to check
    :return: Whether the user exists
    """

    return _get_user(username) is not None


def add_user(user: User):
    """
    Adds a user to the database.

    Assumes that the user does not already exist in the database.

    :param user: The user to add
    """

    # Create new user directory
    (CONFIG.server.vault_folder / user.username).mkdir(parents=True, exist_ok=True)

    # Add user to database
    _add_user(user)


get_user = _get_user


__all__ = ["is_user", "add_user", "get_user", "User"]
