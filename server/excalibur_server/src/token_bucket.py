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

    def _get_sub_bucket(self, client_id: str) -> SubBucket:
        """
        Gets the sub-bucket for the given client ID.

        :param client_id: the ID of the client
        :return: the sub-bucket for the client
        """

        return self._sub_buckets.get(
            client_id,
            SubBucket(tokens=self.capacity, last_refill=time.time()),
        )

    def _refill(self, bucket: SubBucket) -> SubBucket:
        """
        Refills the bucket.

        :param bucket: the bucket to refill
        :return: the refilled bucket
        """

        now = time.time()
        time_since_refill = now - bucket.last_refill
        tokens_to_add = time_since_refill * self.refill_rate
        bucket.tokens = min(self.capacity, bucket.tokens + tokens_to_add)
        bucket.last_refill = now
        return bucket

    def consume(self, client_id: str) -> bool:
        """
        Consumes a token from the bucket.

        :param client_id: the ID of the client
        :return: True if a token was consumed, False otherwise
        """

        bucket = self._get_sub_bucket(client_id)
        bucket = self._refill(bucket)

        # Consume a token if available
        available = False
        if bucket.tokens >= 1:
            available = True
            bucket.tokens -= 1

        self._sub_buckets[client_id] = bucket
        return available

    def refund(self, client_id: str, count: int = 1) -> None:
        """
        Refunds a token to the bucket.

        :param client_id: the ID of the client
        :param count: the number of tokens to refund
        """

        bucket = self._get_sub_bucket(client_id)
        bucket = self._refill(bucket)

        bucket.tokens = min(self.capacity, bucket.tokens + count)
        self._sub_buckets[client_id] = bucket
