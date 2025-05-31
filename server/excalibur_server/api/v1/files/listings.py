from pathlib import Path

from excalibur_server.api.v1.files.structures import Directory, File
from excalibur_server.consts import FILES_FOLDER


def get_fullpath(path: Path):
    """
    Resolves the given path and returns its relative path to `FILES_FOLDER` as a POSIX-style path string.

    :param path: The path to resolve.
    :return: A POSIX-style path string relative to `FILES_FOLDER`.
    """

    return path.resolve().relative_to(FILES_FOLDER).as_posix()


def listdir(path: Path) -> Directory | None:
    """
    Lists the contents of a directory.

    :param path: The path to list.
    :returns: A `Directory` object with a list of `File` and `Directory` objects, or `None` if the
        path does not exist or is not a directory.
    """

    if not path.is_dir():
        return None

    items = []
    for item in path.iterdir():
        fullpath = get_fullpath(path / item)
        if item.is_dir():
            items.append(Directory(name=item.name, fullpath=fullpath))
        else:
            # TODO: Address mimetype detection
            items.append(File(name=item.name, fullpath=fullpath, size=item.stat().st_size, mimetype=item.suffix))

    return Directory(name=path.name, fullpath=get_fullpath(path), items=items)
