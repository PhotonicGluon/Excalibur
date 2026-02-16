import os
from pathlib import Path

from watchdog.events import (
    DirCreatedEvent,
    DirDeletedEvent,
    DirMovedEvent,
    FileCreatedEvent,
    FileDeletedEvent,
    FileMovedEvent,
    FileSystemEventHandler,
)
from watchdog.observers import Observer

from excalibur_server.src.config import CONFIG
from excalibur_server.src.files.searching.index import file_index


class IndexUpdater(FileSystemEventHandler):
    def on_created(self, event: DirCreatedEvent | FileCreatedEvent):
        if event.is_directory:
            return

        path = Path(event.src_path)
        file_index.add(path)

    def on_deleted(self, event: DirDeletedEvent | FileDeletedEvent):
        path = Path(event.src_path)
        if path not in file_index:
            return

        file_index.remove(path)

    def on_moved(self, event: DirMovedEvent | FileMovedEvent):
        src_path = Path(event.src_path)
        if src_path in file_index:
            file_index.remove(src_path)

        if not event.is_directory:
            file_index.add(Path(event.dest_path))


def build_file_index():
    """
    Builds the initial file index by walking the vault folder on server startup.
    """

    for root, _, files in os.walk(CONFIG.storage.vault_folder):
        for file in files:
            file_index.add(Path(root) / file)

    event_handler = IndexUpdater()
    observer = Observer()
    observer.schedule(event_handler, CONFIG.storage.vault_folder, recursive=True)
    observer.start()
