from pathlib import Path
from typing import Literal, Self, Union
from uuid import UUID

from pydantic import BaseModel, Field, field_serializer

from excalibur_server.src.db.operations import get_item_fullpath
from excalibur_server.src.db.tables import FSItem


class Filelike(BaseModel):
    id: UUID
    "UUID of the item"

    name: str
    "Name of item"

    creation_time: int
    "Creation timestamp of the item as *seconds* since the Unix epoch, in UTC"

    fullpath: str
    "Path to the item from the root directory"

    @classmethod
    def _get_base_fields(cls, fsitem: FSItem, parent_dir_path: Path | None = None) -> dict:
        """
        Get common fields for Filelike objects

        :param fsitem: `FSItem` to get fields from
        :param parent_dir_path: parent directory path, defaults to None
        :return: dictionary of common fields
        """

        if parent_dir_path:
            fullpath = parent_dir_path / fsitem.name
        else:
            fullpath = get_item_fullpath(fsitem.id)

        return {
            "id": fsitem.id,
            "name": fsitem.name,
            "creation_time": fsitem.timestamp,
            "fullpath": fullpath.as_posix(),
        }

    # Field serializers
    @field_serializer("id")
    def serialize_id(self, value: UUID) -> str:
        return str(value)


class File(Filelike):
    type: Literal["file"] = "file"

    size: int
    "Size of the file in bytes"

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "id": "00000000-0000-0000-0000-000000000000",
                    "name": "example.txt",
                    "creation_time": 1000000000,
                    "fullpath": "example.txt",
                    "size": 1024,
                },
                {
                    "id": "00000000-0000-0000-0000-000000000002",
                    "name": "subfile.txt",
                    "creation_time": 1200000000,
                    "fullpath": "some-dir/subfile.txt",
                    "size": 2048,
                },
            ]
        }
    }

    @classmethod
    def from_fsitem(cls, fsitem: FSItem, parent_dir_path: Path | None = None) -> Self:
        """
        Create a File instance from an FSItem.

        :param fsitem: `FSItem` to create instance from
        :param parent_dir_path: parent directory path, defaults to None
        :return: File instance
        """

        base_fields = cls._get_base_fields(fsitem, parent_dir_path)
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
                    "name": "some-dir",
                    "creation_time": 1100000000,
                    "fullpath": "some-dir",
                    "items": [
                        {
                            "id": "00000000-0000-0000-0000-000000000002",
                            "name": "subfile.txt",
                            "creation_time": 1200000000,
                            "fullpath": "some-dir/subfile.txt",
                        },
                        {
                            "id": "00000000-0000-0000-0000-000000000003",
                            "name": "some-sub-dir",
                            "creation_time": 1300000000,
                            "fullpath": "some-dir/some-sub-dir",
                            "items": [],
                        },
                    ],
                },
                {
                    "id": "00000000-0000-0000-0000-000000000003",
                    "name": "some-sub-dir",
                    "creation_time": 1300000000,
                    "fullpath": "some-dir/some-sub-dir",
                    "items": [],
                },
            ]
        }
    }

    @classmethod
    def from_fsitem(cls, fsitem: FSItem, parent_dir_path: Path | None = None) -> Self:
        """
        Create a Directory instance from an FSItem.

        :param fsitem: `FSItem` to create instance from
        :param parent_dir_path: parent directory path, defaults to None
        :return: Directory instance
        """

        base_fields = cls._get_base_fields(fsitem, parent_dir_path)
        return cls(**base_fields)
