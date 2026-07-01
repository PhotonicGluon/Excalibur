from urllib.parse import quote

from starlette.datastructures import URL


def get_url_encoded_path(url: URL, include_query: bool = False) -> str:
    """
    Encodes the path of a URL.

    :param url: the URL to encode the path of
    :param include_query: whether to append the raw query string (for PoP coverage of query params)
    :return: the encoded path, optionally followed by ?query
    """

    path = url.path
    if path == "":
        path = "/"
    result = quote(path)
    if include_query and url.query:
        result += "?" + url.query
    return result
