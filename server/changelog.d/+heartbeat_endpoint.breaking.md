💥 Removed heartbeat endpoint (`/api/well-known/heartbeat`)

- We removed this endpoint as its use is no longer necessary. We assume that the client will be able to discern whether they are still connected to the server by observing the responses to the requests made to the server
- Accordingly, the default template value of the `logging.no_log_endpoints` configuration option was updated to remove this endpoint
