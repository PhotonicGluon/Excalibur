import sys
from pathlib import Path, PurePosixPath


def split_path(path: str) -> tuple[str, ...]:
    """
    Splits a path into its non-trivial parts.

    :param path: the path to split (use "." to specify the root directory)
    :return: the parts of the path, which is empty if the path refers to the root directory
    """

    return tuple(p for p in PurePosixPath(path).as_posix().split("/") if p and p != ".")


def check_path_subdir(path: Path, root_directory: Path) -> tuple[Path, bool]:
    """
    Validates that the given path is a subdirectory of the root directory.

    :param path: the path to validate
    :param root_directory: the root directory to check against
    :return: the validated path and whether it is a subdirectory of the root directory
    """

    user_path = root_directory / path
    user_path = user_path.resolve()
    return user_path, user_path.is_relative_to(root_directory.resolve())


def check_path_length(path: Path) -> bool:
    """
    Validates that the given path is not longer than the maximum path length.

    :param path: the path to validate
    :return: whether the path is valid
    """

    path_length = len(str(path))
    file_name_length = len(path.name)

    if sys.platform == "win32":
        # Maximum file path length is 260 bytes...
        # See https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation
        # ...so let's set it at 256 bytes to be safe
        return path_length <= 256

    elif sys.platform == "linux":
        # Maximum file name length is 255 bytes.
        # See https://en.wikipedia.org/wiki/Ext4#:~:text=Max%20filename%20length,as%20Unicode)
        #
        # Maximum file path length seems to be 4096 bytes... but can be changed by the user

        return path_length <= 4096 and file_name_length <= 255

    elif sys.platform == "darwin":
        # Maximum file name length seems to follow linux, with maximum file path length being 1024 bytes.
        # See https://discussions.apple.com/thread/250275651?answerId=250518542022&sortBy=rank#250518542022

        return path_length <= 1024 and file_name_length <= 255

    # For unknown platforms, we just assume the most conservative limit: 256 bytes
    return path_length <= 256
