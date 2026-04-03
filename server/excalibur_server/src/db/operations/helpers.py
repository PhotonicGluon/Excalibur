from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from excalibur_server.consts import ROOT_FOLDER
from excalibur_server.src.config import CONFIG


def get_session() -> Session:
    """
    Creates and returns a new SQLAlchemy Session.
    """

    engine = create_engine("duckdb:///" + (ROOT_FOLDER / CONFIG.storage.database.file).as_posix())
    return sessionmaker(bind=engine)()
