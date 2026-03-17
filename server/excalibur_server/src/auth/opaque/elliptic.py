import base64
from abc import ABC, abstractmethod
from math import ceil, log2
from typing import Self

from Crypto.Random import get_random_bytes


class EllipticPoint(ABC):
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
        h = (b - a) % self.P

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


class Decaf448(EllipticPoint):
    """
    Implementation of the Decaf448 group from [RFC9496](https://www.rfc-editor.org/rfc/rfc9496),
    section 5.
    """

    P = 2**448 - 2**224 - 1  # See section 2
    ORDER = 2**446 - 13818066809895115352007386748515426880336692474882178609894547503885  # `l` in Section 5

    # Constants taken from Section 5.1
    # fmt: off
    D = \
        726838724295606890549323807888004534353641360687318060281490199180612328166730772686396383698676545930088884461843637361053498018326358
    ONE_MINUS_D = 39082
    ONE_MINUS_TWO_D = 78163
    SQRT_MINUS_D = \
        98944233647732219769177004876929019128417576295529901074099889598043702116001257856802131563896515373927712232092845883226922417596214
    INVSQRT_MINUS_D = \
        315019913931389607337177038330951043522456072897266928557328499619017160722351061360252776265186336876723201881398623946864393857820716
    # fmt: on

    # Magic methods
    def __eq__(self, other: Self) -> bool:
        """
        Checks equality between two points, as given by section 5.3.3.

        :param other: the other point to compare with
        :returns: `True` if the points are equal and `False` otherwise
        """

        return (self.x * other.y) % self.P == (self.y * other.x) % self.P

    # Helper methods
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
    def _sqrt_ratio_m1(cls, u: int, v: int) -> tuple[bool, int]:
        """
        The `SQRT_RATIO_M1` function from section 5.2.

        :param u: The numerator
        :param v: The denominator
        :returns: a tuple of two elements. The first is a boolean indicating whether `u/v` is a
            square in the field GF(P). The second depends:
            - `+sqrt(u/v)` if `u` and `v` are nonzero and `u/v` is square in the field
            - `0` if `u = 0`
            - `0` if `v = 0` and `u != 0`
            - `+sqrt(-u/v)` if `u` and `v` are nonzero and `u/v` is non-square in the field
        """

        u = u % cls.P
        v = v % cls.P

        r = u * pow(u * v, ((cls.P - 3) // 4), cls.P)  # Note: (p - 3) / 4 is an integer

        check = (v * r * r) % cls.P
        was_square = check == u

        # Choose the non-negative square root
        r = cls._ct_abs(r)

        return (was_square, r)

    @classmethod
    def _map_function(cls, b: bytes) -> Self:
        """
        Maps a 56-byte string to a point on the Decaf448 curve, following section 5.3.4's `MAP`
        function.

        :param b: a 56-byte string
        :returns: a point on the Decaf448 curve
        """

        # Step 1
        r = int.from_bytes(b, "little")
        t = r % cls.P

        # Step 2
        r = (-pow(t, 2, cls.P)) % cls.P
        u0 = (cls.D * (r - 1)) % cls.P
        u1 = ((u0 + 1) * (u0 - r)) % cls.P

        (was_square, v) = cls._sqrt_ratio_m1(cls.ONE_MINUS_TWO_D, (r + 1) * u1)
        v_prime = (v if was_square else t * v) % cls.P
        sgn = (1 if was_square else -1) % cls.P
        s = v_prime * (r + 1)
        ss = pow(s, 2, cls.P)

        w0 = (2 * cls._ct_abs(s)) % cls.P
        w1 = (ss + 1) % cls.P
        w2 = (ss - 1) % cls.P
        w3 = (v_prime * s * (r - 1) * cls.ONE_MINUS_TWO_D + sgn) % cls.P

        # Step 3
        return cls(w0 * w3, w2 * w1, w1 * w3, w0 * w2)

    # Public methods
    @classmethod
    def from_bytes(cls, b: bytes) -> Self:
        """
        Decodes a 56-byte string as a field element, following section 5.3.1.

        :param b: 56-byte string
        :returns: a point on the Decaf448 curve
        :raises ValueError: if data is not 56 bytes or if the data is invalid
        """

        # Step 1
        if len(b) != 56:
            raise ValueError("data must be 56 bytes long")

        s = int.from_bytes(b, byteorder="little")
        if s >= cls.P:
            raise ValueError("s must be less than P")

        # Step 2
        if cls._is_negative(s):
            raise ValueError("s must be non-negative")

        # Step 3
        ss = pow(s, 2, cls.P)
        u1 = (1 + ss) % cls.P

        u2 = (pow(u1, 2, cls.P) - 4 * cls.D * ss) % cls.P

        (was_square, invsqrt) = cls._sqrt_ratio_m1(1, u2 * pow(u1, 2, cls.P))

        u3 = cls._ct_abs(2 * s * invsqrt * u1 * cls.SQRT_MINUS_D)

        x = (u3 * invsqrt * u2 * cls.INVSQRT_MINUS_D) % cls.P
        y = ((1 - ss) * invsqrt * u1) % cls.P
        t = (x * y) % cls.P

        # Step 4
        if not was_square:
            raise ValueError("invalid encoding")

        return cls(x, y, 1, t)

    def to_bytes(self) -> bytes:
        """
        Encodes this point on the Decaf448 curve as a 56-byte string, following section 5.3.2.

        :returns: a 56-byte string representing this point
        """

        x0 = self.x % self.P
        z0 = self.z % self.P
        t0 = self.t % self.P

        # Step 1
        u1 = (x0 + t0) * (x0 - t0)

        # Ignore was_square since this is always square.
        (_, invsqrt) = self._sqrt_ratio_m1(1, u1 * self.ONE_MINUS_D * pow(x0, 2, self.P))

        ratio = self._ct_abs(invsqrt * u1 * self.SQRT_MINUS_D)
        u2 = (self.INVSQRT_MINUS_D * ratio * z0 - t0) % self.P
        s = self._ct_abs(self.ONE_MINUS_D * invsqrt * x0 * u2)

        # Step 2
        return s.to_bytes(56, "little")

    @classmethod
    def derive(cls, b: bytes) -> Self:
        """
        Derives a point on the Decaf448 curve from a 112-byte string, following section 5.3.4.

        :param b: a 112-byte string
        :returns: a point on the Decaf448 curve
        """

        return cls._map_function(b[0:56]) + cls._map_function(b[56:112])


GENERATOR = Decaf448.from_bytes(
    bytes.fromhex(
        "6666666666666666666666666666666666666666666666666666666633333333333333333333333333333333333333333333333333333333"
    )  # See Section 5
)


class Decaf448ECC:
    """
    Implementation of elliptic curve cryptography (ECC) operations using the Decaf448 curve from
    [RFC9496](https://www.rfc-editor.org/rfc/rfc9496).
    """

    def __init__(self, private_key_bytes: bytes = None):
        """
        Initializes a new Decaf448 instance.

        :param private_key_bytes: the private key as bytes, which must be 56 bytes long. If not
            provided, a secure random key is generated
        """

        if private_key_bytes is None:
            scalar = Decaf448.random_scalar()

            self._private_key = scalar.to_bytes(56, byteorder="little")
            self._scalar = scalar
        else:
            if len(private_key_bytes) != 56:
                raise ValueError("Private key must be exactly 56 bytes.")

            self._private_key = private_key_bytes
            self._scalar = int.from_bytes(private_key_bytes, byteorder="little") % Decaf448.ORDER

        # Generate the public key point per SEC 1, ver. 1.9, section 3.2.1
        self._public_key_point = GENERATOR * self._scalar

    @classmethod
    def from_key(cls, private_key: str) -> Self:
        """
        Creates a new Decaf448 instance from a private key.

        :param private_key: the private key as a base64 string
        :return: a new Decaf448 instance
        """

        private_key_bytes = base64.b64decode(private_key)
        return cls(private_key=private_key_bytes)

    # Properties
    @property
    def private_key(self) -> str:
        """
        :return: the private key as a base64 string
        """

        return base64.b64encode(self._private_key).decode("ascii")

    @property
    def public_key(self) -> str:
        """
        :return: the public key as a base64 string
        """

        pk_bytes = self._public_key_point.to_bytes()
        return base64.b64encode(pk_bytes).decode("ascii")

    @property
    def keypair(self) -> tuple[str, str]:
        """
        :return: the private and public keys as a tuple of base64 strings
        """

        return self.private_key, self.public_key
