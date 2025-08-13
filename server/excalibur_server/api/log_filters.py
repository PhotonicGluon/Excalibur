import logging


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
