import shutil

from excalibur_server.src.config import CONFIG
from excalibur_server.src.db.operations import add_item, get_item
from excalibur_server.src.db.operations import add_user as _add_user
from excalibur_server.src.db.operations import get_user as _get_user
from excalibur_server.src.db.operations import remove_user as _remove_user
from excalibur_server.src.db.tables import FSItem, User
from excalibur_server.src.files.utils import rmitem


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
    root_item = FSItem(name=user.username, is_folder=True, parent_id=None)
    user.fsitem_id = root_item.id
    add_item(root_item)

    (CONFIG.storage.vault_folder / user.username).mkdir(parents=True, exist_ok=True)

    # Add user to database
    _add_user(user)


def remove_user(username: str):
    """
    Removes a user from the database.

    :param username: The username of the user to remove
    :raises ValueError: If the user does not exist
    """

    # Get user
    user = _get_user(username)
    if user is None:
        raise ValueError(f"User {username} does not exist")

    # Delete user's root folder
    root_item = get_item(user.fsitem_id)
    if root_item:
        rmitem(root_item)

    shutil.rmtree(CONFIG.storage.vault_folder / username)

    # Remove user from database
    _remove_user(username)


get_user = _get_user

__all__ = ["is_user", "add_user", "get_user", "remove_user", "User"]
