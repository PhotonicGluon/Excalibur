from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from excalibur_server.src.db.tables import FSItem


class TestFSItemConstraints:
    @pytest.fixture()
    def parent(self, db_session: Session):
        root_id = uuid4()
        parent = FSItem(parent_id=None, root_id=root_id, is_folder=True)
        db_session.add(parent)
        db_session.commit()
        yield parent

        db_session.rollback()
        for item in db_session.execute(select(FSItem).where(FSItem.root_id == root_id)).scalars().all():
            db_session.delete(item)
        db_session.commit()

    def test_name_is_optional(self, parent: FSItem):
        assert parent.name is None
        assert parent.name_enc is None
        assert parent.name_tag is None

    def test_duplicate_name_tag_rejected(self, db_session: Session, parent: FSItem):
        tag = b"\x01" * 32
        db_session.add(FSItem(parent_id=parent.id, root_id=parent.root_id, name_enc=b"a", name_tag=tag))
        db_session.commit()

        db_session.add(FSItem(parent_id=parent.id, root_id=parent.root_id, name_enc=b"b", name_tag=tag))
        with pytest.raises(IntegrityError):
            db_session.commit()
        db_session.rollback()

    def test_same_name_tag_in_different_folders_allowed(self, db_session: Session, parent: FSItem):
        tag = b"\x02" * 32
        other = FSItem(
            parent_id=parent.id, root_id=parent.root_id, is_folder=True, name_enc=b"o", name_tag=b"\x03" * 32
        )
        db_session.add(other)
        db_session.add(FSItem(parent_id=parent.id, root_id=parent.root_id, name_enc=b"a", name_tag=tag))
        db_session.add(FSItem(parent_id=other.id, root_id=parent.root_id, name_enc=b"a", name_tag=tag))
        db_session.commit()

    def test_null_name_tags_do_not_collide(self, db_session: Session, parent: FSItem):
        # Legacy items have no tag, so any number of them can share a folder
        db_session.add(FSItem(parent_id=parent.id, root_id=parent.root_id, name="legacy-1"))
        db_session.add(FSItem(parent_id=parent.id, root_id=parent.root_id, name="legacy-2"))
        db_session.commit()

    def test_null_names_do_not_collide(self, db_session: Session, parent: FSItem):
        # Migrated items have no plaintext name, so any number of them can share a folder
        db_session.add(FSItem(parent_id=parent.id, root_id=parent.root_id, name_enc=b"a", name_tag=b"\x04" * 32))
        db_session.add(FSItem(parent_id=parent.id, root_id=parent.root_id, name_enc=b"b", name_tag=b"\x05" * 32))
        db_session.commit()

    def test_duplicate_legacy_name_still_rejected(self, db_session: Session, parent: FSItem):
        db_session.add(FSItem(parent_id=parent.id, root_id=parent.root_id, name="dup"))
        db_session.commit()

        db_session.add(FSItem(parent_id=parent.id, root_id=parent.root_id, name="dup"))
        with pytest.raises(IntegrityError):
            db_session.commit()
        db_session.rollback()
