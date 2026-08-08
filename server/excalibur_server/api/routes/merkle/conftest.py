import pytest
from sqlalchemy.orm import Session

from excalibur_server.src.db.operations import get_item
from excalibur_server.src.db.tables import FSItem


@pytest.fixture(scope="module")
def merkle_folder(test_user, db_session: Session) -> FSItem:
    root_id = test_user["root_id"]

    # Create folders
    folder = FSItem(
        parent_id=root_id, root_id=root_id, name="merkle-folder", is_folder=True, node_hash=b"merkle-folder"
    )
    subfolder = FSItem(
        parent_id=folder.id, root_id=root_id, name="subfolder", is_folder=True, node_hash=b"merkle-subfolder"
    )
    subfolder2 = FSItem(
        parent_id=folder.id, root_id=root_id, name="subfolder-2", is_folder=True, node_hash=b"merkle-subfolder2"
    )
    subsubfolder = FSItem(
        parent_id=subfolder.id, root_id=root_id, name="subsubfolder", is_folder=True, node_hash=b"merkle-subsubfolder"
    )
    db_session.add(folder)
    db_session.add(subfolder)
    db_session.add(subfolder2)
    db_session.add(subsubfolder)

    # Make test files
    file1 = FSItem(parent_id=folder.id, root_id=root_id, name="apple-fruit-file.exef", size=1234, node_hash=b"apple")
    file2 = FSItem(parent_id=folder.id, root_id=root_id, name="banana-fruit-file.exef", size=1234, node_hash=b"banana")
    file3 = FSItem(
        parent_id=subfolder.id, root_id=root_id, name="cherry-fruit-file.exef", size=1234, node_hash=b"cherry"
    )
    file4 = FSItem(
        parent_id=subfolder.id, root_id=root_id, name="dragon-fruit-file.exef", size=1234, node_hash=b"dragon"
    )
    file5 = FSItem(
        parent_id=subfolder2.id, root_id=root_id, name="elderberry-fruit-file.exef", size=1234, node_hash=b"elderberry"
    )
    file6 = FSItem(parent_id=subfolder2.id, root_id=root_id, name="fig-fruit-file.exef", size=1234, node_hash=b"fig")
    file7 = FSItem(
        parent_id=subfolder2.id, root_id=root_id, name="grape-fruit-file.exef", size=1234, node_hash=b"grape"
    )
    file8 = FSItem(
        parent_id=subsubfolder.id, root_id=root_id, name="honeydew-fruit-file.exef", size=1234, node_hash=b"honeydew"
    )
    file9 = FSItem(
        parent_id=subsubfolder.id, root_id=root_id, name="iced-fruit-file.exef", size=1234, node_hash=None
    )  # To test non-migrated files

    db_session.add(file1)
    db_session.add(file2)
    db_session.add(file3)
    db_session.add(file4)
    db_session.add(file5)
    db_session.add(file6)
    db_session.add(file7)
    db_session.add(file8)
    db_session.add(file9)

    # Commit and yield
    db_session.commit()
    yield {"top_folder": folder.id, "sub_folder": subfolder.id, "sub_sub_folder": subsubfolder.id}

    # Clean up
    if get_item(folder.id) is not None:
        db_session.delete(file1)
        db_session.delete(file2)
        db_session.delete(file3)
        db_session.delete(file4)
        db_session.delete(file5)
        db_session.delete(file6)
        db_session.delete(file7)
        db_session.delete(file8)
        db_session.delete(file9)
        db_session.delete(subsubfolder)
        db_session.delete(subfolder)
        db_session.delete(subfolder2)
        db_session.delete(folder)
        db_session.commit()
