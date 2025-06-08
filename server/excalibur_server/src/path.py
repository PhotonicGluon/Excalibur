from pathlib import Path


def validate_path(path: Path, root_directory: Path) -> tuple[Path, bool]:
    """
    Validates that the given path is a subdirectory of the root directory.

    :param path: The path to validate.
    :param root_directory: The root directory to check against.
    :return: The validated path and whether it is a subdirectory of the root directory.
    """

    # TODO: Vet this code
    user_path = root_directory / path
    user_path = user_path.resolve()
    return user_path, user_path.is_relative_to(root_directory.resolve())
