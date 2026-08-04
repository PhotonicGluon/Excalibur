from excalibur_server.src.db.operations.helpers import get_session
from excalibur_server.src.db.tables import User


def add_user(user: User):
    """
    Adds a user to the database.

    Assumes that the user does not already exist in the database.

    :param user: the user to add
    """

    with get_session() as session, session.begin():
        session.add(user)


def get_user(username: str) -> User | None:
    """
    Gets a user from the database.

    :param username: the username of the user to get
    :return: the user, or None if the user does not exist
    """

    with get_session() as session:
        user = session.query(User).filter(User.username == username).first()
        if user is not None:
            user = user.model_copy()  # So that we can avoid session issues
        return user


def get_user_from_id(user_id: str) -> User | None:
    """
    Gets a user from the database.

    :param user_id: the user ID
    :return: the user, or None if the user does not exist
    """

    with get_session() as session:
        user = session.get(User, user_id)
        if user is not None:
            user = user.model_copy()  # So that we can avoid session issues
        return user


def remove_user_from_id(user_id: str):
    """
    Removes a user from the database.

    :param user_id: the user ID of the user to remove
    :raises ValueError: if the user does not exist
    """

    with get_session() as session, session.begin():
        user = session.get(User, user_id)
        if user is None:
            raise ValueError(f"User '{user_id}' does not exist.")
        session.delete(user)
