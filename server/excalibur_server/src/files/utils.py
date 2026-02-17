import mimetypes
from pathlib import Path

from excalibur_server.src.config import CONFIG
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


def construct_file_or_directory(
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


def listdir(username: str, path: Path, include_exef_size: bool = False) -> Directory | None:
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
        item = construct_file_or_directory(username, path / item, include_exef_size)
        if item is None:
            continue

        items.append(item)

    return Directory(name=path.name, fullpath=get_vault_path(username, path), items=items)
