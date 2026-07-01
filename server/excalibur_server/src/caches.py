import shelve
import time
from collections import OrderedDict
from typing import Callable, Iterator, Mapping, TypeVar

_KT = TypeVar("_KT")
_VT = TypeVar("_VT")


class TTLCache(Mapping[_KT, _VT]):
    """
    LRU Cache implementation with per-item time-to-live (TTL) value.
    """

    def __init__(self, maxsize: int, ttl: int, timer: Callable[[], float] = time.time):
        """
        Constructor.

        :param maxsize: Maximum size of the cache
        :param ttl: Time to live in seconds
        :param timer: Timer function to use for expiration checks
        """

        self.maxsize = maxsize
        self.ttl = ttl
        self._timer = timer
        self._cache: OrderedDict[_KT, tuple[_VT, float]] = OrderedDict()

    # Magic methods
    def __iter__(self) -> Iterator[_KT]:
        return iter(self._cache)

    def __len__(self) -> int:
        return len(self._cache)

    def __contains__(self, key: _KT) -> bool:
        if key not in self._cache:
            return False

        # If key expired, pretend it doesn't exist (clean up later)
        _, expires_at = self._cache[key]
        if self._timer() > expires_at:
            return False

        return True

    def __getitem__(self, key: _KT) -> _VT:
        if key not in self._cache:
            raise KeyError(key)

        value, expires_at = self._cache[key]

        if self._timer() > expires_at:
            # Remove expired item and report non-existence
            del self[key]
            raise KeyError(key)

        self._cache.move_to_end(key)  # Update LRU
        return value

    def __setitem__(self, key: _KT, value: _VT):
        # Calculate absolute expiration time
        expires_at = self._timer() + self.ttl

        # Update/Insert into cache
        if key in self._cache:
            self._cache.move_to_end(key)
        self._cache[key] = (value, expires_at)

        # Enforce size limit
        self.__prune()

    def __delitem__(self, key: _KT):
        del self._cache[key]

    # Private methods
    def __prune(self):
        """
        Removes expired items first. If still over maxsize, removes the Least Recently Used (oldest)
        item.
        """

        now = self._timer()

        # Cleanup expired items
        keys_to_expire = [k for k, (_v, t) in self._cache.items() if t < now]
        for k in keys_to_expire:
            del self[k]  # Calls internal __delitem__

        # If still too big, clean up using LRU
        while len(self._cache) > self.maxsize:
            self._cache.popitem(last=False)  # Remove first item (i.e., least recently used item)

    # Public methods
    def keys(self):
        # We can prune here since `keys()` is already ~O(N)
        self.__prune()
        return self._cache.keys()

    def pop(self, key: _KT, default: _VT | None = None) -> _VT | None:
        # We do not prune here to maintain the ~O(1) time complexity
        (value, expiry) = self._cache.pop(key, (None, 0))
        if value is None or self._timer() > expiry:
            return default
        return value

    def clear(self):
        self._cache.clear()


class PersistentTTLCache(TTLCache[_KT, _VT]):
    """
    LRU Cache implementation with per-item time-to-live (TTL) value and persistent storage.
    """

    def __init__(self, maxsize: int, ttl: int, filename: str, timer: Callable[[], float] = time.time):
        """
        Constructor.

        :param maxsize: Maximum number of items to store in the cache
        :param ttl: Time-to-live in seconds for each item
        :param filename: Filename for persistent storage
        :param timer: Timer function to use for expiration checks
        """

        super().__init__(maxsize, ttl, timer)

        self.filename = filename
        self.__load_from_disk()

    # Magic methods
    def __setitem__(self, key, value):
        super().__setitem__(key, value)

        stored_entry = self._cache[key]
        with shelve.open(self.filename) as db:
            db[str(key)] = stored_entry

    def __delitem__(self, key):
        super().__delitem__(key)

        with shelve.open(self.filename) as db:
            k_str = str(key)
            if k_str in db:
                del db[k_str]

    # Private methods
    def __load_from_disk(self):
        """
        Load cache from file, removing any expired items and maintaining the expiry time of other
        items.
        """

        now = self._timer()

        # Load existing data, cleaning up as necessary
        loaded_items = []
        with shelve.open(self.filename) as db:
            keys_to_delete = []
            for k_str in db:
                try:
                    value, expires_at = db[k_str]
                    if now > expires_at:
                        keys_to_delete.append(k_str)
                    else:
                        # We assume keys were strings
                        loaded_items.append((k_str, value, expires_at))
                except ValueError:
                    # Data corrupt; delete the key
                    keys_to_delete.append(k_str)

            for k in keys_to_delete:
                del db[k]

        # Load valid into memory, sorted by expiration time (approximates the LRU order)
        loaded_items.sort(key=lambda x: x[2])

        # Insert items into memory cache
        for k, v, t in loaded_items:
            self._cache[k] = (v, t)  # Direct insert to keep expiration time

    # Public methods
    def pop(self, key: _KT, default: _VT | None = None) -> _VT | None:
        value = super().pop(key, default)
        with shelve.open(self.filename) as db:
            k_str = str(key)
            if k_str in db:
                del db[k_str]
        return value

    def clear(self):
        super().clear()
        with shelve.open(self.filename) as db:
            db.clear()
