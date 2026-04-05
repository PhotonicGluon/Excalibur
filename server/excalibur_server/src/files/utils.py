import mimetypes
import shutil
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


def construct_file_or_directory_old(
    username: str, abs_path: Path, include_exef_size: bool = False
) -> File | Directory | None:
    """
    Constructs a `File` or `Directory` object from an absolute path.

    :param username: the username of the user
    :param abs_path: the absolute path to construct from
    :param include_exef_size: whether to include the additional ExEF size in file sizes
    :return: a `File` or `Directory` object, or `None` if the path points to a file but does not end
        with ".exef"
    """

    vault_path = get_vault_path(username, abs_path)
    if abs_path.is_dir():
        return Directory(name=abs_path.name, fullpath=vault_path)

    if abs_path.suffix != ".exef":
        return None

    size = abs_path.stat().st_size
    if not include_exef_size:
        size -= ExEF.header_size + ExEF.footer_size

    mimetype, _ = mimetypes.guess_type(vault_path.removesuffix(".exef"), strict=True)
    return File(name=abs_path.name, fullpath=vault_path, size=size, mimetype=mimetype)


def construct_file_or_directory(fsitem: FSItem, include_exef_size: bool = False) -> File | Directory:
    """
    Constructs a `File` or `Directory` object from an FSItem.

    :param fsitem: the FSItem to construct from
    :param include_exef_size: whether to include the additional ExEF size in file sizes
    :return: a `File` or `Directory` object
    """

    if fsitem.is_folder:
        return Directory(name=fsitem.name, fullpath=str(get_item_fullpath(fsitem.id)))

    size = fsitem.size
    if not include_exef_size:
        size -= ExEF.header_size + ExEF.footer_size

    return File(name=fsitem.name, fullpath=str(get_item_fullpath(fsitem.id)), size=size, mimetype=fsitem.mimetype)


def listdir_old(username: str, path: Path, include_exef_size: bool = False) -> Directory | None:
    """
    Lists the contents of a directory.

    Will ignore any file that is not an ExEF file.

    :param username: the username of the user
    :param path: the path to list
    :param include_exef_size: whether to include the additional ExEF size in file sizes
    :returns: a `Directory` object with a list of `File` and `Directory` objects, or `None` if the
        path does not exist or is not a directory
    """

    if not path.is_dir():
        return None

    items = []
    for item in path.iterdir():
        item = construct_file_or_directory_old(username, path / item, include_exef_size)
        if item is None:
            continue

        items.append(item)

    return Directory(name=path.name, fullpath=get_vault_path(username, path), items=items)


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

    return Directory(name=folder.name, fullpath=str(get_item_fullpath(folder_id)), items=items)


def rmitem_old(path: Path):
    """
    Removes a file or directory.

    :param path: the path to remove
    """

    if path.is_dir():
        shutil.rmtree(path)
    else:
        path.unlink()


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
