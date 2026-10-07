from datetime import UTC, datetime


def get_current_timestamp():
    """
    :return: the current timestamp, in UTC
    """

    return int(datetime.now(tz=UTC).timestamp())
