import time
from dataclasses import dataclass


@dataclass
class SubBucket:
    """
    Contents of a sub-bucket.
    """

    tokens: int
    "Number of tokens still available in the bucket"
    last_refill: float
    "Timestamp of the last refill"


class TokenBucket:
    """
    A token bucket for rate limiting.
    """

    def __init__(self, capacity: int, refill_rate: float):
        """
        Initializes the token bucket.

        :param capacity: the maximum number of tokens in the bucket
        :param refill_rate: the number of tokens added per second
        """

        self.capacity = capacity
        self.refill_rate = refill_rate
        self._sub_buckets: dict[str, SubBucket] = {}  # TODO: Migrate to Redis or another shared storage?

    def consume(self, client_id: str) -> bool:
        """
        Consumes a token from the bucket.

        :param client_id: the ID of the client
        :return: True if a token was consumed, False otherwise
        """

        now = time.time()
        bucket = self._sub_buckets.get(client_id, SubBucket(tokens=self.capacity, last_refill=now))

        # Refill tokens
        time_since_refill = now - bucket.last_refill
        tokens_to_add = time_since_refill * self.refill_rate
        bucket.tokens = min(self.capacity, bucket.tokens + tokens_to_add)
        bucket.last_refill = now

        # Consume a token if available
        self._sub_buckets[client_id] = bucket
        if bucket.tokens >= 1:
            bucket.tokens -= 1
            return True
        return False
