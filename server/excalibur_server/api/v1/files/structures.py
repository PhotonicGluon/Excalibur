from typing import Literal, Union

from pydantic import BaseModel


class Filelike(BaseModel):
    name: str
    "Name of item"

    fullpath: str
    "Path to the item from the root directory"


class File(Filelike):
    type: Literal["file"] = "file"

    size: int
    "Size of the file in bytes"

    mimetype: str | None
    "MIME type of the file, or None if unknown"


class Directory(Filelike):
    type: Literal["directory"] = "directory"

    items: list[Union[File, "Directory"]] | None = None
    "List of filelike instances in the directory"
