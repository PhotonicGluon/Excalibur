from collections.abc import Callable
from uuid import UUID

import pytest

from excalibur_server.src.db.operations import get_item, get_session
from excalibur_server.src.db.tables import FSItem


@pytest.fixture
def mark_clean() -> Callable[[UUID], None]:
    """
    :returns: helper that gives an item, and all of its ancestors, valid Merkle data
    """

    def _mark_clean(item_id: UUID):
        with get_session() as session, session.begin():
            curr_id = item_id
            while curr_id is not None:
                item = session.get(FSItem, curr_id)
                if item is None:
                    break

                item.node_hash = b"clean-" + item.name.encode()
                if not item.is_folder:
                    item.content_mac = b"mac-" + item.name.encode()
                session.add(item)

                curr_id = item.parent_id

    return _mark_clean


@pytest.fixture
def assert_dirty() -> Callable[[UUID, int | None], None]:
    """
    :returns: helper that asserts that an item has been marked dirty, optionally checking that its
        version was bumped
    """

    def _assert_dirty(item_id: UUID, previous_version: int | None = None):
        item = get_item(item_id)
        assert item is not None, f"Item '{item_id}' does not exist"
        assert item.node_hash is None, f"Item '{item_id}' still has a node hash"
        if previous_version is not None:
            assert item.version > previous_version, f"Item '{item_id}' did not have its version bumped"

    return _assert_dirty
