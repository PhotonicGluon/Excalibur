from uuid import UUID

from sqlalchemy import func, not_
from sqlalchemy.orm import Session
from sqlmodel import select

from excalibur_server.src.db.operations.helpers import get_session
from excalibur_server.src.db.tables import FSItem

# Reject if node hash is not provided OR if it's a file lacking a content MAC
UNVERIFIED_CONDITION = (FSItem.node_hash.is_(None)) | (not_(FSItem.is_folder) & FSItem.content_mac.is_(None))
"Condition that selects the `FSItem`s that do not have valid Merkle data"


def add_item(item: FSItem):
    """
    Adds a filesystem item to the database.

    :param item: the filesystem item to add
    """

    with get_session() as session, session.begin():
        session.add(item)


def get_item(item_id: UUID) -> FSItem | None:
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


def get_items_by_name_tags(parent_id: UUID, name_tags: list[bytes]) -> dict[bytes, FSItem]:
    """
    Gets the children of a folder that have any of the given name tags.

    :param parent_id: the ID of the folder
    :param name_tags: the name tags to look for
    :return: mapping from each name tag that was found to its item
    """

    if not name_tags:
        return {}

    with get_session() as session:
        items = session.execute(
            select(FSItem).where(FSItem.parent_id == parent_id, FSItem.name_tag.in_(name_tags))
        ).scalars()
        return {bytes(item.name_tag): item.model_copy() for item in items}


def get_item_by_name_tag(parent_id: UUID, name_tag: bytes) -> FSItem | None:
    """
    Gets the child of a folder that has a given name tag.

    :param parent_id: the ID of the folder
    :param name_tag: the name tag to look for
    :return: the item, or None if the folder has no child with that name tag
    """

    return get_items_by_name_tags(parent_id, [name_tag]).get(name_tag)


def get_items_in_folder(folder_id: UUID) -> list[FSItem]:
    """
    Lists the contents of a directory.

    :param folder_id: the ID of the directory
    :return: a list of filesystem items
    """

    with get_session() as session:
        items = session.execute(select(FSItem).where(FSItem.parent_id == folder_id)).scalars().all()
        return [item.model_copy() for item in items]


def get_items_with_root(root_id: UUID) -> list[FSItem]:
    """
    Gets all items with a specified root directory.

    :param root_id: the ID of the root directory
    :return: a list of filesystem items
    """

    with get_session() as session:
        items = session.execute(select(FSItem).where(FSItem.root_id == root_id)).scalars().all()
        return [item.model_copy() for item in items if item.id != root_id]  # Exclude the root directory itself


def get_pending_name_items(root_id: UUID, *, limit: int | None = None, offset: int = 0) -> list[FSItem]:
    """
    Gets the items that still have a plaintext name.

    The results are ordered by ID so that paging is stable.

    :param root_id: the ID of the root
    :param limit: the maximum number of items to return, or None for no limit
    :param offset: the number of items to skip
    :return: the list of pending items
    """

    statement = (
        select(FSItem)
        .where(FSItem.root_id == root_id, FSItem.parent_id.is_not(None), FSItem.name.is_not(None))
        .order_by(FSItem.id)
        .offset(offset)
    )
    if limit is not None:
        statement = statement.limit(limit)

    with get_session() as session:
        return [item.model_copy() for item in session.execute(statement).scalars().all()]


def has_pending_names(root_id: UUID) -> bool:
    """
    Checks if a root has items that still have a plaintext name.

    :param root_id: the ID of the root
    :return: True if the root has pending items, False otherwise
    """

    with get_session() as session:
        return (
            session.execute(
                select(FSItem.id)
                .where(FSItem.root_id == root_id, FSItem.parent_id.is_not(None), FSItem.name.is_not(None))
                .limit(1)
            ).first()
            is not None
        )


def get_item_ancestors(item_id: UUID) -> list[FSItem]:
    """
    Gets all ancestors of a filesystem item.

    :param item_id: the ID of the filesystem item
    :return: a list of filesystem items
    """

    curr_id = item_id
    seen_ids = set()
    ancestors = []
    with get_session() as session:
        while curr_id is not None:
            if curr_id in seen_ids:
                raise ValueError("Circular reference detected in filesystem item hierarchy")
            seen_ids.add(curr_id)

            item = session.execute(select(FSItem).where(FSItem.id == curr_id)).scalars().first()
            if item is None:
                break
            ancestors.append(item.model_copy())
            curr_id = item.parent_id

    return ancestors


