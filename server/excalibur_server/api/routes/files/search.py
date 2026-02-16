from typing import Annotated

from fastapi import Body, Depends, Query, status
from rapidfuzz import fuzz, process

from excalibur_server.api.routes.files import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.files.searching import file_index


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
    query: Annotated[str, Body(description="The search query")],
    limit: Annotated[int, Query(description="The maximum number of results to return")] = 5,
    score_threshold: Annotated[int, Query(description="The minimum similarity score to consider a match (0-100)")] = 60,
) -> list[tuple[str, int]]:
    """
    Search for files in the user's file index.

    Returns a list of tuples containing the filepath and similarity score.
    """

    choices = [file.as_posix() for file in file_index.get(credentials.username)]
    results = process.extract(query, choices, scorer=fuzz.WRatio, limit=limit, score_cutoff=score_threshold)
    return [(result[0], result[1]) for result in results]  # 0 = filename, 1 = similarity score
