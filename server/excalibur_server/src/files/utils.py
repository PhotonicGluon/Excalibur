import uuid
from pathlib import Path

from excalibur_server.src.config import CONFIG
from excalibur_server.src.db.operations import get_item, get_item_fullpath, get_items_in_folder, remove_item
from excalibur_server.src.db.tables import FSItem
from excalibur_server.src.exef import ExEF
from excalibur_server.src.files.structures import Directory, File


def get_vault_path(username: str, path: Path):
    """
    Resolves the given path and returns its relative path to the vault folder as a POSIX-style path
    string.

    :param username: the username of the user
    :param path: the path to resolve
    :return: POSIX-style path string relative to the vault folder
    """

    return path.resolve().relative_to(CONFIG.storage.vault_folder / username).as_posix()


def construct_file_or_directory(fsitem: FSItem, include_exef_size: bool = False) -> File | Directory:
    """
    Constructs a `File` or `Directory` object from an FSItem.

    :param fsitem: the FSItem to construct from
    :param include_exef_size: whether to include the additional ExEF size in file sizes
    :return: a `File` or `Directory` object
    """

    if fsitem.is_folder:
        return Directory(name=fsitem.name, fullpath=get_item_fullpath(fsitem.id).as_posix())

    size = fsitem.size
    if not include_exef_size:
        size -= ExEF.header_size + ExEF.footer_size

    return File(name=fsitem.name, fullpath=get_item_fullpath(fsitem.id).as_posix(), size=size, mimetype=fsitem.mimetype)


def listdir(folder_id: uuid.UUID) -> Directory | None:
    """
    Lists the contents of a directory.

    :param folder_id: the ID of the folder to list
    :return: a `Directory` object with a list of `File` and `Directory` objects, or `None` if the
        folder does not exist or is not a directory
    """

    folder = get_item(folder_id)
    if folder is None or not folder.is_folder:
        return None

    fsitems = get_items_in_folder(folder_id)

    items = []
    for fsitem in fsitems:
        item = construct_file_or_directory(fsitem)
        if item is None:
            continue

        items.append(item)

    return Directory(name=folder.name, fullpath=get_item_fullpath(folder_id).as_posix(), items=items)


def rmitem(item: FSItem):
    """
    Removes a file or directory.

    :param item: the item to remove
    """

    if not item.is_folder:
        # Remove the item from the database and the file system
        path = CONFIG.storage.vault_folder / get_item(item.root_id).name / f"{item.id}.exef"
        path.unlink()
        remove_item(item.id)
        return

    # For folder, first need to remove its children before removing itself
    children = get_items_in_folder(item.id)
    for child in children:
        rmitem(child)

    remove_item(item.id)
