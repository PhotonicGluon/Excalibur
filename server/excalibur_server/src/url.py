from urllib.parse import quote

from starlette.datastructures import URL


def get_url_encoded_path(url: URL) -> str:
    """
    Encodes the path of a URL.

    :param url: The URL to encode the path of
    :return: The encoded path
    """

    path = url.path
    if path == "":
        path = "/"
    return quote(path)
