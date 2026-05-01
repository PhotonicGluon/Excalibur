from excalibur_server.src.db.operations.helpers import get_session
from excalibur_server.src.db.tables import User


def add_user(user: User):
    """
    Adds a user to the database.

    Assumes that the user does not already exist in the database.

    :param user: the user to add
    """

    with get_session() as session:
        with session.begin():
            session.add(user)


def get_user(username: str) -> User | None:
    """
    Gets a user from the database.

    :param username: the username of the user to get
    :return: the user, or None if the user does not exist
    """

    with get_session() as session:
        user = session.get(User, username)
        if user is not None:
            user = user.model_copy()  # So that we can avoid session issues
        return user


def remove_user(username: str):
    """
    Removes a user from the database.

    :param username: the username of the user to remove
    :raises ValueError: if the user does not exist
    """

    with get_session() as session:
        with session.begin():
            user = session.get(User, username)
            if user is None:
                raise ValueError(f"User '{username}' does not exist.")
            session.delete(user)
