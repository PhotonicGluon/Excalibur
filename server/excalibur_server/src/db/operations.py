from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from excalibur_server.consts import ROOT_FOLDER
from excalibur_server.src.config import CONFIG
from excalibur_server.src.db.tables import User


def _get_session() -> Session:
    """
    Creates and returns a new SQLAlchemy Session.
    """

    engine = create_engine("sqlite:///" + (ROOT_FOLDER / CONFIG.server.database_file).as_posix())
    Session = sessionmaker(bind=engine)
    return Session()


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
