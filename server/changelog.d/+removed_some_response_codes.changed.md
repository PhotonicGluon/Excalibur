🗑️ The following endpoints no longer return the corresponding response codes:

- `/api/files/download/{path}`: Removed `406 Not Acceptable`, corresponding to an "Illegal or invalid path"
- `/api/files/upload/{path}`: Removed
  - `406 Not Acceptable`, corresponding to an "Illegal or invalid path"
  - `414 URI Too Long`, corresponding to a file path that is too long
- `/api/files/mkdir/{path}`: Removed
  - `406 Not Acceptable`, corresponding to an "Illegal or invalid path"
  - `414 URI Too Long`, corresponding to a directory path that is too long
- `/api/files/list/{path}`: Removed `406 Not Acceptable`, corresponding to an "Illegal or invalid path"
- `/api/files/check/path/{path}`: Removed
  - `406 Not Acceptable`, corresponding to an "Illegal or invalid path"
  - `414 URI Too Long`, corresponding to a directory path that is too long
- `/api/files/check/dir/{path}`: Removed `406 Not Acceptable`, corresponding to an "Illegal or invalid path"
- `/api/files/delete/{path}`: Removed `406 Not Acceptable`, corresponding to an "Illegal or invalid path"
- `/api/files/move/{path}`: Removed
  - `406 Not Acceptable`, corresponding to an "Illegal or invalid path"
  - `414 URI Too Long`, corresponding to a path that is too long
- `/api/files/rename/{path}`: Removed
  - `406 Not Acceptable`, corresponding to an "Illegal or invalid path", replacing it with `400 Bad Request` corresponding to an "Illegal or invalid name"
  - `414 URI Too Long`, corresponding to a path that is too long

The documentation has been updated to reflect these changes.
