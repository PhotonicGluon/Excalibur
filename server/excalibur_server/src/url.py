from urllib.parse import quote

from starlette.datastructures import URL


def get_url_encoded_path(url: str | URL) -> str:
    if isinstance(url, str):
        url = URL(url)
    return quote(url.path)
