import logging
import time

from excalibur_server.src.config import CONFIG


# Create endpoint filter
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


# Add endpoint filter to access logger
uvicorn_access_logger = logging.getLogger("uvicorn.access")
uvicorn_access_logger.addFilter(EndpointFilter(excluded_endpoints=CONFIG.api.logging.no_log))

# Define main logger
logger = logging.getLogger("uvicorn.error")

# Configure logging to file
file_handler = logging.FileHandler(CONFIG.api.logging.logs_dir / f"{int(time.time())}.log", mode="a", encoding="utf-8")
file_handler.setFormatter(logging.Formatter(CONFIG.api.logging.file_format))

logger.addHandler(file_handler)
uvicorn_access_logger.addHandler(file_handler)
