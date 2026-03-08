🔒️ Amended some POST requests to have their bodies encrypted

- Specifically, the `/api/files/mkdir`, `/api/files/move`, and `/api/files/rename` endpoints used to send their POST bodies in the clear. Now they are encrypted using the shared end-to-end encryption key
