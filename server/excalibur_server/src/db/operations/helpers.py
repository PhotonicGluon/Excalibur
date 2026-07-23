import threading
from collections.abc import Iterator
from contextlib import contextmanager

import duckdb
from duckdb_engine import ConnectionWrapper
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from excalibur_server.consts import ROOT_FOLDER
from excalibur_server.src.config import CONFIG

# Process-wide shared database resources, keyed by database path
_lock = threading.Lock()
_connections: dict[str, duckdb.DuckDBPyConnection] = {}
_engines: dict[str, Engine] = {}


def get_engine(db_path: str) -> Engine:
    """
    Returns a process-wide singleton SQLAlchemy engine for the given database path.

    :param db_path: the path to the database file
    :returns: a SQLAlchemy engine for the given database path
    """

    with _lock:
        engine = _engines.get(db_path)
        if engine is None:
            connection = duckdb.connect(db_path)
            _connections[db_path] = connection
            engine = create_engine("duckdb:///", creator=lambda: ConnectionWrapper(connection.cursor()))
            _engines[db_path] = engine

        return engine


@contextmanager
def get_session() -> Iterator[Session]:
    """
    Creates and yields a new SQLAlchemy Session bound to the shared engine for the default database.
    """

    engine = get_engine((ROOT_FOLDER / CONFIG.storage.database.file).as_posix())
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def close_all_engines() -> None:
    """
    Disposes every shared engine and closes the underlying DuckDB connection(s), releasing DuckDB's
    file lock.
    """

    with _lock:
        for engine in _engines.values():
            engine.dispose()
        _engines.clear()
        for connection in _connections.values():
            connection.close()
        _connections.clear()
