from base64 import b64encode
from collections.abc import Callable
from hashlib import sha256
from uuid import UUID

import pytest

from excalibur_server.src.db.operations import get_item, get_session
from excalibur_server.src.db.tables import FSItem


def _fake_name_fields(parent_id: UUID, name: str) -> dict[str, bytes]:
    return {
        "name_enc": b"enc-" + name.encode(),
        "name_tag": sha256(parent_id.bytes + name.encode()).digest(),
    }


@pytest.fixture
def name_fields() -> Callable[[UUID, str], dict[str, bytes]]:
    """
    :returns: helper that makes stand-in encrypted name fields for the constructor of `FSItem`
    """

    return _fake_name_fields


@pytest.fixture
def encrypted_name() -> Callable[[UUID, str], dict[str, str]]:
    """
    :returns: helper that makes the JSON form (i.e., Base64) of the stand-in encrypted name fields,
        for use in request bodies. Agrees with `name_fields`
    """

    def _encrypted_name(parent_id: UUID, name: str) -> dict[str, str]:
        return {key: b64encode(value).decode() for key, value in _fake_name_fields(parent_id, name).items()}

    return _encrypted_name


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

                item.node_hash = b"clean-" + item.id.bytes
                if not item.is_folder:
                    item.content_mac = b"mac-" + item.id.bytes
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
