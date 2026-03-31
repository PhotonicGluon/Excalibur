
from excalibur_server.src.db.operations import add_user as _add_user
from excalibur_server.src.db.operations import get_user as _get_user
from excalibur_server.src.db.operations import remove_user as _remove_user
from excalibur_server.src.db.operations.fsitem import add_item
from excalibur_server.src.db.tables import FSItem, User


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

    # Create new root folder for the user
    root = FSItem(name=user.username, is_folder=True, parent_id=None)
    user.fsitem_id = root.id
    add_item(root)

    # Add user to database
    _add_user(user)


def remove_user(username: str):
    """
    Removes a user from the database.

    :param username: The username of the user to remove
    :raises ValueError: If the user does not exist
    """

    # Remove user from database
    _remove_user(username)

    # TODO: Remove user's root folder and all its contents


get_user = _get_user

__all__ = ["is_user", "add_user", "get_user", "remove_user", "User"]
