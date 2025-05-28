from typing import Literal, Union
from pydantic import BaseModel, model_serializer


class Filelike(BaseModel):
    name: str
    "Name of file"

    fullpath: str
    "Path to the file from the root directory"


class File(Filelike):
    type: Literal["file"] = "file"

    size: int
    "Size of the file in bytes"

    mimetype: str
    "MIME type of the file"


class Directory(Filelike):
    type: Literal["directory"] = "directory"

    items: list[Union[File, "Directory"]] | None = None
    "List of filelike instances in the directory"
