import uuid

from excalibur_server.src.db.operations.helpers import _get_session
from excalibur_server.src.db.tables import FSItem


def add_item(item: FSItem):
    """
    Adds a filesystem item to the database.

    :param item: the filesystem item to add
    """

    with _get_session() as session:
        with session.begin():
            session.add(item)


def get_item(item_id: str) -> FSItem | None:
    """
    Gets a filesystem item from the database.

    :param item_id: the ID of the filesystem item to get
    :return: the filesystem item, or None if the item does not exist
    """

    with _get_session() as session:
        with session.begin():
            item = session.get(FSItem, item_id)
            if item is not None:
                item = item.model_copy()  # So that we can avoid session issues
            return item


def get_item_by_path(root_id: uuid.UUID, path: str) -> FSItem | None:
    """
    Gets a filesystem item from the database by its path.

    :param path: the path of the filesystem item to get
    :return: the filesystem item, or None if the item does not exist
    :raises ValueError: if the path is empty or root
    """

    parts = [p for p in path.split("/") if p]
    current_parent_id = root_id
    current_item = get_item(root_id)

    with _get_session() as session:
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

    with _get_session() as session:
        with session.begin():
            items = session.query(FSItem).filter_by(parent_id=folder_id).all()
            return [item.model_copy() for item in items]


def get_item_fullpath(item_id: uuid.UUID) -> str:
    """
    Gets the full path of a filesystem item, relative to the user's root directory.

    :param item_id: the ID of the filesystem item
    :return: the full path of the filesystem item
    """

    item = get_item(item_id)
    if item.parent_id is None:
        return ""

    parent_fullpath = get_item_fullpath(item.parent_id)
    if parent_fullpath == "":
        return item.name
    return parent_fullpath + "/" + item.name


def remove_item(item_id: str):
    """
    Removes a filesystem item from the database.

    :param item_id: the ID of the filesystem item to remove
    :raises ValueError: if the filesystem item does not exist
    """

    with _get_session() as session:
        with session.begin():
            item = session.get(FSItem, item_id)
            if item is None:
                raise ValueError(f"Filesystem item '{item_id}' does not exist.")
            session.delete(item)
