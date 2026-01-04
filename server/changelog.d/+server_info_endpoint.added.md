Added a new server info endpoint at `/api/well-known/info` which returns the following information:

- `version`: SemVer of the server
- `max_upload_size`: Maximum allowed file size in bytes
- `time`: ISO 8601 string of the server's current time
