import os


def is_debug() -> bool:
    """
    Determines whether the API server is running in debug mode.
    """

    return os.environ.get("EXCALIBUR_SERVER_DEBUG", "0") == "1"
