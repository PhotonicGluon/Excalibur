from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from excalibur_server.consts import ROOT_FOLDER
from excalibur_server.src.config import CONFIG


@contextmanager
def get_session() -> Iterator[Session]:
    """
    Creates and yields a new SQLAlchemy Session.
    """

    engine = create_engine("duckdb:///" + (ROOT_FOLDER / CONFIG.storage.database.file).as_posix())
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()
