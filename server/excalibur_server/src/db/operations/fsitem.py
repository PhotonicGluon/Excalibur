import uuid
from pathlib import Path
from time import time_ns

from excalibur_server.src.db.operations.helpers import get_session
from excalibur_server.src.db.tables import FSItem


def add_item(item: FSItem):
    """
    Adds a filesystem item to the database.

    :param item: the filesystem item to add
    """

    with get_session() as session:
        with session.begin():
            session.add(item)


def get_item(item_id: str) -> FSItem | None:
    """
    Gets a filesystem item from the database.

    :param item_id: the ID of the filesystem item to get
    :return: the filesystem item, or None if the item does not exist
    """

    with get_session() as session:
        with session.begin():
            item = session.get(FSItem, item_id)
            if item is not None:
                item = item.model_copy()  # So that we can avoid session issues
            return item


def get_item_by_path(root_id: uuid.UUID, path: str) -> FSItem | None:
    """
    Gets a filesystem item from the database by its path.

    Can specify the root directory with ".".

    :param path: the path of the filesystem item to get
    :return: the filesystem item, or None if the item does not exist
    :raises ValueError: if the path is empty or root
    """

    if path == ".":
        path = ""

    parts = [p for p in path.split("/") if p]
    current_parent_id = root_id
    current_item = get_item(root_id)

    with get_session() as session:
        with session.begin():
            for part in parts:
                current_item = session.query(FSItem).filter_by(name=part, parent_id=current_parent_id).first()

                if not current_item:
                    return None
                current_parent_id = current_item.id

            return current_item.model_copy()


def get_items_in_folder(folder_id: str) -> list[FSItem]:
    """
    Lists the contents of a directory.

    :param folder_id: the ID of the directory
    :return: a list of filesystem items
    """

    with get_session() as session:
        with session.begin():
            items = session.query(FSItem).filter_by(parent_id=folder_id).all()
            return [item.model_copy() for item in items]


def get_items_in_root(root_id: uuid.UUID) -> list[FSItem]:
    """
    Gets all items in a user's root directory.

    :param root_id: the ID of the root directory
    :return: a list of filesystem items
    """

    with get_session() as session:
        with session.begin():
            items = session.query(FSItem).filter_by(root_id=root_id).all()
            return [item.model_copy() for item in items if item.id != root_id]  # Exclude the root directory itself


def get_item_fullpath(item_id: uuid.UUID) -> Path:
    """
    Gets the full path of a filesystem item, relative to the user's root directory.

    :param item_id: the ID of the filesystem item
    :return: the full path of the filesystem item
    """

    item = get_item(item_id)
    if item.parent_id is None:
        return Path("")

    fullpath = Path(item.fullpath)
    parent_item = get_item(item.parent_id)
    if parent_item.last_modified > item.last_modified:
        # The parent was modified more recently than this item, so we need to update the fullpath
        fullpath = Path(parent_item.fullpath) / item.name
        with get_session() as session:
            with session.begin():
                current_item = session.query(FSItem).filter_by(id=item_id).first()
                current_item.fullpath = (Path(parent_item.fullpath) / item.name).as_posix()
                current_item.last_modified = time_ns()
                session.add(current_item)

    return fullpath


def is_dir_empty(folder_id: uuid.UUID) -> bool:
    """
    Checks if a directory is empty.

    :param folder_id: the ID of the directory
    :return: True if the directory is empty, False otherwise
    """

    with get_session() as session:
        with session.begin():
            return session.query(FSItem).filter_by(parent_id=folder_id).count() == 0


def remove_item(item_id: str):
    """
    Removes a filesystem item from the database.

    :param item_id: the ID of the filesystem item to remove
    :raises ValueError: if the filesystem item does not exist
    """

    with get_session() as session:
        with session.begin():
            item = session.get(FSItem, item_id)
            if item is None:
                raise ValueError(f"Filesystem item '{item_id}' does not exist.")
            session.delete(item)
