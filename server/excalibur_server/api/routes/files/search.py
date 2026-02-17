from typing import Annotated

from fastapi import Body, Depends, Query, status
from rapidfuzz import fuzz, process

from excalibur_server.api.routes.files import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.config import CONFIG
from excalibur_server.src.files.searching import file_index
from excalibur_server.src.files.structures import File
from excalibur_server.src.files.utils import construct_file_or_directory


@encrypted_router.post(
    "/search",
    name="Search Files",
    responses={
        status.HTTP_200_OK: {
            "description": "Search results",
            "content": {
                "application/json": {
                    "example": [("example.txt", 95), ("fake.txt", 80), ("subfolder/fake-2.txt", 65)],
                    "schema": None,
                }
            },
        },
    },
)
def search_endpoint(
    credentials: Annotated[Credentials, Depends(get_credentials)],
    query: Annotated[str, Body(description="File name or generic query to search for")],
    limit: Annotated[int, Query(description="Maximum number of results to return")] = 5,
    score_threshold: Annotated[
        float, Query(description="Minimum similarity threshold to consider a match (0.0-1.0)")
    ] = 0.6,
    include_exef_size: Annotated[
        bool, Query(description="Whether to include the additional ExEF size (i.e., header and footer) in file sizes")
    ] = False,
) -> list[tuple[File, int]]:
    """
    Search for files in the user's file index.

    Returns a list of tuples containing the file data and similarity score.
    """

    choices = [file.as_posix() for file in file_index.get(credentials.username)]
    results = process.extract(query, choices, scorer=fuzz.WRatio, limit=limit, score_cutoff=score_threshold * 100)
    results = [(result[0], result[1]) for result in results]  # 0 = relative path, 1 = similarity score

    output = []
    for rel_path, score in results:
        abs_path = CONFIG.storage.vault_folder / credentials.username / rel_path
        item: File = construct_file_or_directory(credentials.username, abs_path, include_exef_size=include_exef_size)
        output.append((item, score))

    return output
