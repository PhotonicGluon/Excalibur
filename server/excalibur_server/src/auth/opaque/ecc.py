import base64

from Crypto.Random import get_random_bytes

P = 2**255 - 19  # See [RFC9496](https://www.rfc-editor.org/rfc/rfc9496) section 2
ORDER = 2**252 + 27742317777372353535851937790883648493  # `l` in Section 4
GENERATOR = None  # Will be defined below

# Constants taken from Section 4.1
D = 37095705934669439343138083508754565189542113879843219016388785533085940283555
SQRT_M1 = 19681161376707505956807079304988542015446066515923890162744021073123829784752
SQRT_AD_MINUS_ONE = 25063068953384623474111414158702152701244531502492656460079210482610430750235
INVSQRT_A_MINUS_D = 54469307008909316920995813868745141605393597292927456921205312896311721017578
ONE_MINUS_D_SQ = 1159843021668779879193775521855586647937357759715417654439879720876111806838
D_MINUS_ONE_SQ = 40440834346308536858101042469323190826248399146238708352240133220865137265952


# Helper functions
def _is_negative(e: int) -> bool:
    """
    Checks if an element is "negative" according to section 3.1 of
    [RFC8032](https://www.rfc-editor.org/rfc/inline-errata/rfc8032.html). That is,
    this function returns `True` if the least nonnegative integer representing e is odd,
    and `False` if it is even.
    """

    return ((e % P) & 1) == 1


def _ct_abs(u: int) -> int:
    """
    Constant-time absolute value of an element in GF(P), as suggested in section 2.2.

    :param u: an element to take the absolute value of
    :returns: the absolute value of u in GF(P)
    """

    u = u % P
    return (-u) % P if _is_negative(u) else u


# Elliptic curve operations
def _point_equals(p1: tuple[int, int, int, int], p2: tuple[int, int, int, int]) -> bool:
    """
    Checks equality between two points, as given by section 4.3.3.

    :param p1: First point
    :param p2: Second point
    :returns: `True` if the points are equal and `False` otherwise
    """

    x1, y1, _z1, _t1 = p1
    x2, y2, _z2, _t2 = p2

    return ((x1 * y2) % P == (y1 * x2) % P) or ((y1 * y2) % P == (x1 * x2) % P)


