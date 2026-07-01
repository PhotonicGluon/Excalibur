import uuid
from pathlib import PurePosixPath

from sqlalchemy.orm import aliased
from sqlmodel import select

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

    path = PurePosixPath(path).as_posix()
    if path == ".":
        path = ""

    parts = [p for p in path.split("/") if p]
    if not parts:
        return get_item(root_id)

    num_parts = len(parts)
    with get_session() as session:
        aliases = [aliased(FSItem, name=f"part_{i}") for i in range(num_parts)]

        stmt = (
            select(aliases[-1])
            .select_from(aliases[0])
            .where(aliases[0].parent_id == root_id, aliases[0].name == parts[0])  # First item must be child of the root
        )
        for i in range(1, num_parts):
            stmt = stmt.join(aliases[i], aliases[i].parent_id == aliases[i - 1].id).where(aliases[i].name == parts[i])

        stmt = stmt.where(aliases[-1].root_id == root_id)  # Remove results where the target is not in the correct root

        result = session.execute(stmt).scalar()
        return result.model_copy() if result else None


def get_items_in_folder(folder_id: str) -> list[FSItem]:
    """
    Lists the contents of a directory.

    :param folder_id: the ID of the directory
    :return: a list of filesystem items
    """

    with get_session() as session:
        items = session.execute(select(FSItem).where(FSItem.parent_id == folder_id)).scalars().all()
        return [item.model_copy() for item in items]


def get_items_in_root(root_id: uuid.UUID) -> list[FSItem]:
    """
    Gets all items in a user's root directory.

    :param root_id: the ID of the root directory
    :return: a list of filesystem items
    """

    with get_session() as session:
        items = session.execute(select(FSItem).where(FSItem.root_id == root_id)).scalars().all()
        return [item.model_copy() for item in items if item.id != root_id]  # Exclude the root directory itself


def get_item_fullpath(item_id: uuid.UUID) -> PurePosixPath:
    """
    Gets the full path of a filesystem item, relative to the user's root directory.

    :param item_id: the ID of the filesystem item
    :return: a PurePosixPath object representing the full path of the filesystem item
    """

    # Base case: Select the target item
    base_query = (
        select(FSItem.id, FSItem.parent_id, FSItem.name)
        .where(FSItem.id == item_id)
        .where(FSItem.parent_id.is_not(None))  # Root folder should not be included in path
        .cte(name="fullpath_cte", recursive=True)
    )

    # Recursive case: Join parents to the current item
    parent_alias = aliased(FSItem)
    recursive_query = (
        select(parent_alias.id, parent_alias.parent_id, parent_alias.name)
        .join(base_query, base_query.c.parent_id == parent_alias.id)
        .where(parent_alias.parent_id.is_not(None))  # Stop when we reach the root folder
    )

    # Execute combined CTE query to get all parts of the path
    fullpath_cte = base_query.union_all(recursive_query)
    with get_session() as session:
        parts = session.execute(select(fullpath_cte.c.name)).scalars().all()

    # Reverse and join them (since results are child -> root)
    fullpath = PurePosixPath("")
    for part in reversed(parts):
        fullpath /= part
    return fullpath


def is_dir_empty(folder_id: uuid.UUID) -> bool:
    """
    Checks if a directory is empty.

    :param folder_id: the ID of the directory
    :return: True if the directory is empty, False otherwise
    """

    with get_session() as session:
        return session.execute(select(FSItem.id).where(FSItem.parent_id == folder_id).limit(1)).first() is None


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
