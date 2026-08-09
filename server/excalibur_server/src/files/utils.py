from uuid import UUID

from excalibur_server.src.config import CONFIG
from excalibur_server.src.db.operations import get_item, get_item_fullpath, get_items_in_folder, remove_item
from excalibur_server.src.db.tables import FSItem
from excalibur_server.src.files.structures import Directory, File


def listdir(folder_id: UUID) -> Directory | None:
    """
    Lists the contents of a directory.

    :param folder_id: the ID of the folder to list
    :return: a `Directory` object with a list of `File` and `Directory` objects, or `None` if the
        folder does not exist or is not a directory
    """

    folder = get_item(folder_id)
    if folder is None or not folder.is_folder:
        return None

    parent_dir_path = get_item_fullpath(folder_id)
    fsitems = get_items_in_folder(folder_id)

    items = []
    for fsitem in fsitems:
        if fsitem.is_folder:
            items.append(Directory.from_fsitem(fsitem, parent_dir_path=parent_dir_path))
        else:
            items.append(File.from_fsitem(fsitem, parent_dir_path=parent_dir_path))

    return Directory(
        id=folder_id, name=folder.name, creation_time=folder.timestamp, fullpath=parent_dir_path.as_posix(), items=items
    )


def rmitem(item: FSItem):
    """
    Removes a file or directory.

    :param item: the item to remove
    """

    if not item.is_folder:
        # Remove the item from the database and the file system
        path = CONFIG.storage.vault_folder / item.system_path
        path.unlink()
        remove_item(item.id)
        return

    # For folder, first need to remove its children before removing itself
    children = get_items_in_folder(item.id)
    for child in children:
        rmitem(child)

    remove_item(item.id)