def is_dir_empty(folder_id: UUID) -> bool:
    """
    Checks if a directory is empty.

    :param folder_id: the ID of the directory
    :return: True if the directory is empty, False otherwise
    """

    with get_session() as session:
        return session.execute(select(FSItem.id).where(FSItem.parent_id == folder_id).limit(1)).first() is None


def is_unverified(item_id: UUID) -> bool:
    """
    Checks if a filesystem item is unverified.

    :param item_id: the ID of the filesystem item
    :return: True if the filesystem item is unverified, False otherwise
    """

    with get_session() as session:
        return (
            session.execute(select(FSItem.id).where(FSItem.id == item_id, UNVERIFIED_CONDITION).limit(1)).first()
            is not None
        )


def get_unverified(root_id: UUID, session: Session | None = None) -> set[UUID]:
    """
    Gets the IDs of the unverified files.

    :param root_id: the ID of the root
    :param session: an existing session to use, or None to open a new one. Callers that are in the
        middle of a transaction must pass their own session, so that their uncommitted writes are
        taken into account
    :return: the set of unverified item IDs
    """

    statement = select(FSItem.id).where(FSItem.root_id == root_id, UNVERIFIED_CONDITION)

    if session is not None:
        return set(session.execute(statement).scalars().all())

    with get_session() as new_session:
        return set(new_session.execute(statement).scalars().all())


def get_unverified_items(root_id: UUID, *, limit: int | None = None, offset: int = 0) -> list[FSItem]:
    """
    Gets the unverified items themselves, ordered by ID so that paging is stable.

    :param root_id: the ID of the root
    :param limit: the maximum number of items to return, or None for no limit
    :param offset: the number of items to skip
    :return: the list of unverified items
    """

    statement = select(FSItem).where(FSItem.root_id == root_id, UNVERIFIED_CONDITION).order_by(FSItem.id).offset(offset)
    if limit is not None:
        statement = statement.limit(limit)

    with get_session() as session:
        return [item.model_copy() for item in session.execute(statement).scalars().all()]


def get_missing_content_macs(root_id: UUID) -> set[UUID]:
    """
    Gets the IDs of the files that are missing a content MAC.

    Folders never have a content MAC, so they are never returned.

    :param root_id: the ID of the root
    :return: the set of item IDs that need a content MAC
    """

    with get_session() as session:
        return set(
            session.execute(
                select(FSItem.id).where(
                    FSItem.root_id == root_id,
                    not_(FSItem.is_folder),
                    FSItem.content_mac.is_(None),
                )
            )
            .scalars()
            .all()
        )


def has_unverified(root_id: UUID) -> bool:
    """
    Checks if a root has unverified items.

    :param root_id: the ID of the root
    :return: True if the root has unverified items, False otherwise
    """

    return len(get_unverified(root_id)) > 0


def count_items_with_root(root_id: UUID, session: Session | None = None) -> int:
    """
    Counts the number of items in a root, including the root itself.

    :param root_id: the ID of the root
    :param session: an existing session to use, or None to open a new one. Callers that are in the
        middle of a transaction must pass their own session, so that their uncommitted writes are
        taken into account
    :return: the number of items in the root
    """

    statement = select(func.count()).select_from(FSItem).where(FSItem.root_id == root_id)

    if session is not None:
        return session.execute(statement).scalar_one()

    with get_session() as new_session:
        return new_session.execute(statement).scalar_one()


def mark_dirty(item_id: UUID):
    """
    Marks a filesystem item, along with all of its ancestors, as dirty.

    A dirty item must be re-hashed by the client before the next mutation can be committed.

    Does nothing if the item does not exist.

    :param item_id: the ID of the filesystem item that was modified
    :raises ValueError: if a circular reference is detected in the filesystem item hierarchy
    """

    with get_session() as session, session.begin():
        curr_id = item_id
        seen_ids = set()
        while curr_id is not None:
            if curr_id in seen_ids:
                raise ValueError("Circular reference detected in filesystem item hierarchy")
            seen_ids.add(curr_id)

            item = session.get(FSItem, curr_id)
            if item is None:
                break

            item.node_hash = None
            item.version += 1
            session.add(item)

            curr_id = item.parent_id


def remove_item(item_id: UUID):
    """
    Removes a filesystem item from the database.

    :param item_id: the ID of the filesystem item to remove
    :raises ValueError: if the filesystem item does not exist
    """

    with get_session() as session, session.begin():
        item = session.get(FSItem, item_id)
        if item is None:
            raise ValueError(f"Filesystem item '{item_id}' does not exist.")
        session.delete(item)
