from typing import Annotated

from fastapi import Body, Depends, Query, status
from rapidfuzz import fuzz, process

from excalibur_server.api.routes.files import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.config import CONFIG
from excalibur_server.src.db.operations import get_items_in_root
from excalibur_server.src.files.searching import file_index
from excalibur_server.src.files.structures import File
from excalibur_server.src.files.utils import construct_file_or_directory, construct_file_or_directory_old
from excalibur_server.src.users import get_user


def _old_search(credentials: Credentials, query: str, limit: int, score_threshold: float, include_exef_size: bool):
    choices = [file.as_posix() for file in file_index.get(credentials.username)]
    results = process.extract(
        query, choices, scorer=fuzz.WRatio, limit=limit if limit > 0 else None, score_cutoff=score_threshold * 100
    )
    results = [(result[0], result[1] / 100) for result in results]  # 0 = relative path, 1 = similarity score

    output = []
    for rel_path, score in results:
        abs_path = CONFIG.storage.vault_folder / credentials.username / rel_path
        item = construct_file_or_directory_old(credentials.username, abs_path, include_exef_size=include_exef_size)
        if item is None:
            continue
        output.append((item, score))

    return output


@encrypted_router.post(
    "/search",
    name="Search Files",
    responses={
        status.HTTP_200_OK: {
            "description": "Search results",
            "content": {
                "application/json": {
                    "example": [
                        [
                            {
                                "name": "example.txt",
                                "fullpath": "example.txt",
                                "type": "file",
                                "size": 1024,
                                "mimetype": "text/plain",
                            },
                            0.9,
                        ],
                    ],
                }
            },
        },
    },
)
def search_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    query: Annotated[str, Body(description="File name or generic query to search for")],
    limit: Annotated[int, Query(description="Maximum number of results to return, with `0` meaning all", ge=0)] = 5,
    score_threshold: Annotated[
        float, Query(description="Minimum similarity threshold to consider a match (0.0-1.0)", ge=0.0, le=1.0)
    ] = 0.6,
    include_exef_size: Annotated[
        bool, Query(description="Whether to include the additional ExEF size (i.e., header and footer) in file sizes")
    ] = False,
) -> list[tuple[File, float]]:
    """
    Search for files in the user's file index.

    Returns a list of tuples containing the file data and similarity score.
    """

    username = credentials.username

    # Handle legacy users without flattened filesystem
    root_id = get_user(username).fsitem_id
    if root_id is None:
        return _old_search(credentials, query, limit, score_threshold, include_exef_size)

    # Get all files in the user's filesystem
    files = [item for item in get_items_in_root(root_id) if not item.is_folder]
    choices = [item.name for item in files]

    # Filter files by similarity score
    results = process.extract(
        query, choices, scorer=fuzz.WRatio, limit=limit if limit > 0 else None, score_cutoff=score_threshold * 100
    )
    results = [(files[result[2]], result[1] / 100) for result in results]  # 2 = index, 1 = similarity score

    output = []
    for fsitem, score in results:
        item = construct_file_or_directory(fsitem, include_exef_size=include_exef_size)
        output.append((item, score))

    return output
