from pathlib import Path
from typing import Literal, Self, Union

from pydantic import BaseModel, Field

from excalibur_server.src.db.operations import get_item_fullpath
from excalibur_server.src.db.tables import FSItem


class Filelike(BaseModel):
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
            "name": fsitem.name,
            "creation_time": fsitem.timestamp,
            "fullpath": fullpath.as_posix(),
        }


class File(Filelike):
    type: Literal["file"] = "file"

    size: int
    "Size of the file in bytes"

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
