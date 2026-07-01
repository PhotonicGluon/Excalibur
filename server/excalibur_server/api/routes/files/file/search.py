from typing import Annotated

from fastapi import Body, Depends, Query, status
from rapidfuzz import fuzz, process

from excalibur_server.api.routes.files import encrypted_router
from excalibur_server.src.auth.credentials import Credentials, get_credentials
from excalibur_server.src.db.operations import get_items_in_root
from excalibur_server.src.files.structures import File
from excalibur_server.src.users import get_user_from_id


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
                                "creation_time": 1100000000,
                                "fullpath": "example.txt",
                                "type": "file",
                                "size": 1024,
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

    user_id = credentials.user_id

    # Get all files in the user's filesystem
    root_id = get_user_from_id(user_id).fsitem_id
    files = [item for item in get_items_in_root(root_id) if not item.is_folder]
    choices = [item.name for item in files]

    # Filter files by similarity score
    results = process.extract(
        query, choices, scorer=fuzz.WRatio, limit=limit if limit > 0 else None, score_cutoff=score_threshold * 100
    )
    results = [(files[result[2]], result[1] / 100) for result in results]  # 2 = index, 1 = similarity score

    output = []
    for fsitem, score in results:
        item = File.from_fsitem(fsitem, include_exef_size=include_exef_size)
        output.append((item, score))

    return output
