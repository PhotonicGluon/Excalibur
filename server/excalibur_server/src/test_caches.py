import shelve

import pytest

from .caches import PersistentTTLCache, TTLCache


class MockTimer:
    """A helper to simulate the passage of time."""

    def __init__(self, start_time: float = 0.0):
        self.current_time = start_time

    def __call__(self) -> float:
        return self.current_time

    def advance(self, seconds: float):
        self.current_time += seconds


@pytest.fixture
def timer() -> MockTimer:
    return MockTimer()


class TestTTLCache:
    def test_set_and_get(self, timer: MockTimer):
        cache = TTLCache(maxsize=2, ttl=10, timer=timer)
        cache["a"] = 1
        assert cache["a"] == 1
        assert len(cache) == 1

    def test_lru_eviction(self, timer: MockTimer):
        # Max size 2. Add 3 items. The first one should be evicted.
        cache = TTLCache(maxsize=2, ttl=10, timer=timer)
        cache["a"] = 1
        cache["b"] = 2
        cache["c"] = 3  # This should trigger prune and remove "a"

        assert "a" not in cache
        assert "b" in cache
        assert "c" in cache
        assert len(cache) == 2

    def test_ttl_expiration_get(self, timer: MockTimer):
        cache = TTLCache(maxsize=2, ttl=5, timer=timer)
        cache["a"] = 1

        timer.advance(6)  # Past the 5s TTL

        with pytest.raises(KeyError):
            _ = cache["a"]
        assert "a" not in cache

    def test_contains_ignores_expired(self, timer: MockTimer):
        cache = TTLCache(maxsize=2, ttl=5, timer=timer)
        cache["a"] = 1

        timer.advance(6)
        assert "a" not in cache  # __contains__ should return False for expired items

    def test_get_updates_lru_order(self, timer: MockTimer):
        cache = TTLCache(maxsize=2, ttl=10, timer=timer)
        cache["a"] = 1
        cache["b"] = 2

        # Access "a", making it the most recently used
        _ = cache["a"]

        # Add "c", which should evict "b" (the least recently used)
        cache["c"] = 3

        assert "a" in cache
        assert "c" in cache
        assert "b" not in cache

    def test_prune_on_set(self, timer: MockTimer):
        cache = TTLCache(maxsize=10, ttl=5, timer=timer)
        cache["a"] = 1

        timer.advance(6)
        # Setting a new item should trigger _prune and remove expired "a"
        cache["b"] = 2

        # We check the internal dict to ensure 'a' is physically removed
        assert "a" not in cache._cache
        assert len(cache) == 1

    def test_keys_triggers_prune(self, timer: MockTimer):
        cache = TTLCache(maxsize=10, ttl=5, timer=timer)
        cache["a"] = 1
        cache["b"] = 2

        timer.advance(6)
        # .keys() calls _prune()
        remaining_keys = cache.keys()

        assert len(remaining_keys) == 0
        assert len(cache) == 0

    def test_delitem(self, timer: MockTimer):
        cache = TTLCache(maxsize=2, ttl=10, timer=timer)
        cache["a"] = 1
        del cache["a"]
        assert "a" not in cache
        assert len(cache) == 0

    def test_clear(self, timer: MockTimer):
        cache = TTLCache(maxsize=2, ttl=10, timer=timer)
        cache["a"] = 1
        cache["b"] = 2
        cache.clear()
        assert len(cache) == 0
        assert "a" not in cache

    def test_update_existing_key_refreshes_ttl(self, timer: MockTimer):
        cache = TTLCache(maxsize=2, ttl=5, timer=timer)
        cache["a"] = 1

        timer.advance(3)
        cache["a"] = 10  # Update at t=3. New expiry should be 3 + 5 = 8

        timer.advance(3)  # Total time t=6
        # Original expiry was 5, but updated expiry is 8. Should still exist.
        assert cache["a"] == 10

        timer.advance(3)  # Total time t=9
        assert "a" not in cache


class TestPersistentTTLCache:
    @pytest.fixture
    def cache_file(self, tmp_path) -> str:
        return str(tmp_path / "test.cache")

    def test_persistence_between_instances(self, cache_file: str, timer: MockTimer):
        # Create cache and save data
        cache1 = PersistentTTLCache(maxsize=10, ttl=60, filename=cache_file, timer=timer)
        cache1["key1"] = "value1"
        cache1["key2"] = "value2"

        # Create a new instance pointing to the same file
        cache2 = PersistentTTLCache(maxsize=10, ttl=60, filename=cache_file, timer=timer)

        assert "key1" in cache2
        assert "key2" in cache2
        assert cache2["key1"] == "value1"
        assert len(cache2) == 2

    def test_expiration_on_load(self, cache_file: str, timer: MockTimer):
        cache1 = PersistentTTLCache(maxsize=10, ttl=10, filename=cache_file, timer=timer)
        cache1["active"] = "i_live"
        cache1["expired"] = "i_die"

        # Advance timer so "expired" is past TTL, but "active" is refreshed
        timer.advance(6)
        cache1["active"] = "i_live_longer"  # Resets TTL for 'active'

        timer.advance(6)
        # Total time elapsed: 12
        # - 'expired' (t=0) expires at 10
        # - 'active' (t=6) expires at 16

        # Create new instance; _load_from_disk should prune 'expired'
        cache2 = PersistentTTLCache(maxsize=10, ttl=10, filename=cache_file, timer=timer)

        assert "active" in cache2
        assert "expired" not in cache2
        assert len(cache2) == 1

    def test_deletion_persistence(self, cache_file: str, timer: MockTimer):
        cache = PersistentTTLCache(maxsize=10, ttl=60, filename=cache_file, timer=timer)
        cache["key1"] = "value1"
        del cache["key1"]

        # Reload to verify
        new_cache = PersistentTTLCache(maxsize=10, ttl=60, filename=cache_file, timer=timer)
        assert "key1" not in new_cache

    def test_lru_order_restoration(self, cache_file: str, timer: MockTimer):
        cache = PersistentTTLCache(maxsize=2, ttl=60, filename=cache_file, timer=timer)
        cache["oldest"] = 1
        timer.advance(1)
        cache["newest"] = 2

        # Reload
        new_cache = PersistentTTLCache(maxsize=2, ttl=60, filename=cache_file, timer=timer)

        # Add a 3rd item to trigger LRU eviction
        new_cache["latest"] = 3

        # If order was preserved, 'oldest' should be evicted first
        assert "oldest" not in new_cache
        assert "newest" in new_cache
        assert "latest" in new_cache

    def test_corrupt_data_handling(self, cache_file: str, timer: MockTimer):
        # Manually inject bad data into the shelf
        with shelve.open(cache_file) as db:
            db["good_key"] = ("good_val", timer() + 100)
            db["bad_key"] = "bad data, not a tuple, should fail"

        # Should not crash during init
        cache = PersistentTTLCache(maxsize=10, ttl=60, filename=cache_file, timer=timer)

        assert "good_key" in cache
        assert "bad_key" not in cache

    def test_clear_persistence(self, cache_file: str, timer: MockTimer):
        cache = PersistentTTLCache(maxsize=10, ttl=60, filename=cache_file, timer=timer)
        cache["a"] = 1
        cache.clear()

        new_cache = PersistentTTLCache(maxsize=10, ttl=60, filename=cache_file, timer=timer)
        assert len(new_cache) == 0
