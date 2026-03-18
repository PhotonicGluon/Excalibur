from abc import ABC, abstractmethod
from math import ceil, log2
from typing import Self

from Crypto.Random import get_random_bytes


class BaseCurve(ABC):
    """
    Implementation of the abstract Elliptic Curve group from
    [RFC9496](https://www.rfc-editor.org/rfc/rfc9496).
    """

    @property
    @abstractmethod
    def P(self) -> int:
        """The prime modulus for the specific elliptic curve field."""
        pass

    @property
    @abstractmethod
    def ORDER(self) -> int:
        """The order of the elliptic curve group."""
        pass

    @property
    @abstractmethod
    def GENERATOR(self) -> Self:
        """The generator point for the specific elliptic curve group."""
        pass

    @property
    @abstractmethod
    def KEY_LENGTH(self) -> int:
        """The key length for the specific elliptic curve group, in bytes."""
        pass

    @property
    @abstractmethod
    def D(self) -> int:
        """The D parameter for the specific elliptic curve group."""
        pass

    def __init__(self, x: int, y: int, z: int, t: int):
        """
        Initializes a point with the given coordinates.

        :param x: The x-coordinate of the point
        :param y: The y-coordinate of the point
        :param z: The z-coordinate of the point
        :param t: The t-coordinate of the point
        """

        self.x = x % self.P
        self.y = y % self.P
        self.z = z % self.P
        self.t = t % self.P

    @property
    def IDENTITY(self) -> Self:
        return self.__class__(0, 1, 1, 0)

    # Magic methods
    def __neg__(self) -> Self:
        return self.__class__(((-self.x) % self.P, self.y, self.z, (-self.t) % self.P))

    def __add__(self, other: Self) -> Self:
        if self.P != other.P or self.D != other.D:
            raise ValueError("Points must be on the same curve")

        x1, y1, z1, t1 = self.x, self.y, self.z, self.t
        x2, y2, z2, t2 = other.x, other.y, other.z, other.t

        a = (x1 * x2) % self.P
        b = (y1 * y2) % self.P
        c = (self.D * t1 * t2) % self.P
        d = (z1 * z2) % self.P

        e = ((x1 + y1) * (x2 + y2) - a - b) % self.P
        f = (d - c) % self.P
        g = (d + c) % self.P
        h = self._add_h(a, b) % self.P  # Depends on the curve

        x3 = (e * f) % self.P
        y3 = (g * h) % self.P
        t3 = (e * h) % self.P
        z3 = (f * g) % self.P

        return self.__class__(x3, y3, z3, t3)

    def __sub__(self, other: Self) -> Self:
        return self + (-other)

    def __mul__(self, scalar: int) -> Self:
        scalar = scalar % self.ORDER  # See section 4.4

        result = self.IDENTITY
        current = self
        while scalar > 0:
            if scalar & 1:
                result = result + current
            current = current + current
            scalar >>= 1

        return result

    def __rmul__(self, scalar: int) -> Self:
        return self.__mul__(scalar)

    @abstractmethod
    def __eq__(self, other: Self) -> bool:
        raise NotImplementedError("__eq__ must be implemented by subclass")

    # Helper methods
    @abstractmethod
    def _add_h(self, a: int, b: int) -> int:
        """
        The `h` value calculation during addition.
        """

        raise NotImplementedError("_add_h must be implemented by subclass")

    @classmethod
    def _is_negative(cls, e: int) -> bool:
        """
        Checks if an element is "negative" according to section 3.1 of
        [RFC8032](https://www.rfc-editor.org/rfc/inline-errata/rfc8032.html). That is,
        this function returns `True` if the least nonnegative integer representing `e` is odd,
        and `False` if it is even.
        """

        return ((e % cls.P) & 1) == 1

    @classmethod
    def _ct_abs(cls, u: int) -> int:
        """
        Constant-time absolute value of an element in GF(P), as suggested in section 2.2.

        :param u: an element to take the absolute value of
        :returns: the absolute value of u in GF(P)
        """

        u = u % cls.P
        return (-u) % cls.P if cls._is_negative(u) else u

    @classmethod
    @abstractmethod
    def _sqrt_ratio_m1(cls, u: int, v: int) -> tuple[bool, int]:
        raise NotImplementedError("_sqrt_ratio_m1 must be implemented by subclass")

    @classmethod
    @abstractmethod
    def _map_function(cls, b: bytes) -> Self:
        raise NotImplementedError("_map_function must be implemented by subclass")

    # Public methods
    def is_identity(self) -> bool:
        """
        :returns: whether the current point is the identity point
        """

        return self == self.IDENTITY

    @classmethod
    def random_scalar(cls) -> int:
        """
        Generates a random scalar for the curve, using RFC9497 section 4.7.2.

        :returns: a random scalar in GF(P)
        """

        # To ensure a uniform distribution we generate a random sequence and reduce it modulo the group order
        random_bytes = get_random_bytes(ceil(((3 * ceil(log2(cls.ORDER))) / 2) / 8))
        return int.from_bytes(random_bytes, byteorder="little") % cls.ORDER

    @classmethod
    def scalar_inverse(cls, scalar: int) -> int:
        """
        Computes the multiplicative inverse of a scalar in the finite field GF(P).

        :param scalar: the scalar to invert
        :returns: the multiplicative inverse of the scalar
        """

        return pow(scalar, -1, cls.ORDER)

    @classmethod
    @abstractmethod
    def from_bytes(cls, b: bytes) -> Self:
        raise NotImplementedError("from_bytes must be implemented by subclass")

    @abstractmethod
    def to_bytes(self) -> bytes:
        raise NotImplementedError("to_bytes must be implemented by subclass")

    @classmethod
    def derive(cls, b: bytes) -> Self:
        """
        Derives a point on the curve from a `KEY_LENGTH`-byte string.

        :param b: a `KEY_LENGTH`-byte string
        :returns: a point on the curve
        """

        return cls._map_function(b[0 : cls.KEY_LENGTH]) + cls._map_function(b[cls.KEY_LENGTH : 2 * cls.KEY_LENGTH])
