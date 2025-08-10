import mimetypes
from pathlib import Path

from excalibur_server.consts import FILES_FOLDER
from excalibur_server.src.exef import ExEF
from excalibur_server.src.files.structures import Directory, File


def get_fullpath(username: str, path: Path):
    """
    Resolves the given path and returns its relative path to `FILES_FOLDER` as a POSIX-style path
    string.

    :param username: The username of the user.
    :param path: The path to resolve.
    :return: A POSIX-style path string relative to `FILES_FOLDER`.
    """

    return path.resolve().relative_to(FILES_FOLDER / username).as_posix()


def listdir(username: str, path: Path, include_exef_size: bool = False) -> Directory | None:
    """
    Lists the contents of a directory.

    Will ignore any file that is not an ExEF file.

    :param username: The username of the user.
    :param path: The path to list.
    :param include_exef_size: Whether to include the additional ExEF size in file sizes.
    :returns: A `Directory` object with a list of `File` and `Directory` objects, or `None` if the
        path does not exist or is not a directory.
    """

    if not path.is_dir():
        return None

    items = []
    for item in path.iterdir():
        fullpath = get_fullpath(username, path / item)

        if item.is_dir():
            items.append(Directory(name=item.name, fullpath=fullpath))
        else:
            if item.suffix != ".exef":
                continue

            size = item.stat().st_size
            if not include_exef_size:
                size -= ExEF.header_size + ExEF.footer_size

            mimetype, _ = mimetypes.guess_type(fullpath.removesuffix(".exef"), strict=True)
            items.append(File(name=item.name, fullpath=fullpath, size=size, mimetype=mimetype))

    return Directory(name=path.name, fullpath=get_fullpath(username, path), items=items)
