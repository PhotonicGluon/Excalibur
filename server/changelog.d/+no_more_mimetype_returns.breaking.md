💥 The `File` type no longer returns a `mimetype` value; it is up to the client to derive the MIME type of the file. This affects the following endpoints:

- `/api/files/search` (which returns a list of file-score pairs)
- `/api/files/list/{path}` (which returns a list of files or directories)
