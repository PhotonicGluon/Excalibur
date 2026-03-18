from typing import Self

from excalibur_server.src.auth.elliptic.abc import BaseCurve


class Ristretto255(BaseCurve):
    """
    Implementation of the Ristretto255 group from [RFC9496](https://www.rfc-editor.org/rfc/rfc9496),
    section 4.
    """

    P = 2**255 - 19  # See section 2
    ORDER = 2**252 + 27742317777372353535851937790883648493  # `l` in Section 4
    GENERATOR: Self = None  # Defined below
    KEY_LENGTH = 32

    # Constants taken from Section 4.1
    D = 37095705934669439343138083508754565189542113879843219016388785533085940283555
    SQRT_M1 = 19681161376707505956807079304988542015446066515923890162744021073123829784752
    SQRT_AD_MINUS_ONE = 25063068953384623474111414158702152701244531502492656460079210482610430750235
    INVSQRT_A_MINUS_D = 54469307008909316920995813868745141605393597292927456921205312896311721017578
    ONE_MINUS_D_SQ = 1159843021668779879193775521855586647937357759715417654439879720876111806838
    D_MINUS_ONE_SQ = 40440834346308536858101042469323190826248399146238708352240133220865137265952

    # Magic methods
    def __eq__(self, other: Self) -> bool:
        """
        Checks equality between two points, as given by section 4.3.3.

        :param other: the other point to compare with
        :returns: `True` if the points are equal and `False` otherwise
        """

        return ((self.x * other.y) % self.P == (self.y * other.x) % self.P) or (
            (self.y * other.y) % self.P == (self.x * other.x) % self.P
        )

    # Helper methods
    def _add_h(self, a: int, b: int) -> int:
        """
        The `h` value calculation during addition.
        """
        return b + a

    @classmethod
    def _sqrt_ratio_m1(cls, u: int, v: int) -> tuple[bool, int]:
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

        u = u % cls.P
        v = v % cls.P

        vvv = pow(v, 3, cls.P)
        vvvvvvv = pow(v, 7, cls.P)

        r = (u * vvv) * pow(u * vvvvvvv, (cls.P - 5) // 8, cls.P) % cls.P  # Note: (p - 5) / 8 is an integer
        check = (v * pow(r, 2, cls.P)) % cls.P

        correct_sign_sqrt = check == u
        flipped_sign_sqrt = check == (-u) % cls.P
        flipped_sign_sqrt_i = check == (-u * cls.SQRT_M1) % cls.P

        r_prime = (cls.SQRT_M1 * r) % cls.P
        r = r_prime if flipped_sign_sqrt or flipped_sign_sqrt_i else r

        # Choose the non-negative square root
        r = cls._ct_abs(r)

        was_square = correct_sign_sqrt or flipped_sign_sqrt

        return (was_square, r)

    @classmethod
    def _map_function(cls, b: bytes) -> Self:
        """
        Maps a 32-byte string to a point on the Ristretto255 curve, following section 4.3.4's `MAP`
        function.

        :param b: a 32-byte string
        :returns: a point on the Ristretto255 curve
        """

        # Step 1
        masked_b = b[:-1] + bytes([b[-1] & 0x7F])  # Mask final bit
        r = int.from_bytes(masked_b, "little")
        t = r % cls.P

        # Step 2
        r = (cls.SQRT_M1 * pow(t, 2, cls.P)) % cls.P
        u = ((r + 1) * cls.ONE_MINUS_D_SQ) % cls.P
        v = ((-1 - r * cls.D) * (r + cls.D)) % cls.P

        (was_square, s) = cls._sqrt_ratio_m1(u, v)
        s_prime = (-cls._ct_abs(s * t)) % cls.P
        s = s if was_square else s_prime
        c = -1 if was_square else r

        N = (c * (r - 1) * cls.D_MINUS_ONE_SQ - v) % cls.P

        w0 = (2 * s * v) % cls.P
        w1 = (N * cls.SQRT_AD_MINUS_ONE) % cls.P
        w2 = (1 - pow(s, 2, cls.P)) % cls.P
        w3 = (1 + pow(s, 2, cls.P)) % cls.P

        # Step 3
        return cls(w0 * w3, w2 * w1, w1 * w3, w0 * w2)

    # Public methods
    @classmethod
    def from_bytes(cls, b: bytes) -> Self:
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
        if s >= cls.P:
            raise ValueError("s must be less than p")

        # Step 2
        if cls._is_negative(s):
            raise ValueError("s must be non-negative")

        # Step 3
        ss = pow(s, 2, cls.P)
        u1 = (1 - ss) % cls.P
        u2 = (1 + ss) % cls.P
        u2_sqr = pow(u2, 2, cls.P)

        v = (-cls.D * pow(u1, 2, cls.P) - u2_sqr) % cls.P
        (was_square, invsqrt) = cls._sqrt_ratio_m1(1, (v * u2_sqr) % cls.P)

        den_x = (invsqrt * u2) % cls.P
        den_y = (invsqrt * den_x * v) % cls.P

        x = cls._ct_abs(2 * s * den_x)
        y = (u1 * den_y) % cls.P
        t = (x * y) % cls.P

        # Step 4
        if not was_square or cls._is_negative(t) or y == 0:
            raise ValueError("invalid encoding")

        return cls(x, y, 1, t)

    def to_bytes(self) -> bytes:
        """
        Encodes this point on the Ristretto255 curve as a 32-byte string, following section 4.3.2.

        :returns: a 32-byte string representing this point
        """

        x0 = self.x % self.P
        y0 = self.y % self.P
        z0 = self.z % self.P
        t0 = self.t % self.P

        # Step 1
        u1 = ((z0 + y0) * (z0 - y0)) % self.P
        u2 = (x0 * y0) % self.P

        (_, invsqrt) = self._sqrt_ratio_m1(1, u1 * u2 * u2)  # Ignore `was_square` since this is always square

        den1 = (invsqrt * u1) % self.P
        den2 = (invsqrt * u2) % self.P
        z_inv = (den1 * den2 * t0) % self.P

        ix0 = (x0 * self.SQRT_M1) % self.P
        iy0 = (y0 * self.SQRT_M1) % self.P
        enchanted_denominator = (den1 * self.INVSQRT_A_MINUS_D) % self.P

        rotate = self._is_negative(t0 * z_inv)

        # Conditionally rotate x and y
        x = iy0 if rotate else x0
        y = ix0 if rotate else y0
        z = z0
        den_inv = enchanted_denominator if rotate else den2

        y = (-y) % self.P if self._is_negative(x * z_inv) else y

        s = self._ct_abs(den_inv * (z - y))

        # Step 2
        return s.to_bytes(32, "little")


Ristretto255.GENERATOR = Ristretto255.from_bytes(
    bytes.fromhex("e2f2ae0a6abc4e71a884a961c500515f58e30b6aa582dd8db6a65945e08d2d76")  # See Section 4
)
