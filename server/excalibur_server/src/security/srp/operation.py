from Crypto.Hash import SHA1, SHA3_256
from Crypto.Random.random import getrandbits
from Crypto.Util.number import bytes_to_long, long_to_bytes

from excalibur_server.src.security.srp.group import SRPGroup


class SRP:
    """
    Class that handles the SRP operations, as described in RFC5054.
    """

    def __init__(self, group: SRPGroup):
        """
        Constructor.

        :param group: SRP group
        """

        self.group = group

    # Properties
    @property
    def prime(self) -> int:
        """
        Prime number of the SRP group.
        """

        return self.group.prime

    @property
    def generator(self) -> int:
        """
        Generator of the SRP group.
        """

        return self.group.generator

    @property
    def multiplier(self) -> int:
        """
        Multiplier of the SRP group.
        """

        return self.group.multiplier

    @property
    def bits(self) -> int:
        """
        Number of bits in the prime for the group.
        """

        return self.group.bits

    # Public methods
    def compute_verifier(self, key: int) -> int:
        """
        Compute the verifier value.

        :param key: key value
        :return: verifier value
        """

        return pow(self.group.generator, key, self.group.prime)

    def compute_server_public_value(self, verifier: int, private_value: int | None = None) -> tuple[int, int]:
        """
        Compute the server public value, B.

        :param verifier: verifier value
        :param private_value: private exponent, b, to use. If not provided, will generate a cryptographically random one
        :return: (server private value, server public value)
        """

        if private_value is None:
            private_value = getrandbits(256)

        public_value = (
            self.group.multiplier * verifier + pow(self.group.generator, private_value, self.group.prime)
        ) % self.group.prime
        return private_value, public_value

    def compute_u(self, client_public_value: int, server_public_value: int) -> int:
        """
        Computes the SRP shared `u` value.

        :param client_public_value: client public value, A
        :param server_public_value: server public value, B
        :return: the `u` value
        """

        a_pub_bytes = long_to_bytes(client_public_value, self.group.bits // 8)
        b_pub_bytes = long_to_bytes(server_public_value, self.group.bits // 8)
        return bytes_to_long(SHA1.new(a_pub_bytes + b_pub_bytes).digest())

    def compute_premaster_secret(
        self, client_public_value: int, server_private_value: int, u: int, verifier: int
    ) -> int:
        """
        Computes the SRP pre-master secret.

        :param client_public_value: client public value, A
        :param server_private_value: server private value, b
        :param u: shared `u` value as computed by `compute_u()`
        :param verifier: verifier value
        :return: the pre-master secret
        """

        vu = pow(verifier, u, self.group.prime)
        return pow(client_public_value * vu % self.group.prime, server_private_value, self.group.prime)

    def premaster_to_master(self, premaster_secret: int) -> bytes:
        """
        Computes the master secret from the pre-master secret.

        RFC2945 allows the use of other hash algorithms other than the SHA1-Interleave. We adopt
        SHA3-256.

        :param premaster_secret: pre-master secret
        :return: the master secret
        """

        return SHA3_256.new(long_to_bytes(premaster_secret, self.group.bits // 8)).digest()

    def generate_m1(
        self,
        salt: bytes,
        client_public_value: int,
        server_public_value: int,
        master_secret: bytes,
    ) -> bytes:
        """
        Generates the server's M1 value.

        This value should be the same on both the client and server for successful mutual
        authentication.

        :param salt: salt used for key generation on the client side
        :param client_public_value: client public value, A
        :param server_public_value: server public value, B
        :param master_secret: server's computed master secret
        :return: server's M1 value
        """

        group_prime_hash = SHA3_256.new(long_to_bytes(self.group.prime)).digest()
        group_generator_hash = SHA3_256.new(long_to_bytes(self.group.generator)).digest()

        first = long_to_bytes(bytes_to_long(group_prime_hash) ^ bytes_to_long(group_generator_hash))
        third = long_to_bytes(client_public_value)
        fourth = long_to_bytes(server_public_value)

        pre_m = first + salt + third + fourth + master_secret
        return SHA3_256.new(pre_m).digest()

    @staticmethod
    def generate_m2(client_public_value: int, m1: bytes, master_secret: bytes):
        """
        Generates the server's M2 value.

        This value should be the same on both the client and server for successful mutual
        authentication.

        :param client_public_value: client public value, A
        :param m1: computed M1 value
        :param master_secret: server's computed master secret
        :return: server's M2 value
        """

        pre_m = long_to_bytes(client_public_value) + m1 + master_secret
        return SHA3_256.new(pre_m).digest()
