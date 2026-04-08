✨ Implemented a new database-backed file management system, moving away from relying on operating-system file management

- Folders are now "logical" and not tied to actual directories on the filesystem
- Files' names are now stored in the database instead of on the filesystem
- Files are now stored in a single directory on the filesystem, with their database ID as the filename
