from collections import defaultdict
from pathlib import Path

from excalibur_server.src.config import CONFIG


class FileIndex:
    """
    Indexes files in the vault folder by username.
    """

    def __init__(self):
        self._index: dict[str, set[Path]] = defaultdict(set)  # TODO: Make this persistent?
        "Maps usernames to sets of file paths"

    # Magic methods
    def __repr__(self) -> str:
        return f"FileIndex(index={self._index})"

    def __str__(self) -> str:
        return str(dict(self._index))

    def __contains__(self, path: Path) -> bool:
        username, relative_path = self._split_path(path)
        return relative_path in self._index[username]

    # Private methods
    def _split_path(self, path: Path) -> tuple[str, Path]:
        """
        Splits a file path into the username and the relative path.

        :param path: absolute path to the file
        :return: tuple of (username, relative path)
        """

        # FIXME: This approach lacks validation of whether the file path format is correct

        vault_file_path = path.relative_to(CONFIG.storage.vault_folder)
        username = vault_file_path.parts[0]  # First folder is always the username
        relative_path = vault_file_path.relative_to(username)
        return username, relative_path

    # Public methods
    def get(self, username: str) -> set[Path]:
        """
        Returns the set of file paths for a given username.

        :param username: username to get file paths for
        :return: set of file paths
        """

        return self._index[username]

    def add(self, path: Path):
        """
        Adds a file to the index.

        :param path: absolute path to the file
        """

        username, relative_path = self._split_path(path)
        self._index[username].add(relative_path)

    def remove(self, path: Path):
        """
        Removes a file from the index.

        :param path: absolute path to the file
        """

        username, relative_path = self._split_path(path)
        self._index[username].remove(relative_path)


file_index = FileIndex()
"Global file index"
