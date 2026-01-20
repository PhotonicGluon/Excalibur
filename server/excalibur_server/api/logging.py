import logging
import time

from excalibur_server.env import has_log_to_console, has_log_to_file
from excalibur_server.src.config import CONFIG


# Create filters
class EndpointFilter(logging.Filter):
    """
    Filter out log records containing specific endpoints.
    """

    def __init__(self, excluded_endpoints: list[str] = ..., name: str = "") -> None:
        """
        Constructor

        :param excluded_endpoints: List of endpoints to exclude from logging
        :param name: Name of the filter
        """

        super().__init__(name)
        self.excluded_endpoints = excluded_endpoints

    def filter(self, record: logging.LogRecord) -> bool:
        """
        Filter out log records containing specific endpoints.

        :param record: Log record to filter
        :return: True if the log record should be included, False otherwise
        """

        log_message = record.getMessage()

        for endpoint in self.excluded_endpoints:
            if endpoint in log_message:
                return False

        return True


class WebSocketLogFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        """
        Filter out log records containing specific endpoints.

        :param record: Log record to filter
        :return: True if the log record should be included, False otherwise
        """

        log_message = record.getMessage()
        if "WebSocket" in log_message or log_message in {"connection open", "connection closed"}:
            return False

        if record.levelno == logging.DEBUG and log_message[0] in {"<", "=", ">", "x", "%"}:
            return False

        return True


# Add endpoint filter to access logger
uvicorn_access_logger = logging.getLogger("uvicorn.access")
uvicorn_access_logger.addFilter(EndpointFilter(excluded_endpoints=CONFIG.logging.no_log_endpoints))

# Configure logging to console
if not has_log_to_console():
    handlers = uvicorn_access_logger.handlers
    for handler in handlers:
        if not isinstance(handler, logging.StreamHandler):
            continue

        uvicorn_access_logger.removeHandler(handler)

# Configure main logger
uvicorn_main_logger = logging.getLogger("uvicorn.error")
uvicorn_main_logger.addFilter(WebSocketLogFilter())

# Configure logging to file
if has_log_to_file():
    file_handler = logging.FileHandler(CONFIG.logging.directory / f"{int(time.time())}.log", mode="a", encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter(CONFIG.logging.format.file))

    uvicorn_main_logger.addHandler(file_handler)
    uvicorn_access_logger.addHandler(file_handler)

# Set our main logger
logger = uvicorn_main_logger
