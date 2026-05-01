import os


def is_debug():
    return os.getenv("EXCALIBUR_SERVER_DEBUG", "0") == "1"  # Default should be off


def has_encryption():
    return os.getenv("EXCALIBUR_SERVER_ENCRYPT_RESPONSES", "1") != "0"


def has_cors_validation():
    return os.getenv("EXCALIBUR_SERVER_ENABLE_CORS_VALIDATION", "1") != "0"


def has_pop_checking():
    return os.getenv("EXCALIBUR_SERVER_ENABLE_POP", "1") != "0"


def has_log_to_console():
    return os.getenv("EXCALIBUR_SERVER_LOG_TO_CONSOLE", "1") != "0"


def has_log_to_file():
    return os.getenv("EXCALIBUR_SERVER_LOG_TO_FILE", "1") != "0"


def get_artificial_delay():
    return tuple([int(x) for x in os.getenv("EXCALIBUR_SERVER_DELAY_RESPONSES", "0,0").split(",")])