def _point_add(p1: tuple[int, int, int, int], p2: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    """
    Adds two points on the Curve25519 elliptic curve.

    :param p1: First point
    :param p2: Second point
    :returns: The sum of the two points
    """

    x1, y1, z1, t1 = p1
    x2, y2, z2, t2 = p2

    a = (x1 * x2) % P
    b = (y1 * y2) % P
    c = (D * t1 * t2) % P
    d = (z1 * z2) % P

    e = ((x1 + y1) * (x2 + y2) - a - b) % P
    f = (d - c) % P
    g = (d + c) % P
    h = (b + a) % P

    x3 = (e * f) % P
    y3 = (g * h) % P
    t3 = (e * h) % P
    z3 = (f * g) % P
    return (x3, y3, z3, t3)


def _point_mul(scalar: int, p: tuple[int, int, int, int]) -> tuple[int, int, int, int]:
    """
    Multiplies a point by a scalar using double-and-add algorithm.

    :param scalar: scalar to multiply by
    :param p: point to multiply
    :returns: product of the point and scalar
    """

    scalar = scalar % ORDER  # See section 4.4
    result = (0, 1, 1, 0)  # Identity
    current = p
    while scalar > 0:
        if scalar & 1:
            result = _point_add(result, current)
        current = _point_add(current, current)
        scalar >>= 1
    return result


# Class encapsulating these operations
class Ristretto255Point:
    """
    Implementation of the Ristretto255 group from [RFC9496](https://www.rfc-editor.org/rfc/rfc9496).
    """

    def __init__(self, x: int, y: int, z: int, t: int):
        """
        Initializes a Ristretto255 point with the given coordinates.

        :param x: The x-coordinate of the point
        :param y: The y-coordinate of the point
        :param z: The z-coordinate of the point
        :param t: The t-coordinate of the point
        """

        self.x = x % P
        self.y = y % P
        self.z = z % P
        self.t = t % P

    # Magic methods
    def __neg__(self) -> "Ristretto255Point":
        return Ristretto255Point(((-self.x) % P, self.y, self.z, (-self.t) % P))

    def __add__(self, other: "Ristretto255Point") -> "Ristretto255Point":
        return Ristretto255Point(*_point_add((self.x, self.y, self.z, self.t), (other.x, other.y, other.z, other.t)))

    def __sub__(self, other: "Ristretto255Point") -> "Ristretto255Point":
        return self + (-other)

    def __mul__(self, scalar: int) -> "Ristretto255Point":
        return Ristretto255Point(*_point_mul(scalar, (self.x, self.y, self.z, self.t)))

    def __rmul__(self, scalar: int) -> "Ristretto255Point":
        return self.__mul__(scalar)

    def __eq__(self, other: "Ristretto255Point") -> bool:
        return _point_equals((self.x, self.y, self.z, self.t), (other.x, other.y, other.z, other.t))

    # Helper methods
    @staticmethod
    def _sqrt_ratio_m1(u: int, v: int) -> tuple[bool, int]:
        """
        The `SQRT_RATIO_M1` function from section 4.2.

        :param u: The numerator
        :param v: The denominator
        :returns: a tuple of two elements. The first is a boolean indicating whether `u/v` is a
            square in the field GF(P). The second depends:
            - `+sqrt(u/v)` if `u` and `v` are nonzero and `u/v` is square in the field
            - `0` if `u = 0`
            - `0` if `v = 0` and `u != 0`
            - `sqrt(SQRT_M1*(u/v))` if `u` and `v` are nonzero and `u/v` is non-square in the field
        """

        u = u % P
        v = v % P

        vvv = pow(v, 3, P)
        vvvvvvv = pow(v, 7, P)

        r = (u * vvv) * pow(u * vvvvvvv, (P - 5) // 8, P) % P  # Note: (p - 5) / 8 is an integer
        check = (v * pow(r, 2, P)) % P

        correct_sign_sqrt = check == u
        flipped_sign_sqrt = check == (-u) % P
        flipped_sign_sqrt_i = check == (-u * SQRT_M1) % P

        r_prime = (SQRT_M1 * r) % P
        r = r_prime if flipped_sign_sqrt or flipped_sign_sqrt_i else r

        # Choose the non-negative square root
        r = _ct_abs(r)

        was_square = correct_sign_sqrt or flipped_sign_sqrt

        return (was_square, r)

    @classmethod
    def _map_function(cls, b: bytes) -> "Ristretto255Point":
        """
        Maps a 32-byte string to a point on the Ristretto255 curve, following section 4.3.4's `MAP`
        function.

        :param b: a 32-byte string
        :returns: a point on the Ristretto255 curve
        """

        # Step 1
        masked_b = b[:-1] + bytes([b[-1] & 0x7F])  # Mask final bit
        r = int.from_bytes(masked_b, "little")
        t = r % P

        # Step 2
        r = (SQRT_M1 * pow(t, 2, P)) % P
        u = ((r + 1) * ONE_MINUS_D_SQ) % P
        v = ((-1 - r * D) * (r + D)) % P

        (was_square, s) = cls._sqrt_ratio_m1(u, v)
        s_prime = (-_ct_abs(s * t)) % P
        s = s if was_square else s_prime
        c = -1 if was_square else r

        N = (c * (r - 1) * D_MINUS_ONE_SQ - v) % P

        w0 = (2 * s * v) % P
        w1 = (N * SQRT_AD_MINUS_ONE) % P
        w2 = (1 - pow(s, 2, P)) % P
        w3 = (1 + pow(s, 2, P)) % P

        # Step 3
        return cls(w0 * w3, w2 * w1, w1 * w3, w0 * w2)

    # Public methods
    @classmethod
    def from_bytes(cls, b: bytes) -> "Ristretto255Point":
        """
        Decodes a 32-byte string as a field element, following section 4.3.1.

        :param b: 32-byte string
        :returns: a point on the Ristretto255 curve
        :raises ValueError: if data is not 32 bytes or if the data is invalid
        """

        # Step 1
        if len(b) != 32:
            raise ValueError("data must be 32 bytes long")

        s = int.from_bytes(b, byteorder="little")
        if s >= P:
            raise ValueError("s must be less than p")

        # Step 2
        if _is_negative(s):
            raise ValueError("s must be non-negative")

        # Step 3
        ss = pow(s, 2, P)
        u1 = (1 - ss) % P
        u2 = (1 + ss) % P
        u2_sqr = pow(u2, 2, P)

        v = (-D * pow(u1, 2, P) - u2_sqr) % P
        (was_square, invsqrt) = cls._sqrt_ratio_m1(1, (v * u2_sqr) % P)

        den_x = (invsqrt * u2) % P
        den_y = (invsqrt * den_x * v) % P

        x = _ct_abs(2 * s * den_x)
        y = (u1 * den_y) % P
        t = (x * y) % P

        # Step 4
        if not was_square or _is_negative(t) or y == 0:
            raise ValueError("invalid encoding")

        return cls(x, y, 1, t)

    def to_bytes(self) -> bytes:
        """
        Encodes this point on the Ristretto255 curve as a 32-byte string, following section 4.3.2.

        :returns: a 32-byte string representing this point
        """

        x0 = self.x % P
        y0 = self.y % P
        z0 = self.z % P
        t0 = self.t % P

        # Step 1
        u1 = ((z0 + y0) * (z0 - y0)) % P
        u2 = (x0 * y0) % P

        (_, invsqrt) = self._sqrt_ratio_m1(1, u1 * u2 * u2)  # Ignore `was_square` since this is always square

        den1 = (invsqrt * u1) % P
        den2 = (invsqrt * u2) % P
        z_inv = (den1 * den2 * t0) % P

        ix0 = (x0 * SQRT_M1) % P
        iy0 = (y0 * SQRT_M1) % P
        enchanted_denominator = (den1 * INVSQRT_A_MINUS_D) % P

        rotate = _is_negative(t0 * z_inv)

        # Conditionally rotate x and y
        x = iy0 if rotate else x0
        y = ix0 if rotate else y0
        z = z0
        den_inv = enchanted_denominator if rotate else den2

        y = (-y) % P if _is_negative(x * z_inv) else y

        s = _ct_abs(den_inv * (z - y))

        # Step 2
        return s.to_bytes(32, "little")

    @classmethod
    def derive(cls, b: bytes) -> "Ristretto255Point":
        """
        Derives a point on the Ristretto255 curve from a 64-byte string, following section 4.3.4.

        :param b: a 64-byte string
        :returns: a point on the Ristretto255 curve
        """

        return cls._map_function(b[0:32]) + cls._map_function(b[32:64])


GENERATOR = Ristretto255Point.from_bytes(
    bytes.fromhex("e2f2ae0a6abc4e71a884a961c500515f58e30b6aa582dd8db6a65945e08d2d76")  # See Section 4
)


# Elliptic Curve Cryptography (ECC) wrapper class
class Ristretto255:
    """
    Implementation of elliptic curve cryptography operations using the Ristretto255 group from
    [RFC9496](https://www.rfc-editor.org/rfc/rfc9496).
    """

    def __init__(self, private_key_bytes: bytes = None):
        """
        Initializes a new Ristretto255 instance.

        :param private_key_bytes: the private key as bytes. If not provided, a secure random key is
            generated.
        """

        if private_key_bytes is None:
            # Per RFC 9497 section 4.7.2, to ensure a uniform distribution we generate a 64-byte random sequence and
            # reduce it modulo the group order
            random_bytes = get_random_bytes(64)
            scalar = int.from_bytes(random_bytes, byteorder="little") % ORDER

            self._private_key = scalar.to_bytes(32, byteorder="little")
            self._scalar = scalar
        else:
            if len(private_key_bytes) != 32:
                raise ValueError("Private key must be exactly 32 bytes.")

            self._private_key = private_key_bytes
            self._scalar = int.from_bytes(private_key_bytes, byteorder="little") % ORDER

        # Generate the public key point per SEC 1, ver. 1.9, section 3.2.1
        self._public_key_point = GENERATOR * self._scalar

    @classmethod
    def from_key(cls, private_key: str) -> "Ristretto255":
        """
        Creates a new Ristretto255 instance from a private key.

        :param private_key: the private key as a base64 string
        :return: a new Ristretto255 instance
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
