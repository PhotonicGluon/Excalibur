from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from excalibur_server.consts import ROOT_FOLDER
from excalibur_server.src.db.tables import User


def _get_session() -> Session:
    """
    Creates and returns a new SQLAlchemy Session.
    """

    engine = create_engine("sqlite:///" + ROOT_FOLDER.relative_to(ROOT_FOLDER.parent).as_posix() + "/excalibur.db")
    Session = sessionmaker(bind=engine)
    return Session()


def is_user(username: str) -> bool:
    """
    Checks if a user exists in the database.

    :param username: The username to check
    :return: Whether the user exists
    """

    return get_user(username) is not None


def add_user(user: User):
    """
    Adds a user to the database.

    Assumes that the user does not already exist in the database.

    :param user: The user to add
    """

    with _get_session() as session:
        with session.begin():
            session.add(user)


def get_user(username: str) -> User | None:
    """
    Gets a user from the database.

    :param username: The username of the user to get
    :return: The user
    """

    with _get_session() as session:
        with session.begin():
            user = session.get(User, username)
            if user is not None:
                user = user.model_copy()  # So that we can avoid session issues
            return user


def is_vault_key() -> bool:
    """
    TODO: Change
    """

    return get_user("security_details").key_enc is not None


def set_vault_key(key_enc: bytes):
    """
    TODO: Change
    """

    with _get_session() as session:
        with session.begin():
            session.get(User, "security_details").key_enc = key_enc


def get_vault_key() -> bytes | None:
    """
    TODO: Change
    """

    return get_user("security_details").key_enc
