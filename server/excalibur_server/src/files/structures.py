from base64 import b64encode
from typing import Literal, Self, Union
from uuid import UUID

from pydantic import Base64Bytes, BaseModel, Field, field_serializer, field_validator

from excalibur_server.src.config import CONFIG
from excalibur_server.src.db.tables import FSItem

NAME_TAG_SIZE = 32
"Size of an item's name tag, in bytes"


# Main FS structures
class Filelike(BaseModel):
    id: UUID
    "UUID of the item"

    parent_id: UUID | None
    "UUID of the parent directory, or None for the user's root directory"

    creation_time: int
    "Creation timestamp of the item as *seconds* since the Unix epoch, in UTC"

    name_enc: bytes | None
    "Encrypted name of the item, or None if the item has not been migrated to encrypted names yet"

    name: str | None  # TODO: Remove in 0.10.0
    "Legacy plaintext name of the item, or None if the item has been migrated to encrypted names"

    @classmethod
    def _get_base_fields(cls, fsitem: FSItem) -> dict:
        """
        Get common fields for Filelike objects

        :param fsitem: `FSItem` to get fields from
        :return: dictionary of common fields
        """

        return {
            "id": fsitem.id,
            "parent_id": fsitem.parent_id,
            "creation_time": fsitem.timestamp,
            "name_enc": fsitem.name_enc,
            "name": fsitem.name,
        }

    # Field serializers
    @field_serializer("id", "parent_id")
    def serialize_uuid(self, value: UUID | None) -> str | None:
        return str(value) if value is not None else None

    @field_serializer("name_enc")
    def serialize_name_enc(self, value: bytes | None) -> str | None:
        return b64encode(value).decode("utf-8") if value is not None else None


class File(Filelike):
    type: Literal["file"] = "file"

    size: int
    "Size of the file in bytes"

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "00000000-0000-0000-0000-000000000000",
                    "parent_id": "00000000-0000-0000-0000-0000000000ff",
                    "creation_time": 1000000000,
                    "name_enc": "ZW5jcnlwdGVkLW5hbWU=",
                    "name": None,
                    "size": 1024,
                },
                # TODO: Remove/replace this second example in 0.10.0
                {
                    "id": "00000000-0000-0000-0000-000000000002",
                    "parent_id": "00000000-0000-0000-0000-000000000001",
                    "creation_time": 1200000000,
                    "name_enc": None,
                    "name": "subfile.txt.exef",
                    "size": 2048,
                },
            ]
        }
    }

    @classmethod
    def from_fsitem(cls, fsitem: FSItem) -> Self:
        """
        Create a File instance from an FSItem.

        :param fsitem: `FSItem` to create instance from
        :return: File instance
        """

        base_fields = cls._get_base_fields(fsitem)
        return cls(
            **base_fields,
            size=fsitem.size,
        )


class Directory(Filelike):
    type: Literal["directory"] = "directory"

    items: list[Union[File, "Directory"]] | None = Field(default=None, exclude_if=lambda v: v is None)
    "List of filelike instances in the directory"

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "00000000-0000-0000-0000-000000000001",
                    "parent_id": "00000000-0000-0000-0000-0000000000ff",
                    "creation_time": 1100000000,
                    "name_enc": "ZW5jcnlwdGVkLW5hbWU=",
                    "name": None,
                    "items": [
                        {
                            "id": "00000000-0000-0000-0000-000000000002",
                            "parent_id": "00000000-0000-0000-0000-000000000001",
                            "creation_time": 1200000000,
                            "name_enc": "ZW5jcnlwdGVkLW5hbWU=",
                            "name": None,
                            "size": 2048,
                        },
                        # TODO: Remove/replace this second example in 0.10.0
                        {
                            "id": "00000000-0000-0000-0000-000000000003",
                            "parent_id": "00000000-0000-0000-0000-000000000001",
                            "creation_time": 1300000000,
                            "name_enc": None,
                            "name": "some-sub-dir",
                            "items": [],
                        },
                    ],
                },
            ]
        }
    }

    @classmethod
    def from_fsitem(cls, fsitem: FSItem) -> Self:
        """
        Create a Directory instance from an FSItem.

        :param fsitem: `FSItem` to create instance from
        :return: Directory instance
        """

        base_fields = cls._get_base_fields(fsitem)
        return cls(**base_fields)


# Encrypted names structures
class EncryptedName(BaseModel):
    """
    An item's name, as produced by the client.

    The server treats both fields as opaque bytes.
    """

    name_enc: Base64Bytes
    "Encrypted item name"
    name_tag: Base64Bytes
    "Keyed tag of the item's parent ID and name"

    @field_validator("name_enc")
    @classmethod
    def validate_name_enc(cls, value: bytes) -> bytes:
        if not value:
            raise ValueError("must not be empty")
        if len(value) > CONFIG.storage.database.max_encrypted_name_size:
            raise ValueError(f"must be at most {CONFIG.storage.database.max_encrypted_name_size} bytes")
        return value

    @field_validator("name_tag")
    @classmethod
    def validate_name_tag(cls, value: bytes) -> bytes:
        if len(value) != NAME_TAG_SIZE:
            raise ValueError(f"must be exactly {NAME_TAG_SIZE} bytes")
        return value


class NewItem(EncryptedName):
    """
    The identity of an item that is about to be created.
    """

    id: UUID
    "Client-generated unique identifier for the new item"
