from typing import Self

from excalibur_server.src.auth.elliptic.curves.abc import BaseCurve


class Decaf448(BaseCurve):
    """
    Implementation of the Decaf448 group from [RFC9496](https://www.rfc-editor.org/rfc/rfc9496),
    section 5.
    """

    P = 2**448 - 2**224 - 1  # See section 2
    ORDER = 2**446 - 13818066809895115352007386748515426880336692474882178609894547503885  # `l` in Section 5
    KEY_LENGTH = 56

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
    def _add_h(self, a: int, b: int) -> int:
        """
        The `h` value calculation during addition.
        """
        return b - a

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


GENERATOR = Decaf448.from_bytes(
    bytes.fromhex(
        "6666666666666666666666666666666666666666666666666666666633333333333333333333333333333333333333333333333333333333"
    )  # See Section 5
)
