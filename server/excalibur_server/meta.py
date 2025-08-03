from importlib.metadata import metadata

import git

pkg_metadata = metadata("excalibur-server")

TITLE = "Excalibur Server"
SUMMARY = pkg_metadata["Summary"]
VERSION = pkg_metadata["Version"]

try:
    repo = git.Repo(search_parent_directories=True)
    COMMIT = repo.head.object.hexsha  # 40-byte commit hash
except (
    ValueError,
    git.InvalidGitRepositoryError,
):  # Occurs if the repository is not a git repository (e.g., bundled as a wheel)
    COMMIT = None
