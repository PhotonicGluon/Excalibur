💥 Certain endpoints' response _content_ have been removed as their response _codes_ sufficiently indicate the success/failure of the operation. In particular, these endpoints now no longer return any content for the `200 OK` status code:

- `/api/files/move` (previously returned `Item Moved`)
- `/api/files/mkdir/{path}` (previously returned `Directory created`)
- `/api/files/rename/{path}` (previously returned `Item renamed`)
- `/api/files/upload/{path}` (previously returned `File uploaded`)
