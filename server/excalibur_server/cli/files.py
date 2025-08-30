from typing import Annotated
import glob
import os
import heapq
from pathlib import Path
import typer
from uuid import uuid4

from excalibur_server.src.config import CONFIG

files_app = typer.Typer(no_args_is_help=True, help="File operations.")


@files_app.command()
def migrate():
    """
    Migrates files to the new naming system.
    """

    VAULT_FOLDER = CONFIG.server.vault_folder
    typer.secho(f"Migrating files in {VAULT_FOLDER}...", fg="yellow")

    for user in VAULT_FOLDER.iterdir():
        if user.is_file():
            # We just need users
            continue

        # Decide what the new names will be
        uuid_to_item: dict[str, Path] = {}
        heap = []
        for item in glob.iglob(str(user / "**" / "*"), recursive=True):
            item = Path(item)
            uuid = uuid4().hex
            uuid_to_item[uuid] = item
            heapq.heappush(heap, (-len(item.parents), uuid))  # Negated as we want 'deeper' files to be renamed first

        # Rename the files
        while heap:
            _, uuid = heapq.heappop(heap)
            old_path = uuid_to_item[uuid]
            new_path = old_path.parent / uuid
            # old_path.rename(new_path)
            typer.secho(f"Renamed {old_path} to {new_path}", fg="cyan")
