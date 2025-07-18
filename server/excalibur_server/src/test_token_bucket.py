import time

import pytest

from .token_bucket import TokenBucket


@pytest.fixture
def bucket():
    """
    Provides a standard TokenBucket instance for tests.
    """

    return TokenBucket(capacity=5, refill_rate=5)


def test_initial_consumption(bucket: TokenBucket):
    """
    Test that a new client can consume a token immediately.
    """

    assert bucket.consume("client-1") is True, "First consumption should be allowed"


def test_burst_consumption_up_to_capacity(bucket: TokenBucket):
    """
    Test that a client can make a burst of requests up to the bucket's capacity.
    """

    client_id = "client-burst"

    # Consume all 5 tokens in the bucket
    for _ in range(5):
        assert bucket.consume(client_id) is True, "Should be able to consume tokens up to capacity"


def test_depletion_and_rejection(bucket: TokenBucket):
    """
    Test that requests are rejected after the bucket is depleted.
    """

    client_id = "client-depleted"

    # Consume all available tokens
    for _ in range(5):
        bucket.consume(client_id)

    # The next request should be rejected
    assert bucket.consume(client_id) is False, "Should reject request when bucket is empty"


def test_token_refill(bucket: TokenBucket):
    """
    Test that tokens are correctly refilled over time.
    """

    client_id = "client-refill"

    # Empty the bucket
    for _ in range(5):
        assert bucket.consume(client_id) is True

    # The next request should fail
    assert bucket.consume(client_id) is False

    # Wait for 0.4 seconds to refill 2 tokens (refill_rate is 5 tokens/second)
    time.sleep(0.4)

    # Now, two more requests should be successful
    assert bucket.consume(client_id) is True, "First token after refill should be consumable"
    assert bucket.consume(client_id) is True, "Second token after refill should be consumable"
    # The third request should fail
    assert bucket.consume(client_id) is False, "Should fail after consuming refilled tokens"


def test_bucket_does_not_overflow_capacity(bucket: TokenBucket):
    """
    Test that the number of tokens never exceeds the bucket's capacity.
    """

    client_id = "client-overflow"

    # Consume one token to establish a state
    assert bucket.consume(client_id) is True
    assert bucket._sub_buckets[client_id].tokens == 4

    # Wait for 1.1 seconds, which is more than enough to fully refill the bucket
    time.sleep(1.1)

    # Try to consume one token. This will trigger the refill logic first.
    assert bucket.consume(client_id) is True

    # After consumption, the bucket should have `capacity - 1` tokens,
    # proving it was capped at 5 and not `4 + 10`.
    assert bucket._sub_buckets[client_id].tokens == (bucket.capacity - 1)


def test_multiple_clients_are_isolated():
    """
    Test that different clients are rate-limited independently.
    """

    bucket = TokenBucket(capacity=2, refill_rate=1)
    client_a = "client-a"
    client_b = "client-b"

    # Client A consumes both its tokens
    assert bucket.consume(client_a) is True
    assert bucket.consume(client_a) is True
    assert bucket.consume(client_a) is False, "Client A should be rate limited"

    # Client B should still have its full bucket and be able to make requests
    assert bucket.consume(client_b) is True, "Client B should not be affected by Client A"
    assert bucket.consume(client_b) is True, "Client B should be able to consume its tokens"
    assert bucket.consume(client_b) is False, "Client B should now be rate limited"
