import mimetypes
from pathlib import Path

from excalibur_server.consts import FILES_FOLDER
from excalibur_server.src.exef import ExEF
from excalibur_server.src.files.structures import Directory, File

EXCLUDED_FILES = [".DS_Store"]


def get_fullpath(path: Path):
    """
    Resolves the given path and returns its relative path to `FILES_FOLDER` as a POSIX-style path string.

    :param path: The path to resolve.
    :return: A POSIX-style path string relative to `FILES_FOLDER`.
    """

    return path.resolve().relative_to(FILES_FOLDER).as_posix()


def listdir(path: Path, with_exef_header: bool = False) -> Directory | None:
    """
    Lists the contents of a directory.

    :param path: The path to list.
    :param with_exef_header: Whether to include the EXEF header size in file sizes.
    :returns: A `Directory` object with a list of `File` and `Directory` objects, or `None` if the
        path does not exist or is not a directory.
    """

    if not path.is_dir():
        return None

    items = []
    for item in path.iterdir():
        fullpath = get_fullpath(path / item)

        if item.name in EXCLUDED_FILES:
            continue

        if item.is_dir():
            items.append(Directory(name=item.name, fullpath=fullpath))
        else:
            size = item.stat().st_size
            if item.suffix == ".exef" and not with_exef_header:
                size -= ExEF.header_size + ExEF.footer_size

            mimetype, _ = mimetypes.guess_type(fullpath.removesuffix(".exef"), strict=True)
            items.append(File(name=item.name, fullpath=fullpath, size=size, mimetype=mimetype))

    return Directory(name=path.name, fullpath=get_fullpath(path), items=items)
