Changed behaviour for invalid path of directory name in the directory creation endpoint
- It now returns `406 Not Acceptable` instead of `400 Bad Request` if the directory name is invalid
