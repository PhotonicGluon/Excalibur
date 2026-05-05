💥 The `File` and `Directory` types now return a `creation_time` field representing the creation timestamp of the item. This affects the following endpoints:

- `/api/files/search` (which returns a list of file-score pairs)
- `/api/files/list/{path}` (which returns a list of files or directories)
