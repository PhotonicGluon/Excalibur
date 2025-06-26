import os
from base64 import b64decode
from enum import Enum
from pathlib import Path
from typing import Literal

from Crypto.Hash import SHA1, SHA3_256
from Crypto.Random.random import getrandbits
from Crypto.Util.number import bytes_to_long, long_to_bytes

from excalibur_server.src.security.security_details import get_security_details

SRP_GROUP_SIZES_TYPE = Literal[1024, 1536, 2048]


class SRPGroup(Enum):
    """
    SRP groups.

    Taken from RFC 5054 appendix A, which can be found at
        https://datatracker.ietf.org/doc/html/rfc5054#appendix-A
    """

    SMALL = (
        1024,
        "EEAF0AB9 ADB38DD6 9C33F80A FA8FC5E8 60726187 75FF3C0B 9EA2314C 9C256576 D674DF74 96EA81D3 383B4813 D692C6E0 E0D5D8E2 50B98BE4 8E495C1D 6089DAD1 5DC7D7B4 6154D6B6 CE8EF4AD 69B15D49 82559B29 7BCF1885 C529F566 660E57EC 68EDBC3C 05726CC0 2FD4CBF4 976EAA9A FD5138FE 8376435B 9FC61D2F C0EB06E3",
        2,
    )
    MEDIUM = (
        1536,
        "9DEF3CAF B939277A B1F12A86 17A47BBB DBA51DF4 99AC4C80 BEEEA961 4B19CC4D 5F4F5F55 6E27CBDE 51C6A94B E4607A29 1558903B A0D0F843 80B655BB 9A22E8DC DF028A7C EC67F0D0 8134B1C8 B9798914 9B609E0B E3BAB63D 47548381 DBC5B1FC 764E3F4B 53DD9DA1 158BFD3E 2B9C8CF5 6EDF0195 39349627 DB2FD53D 24B7C486 65772E43 7D6C7F8C E442734A F7CCB7AE 837C264A E3A9BEB8 7F8A2FE9 B8B5292E 5A021FFF 5E91479E 8CE7A28C 2442C6F3 15180F93 499A234D CF76E3FE D135F9BB",
        2,
    )
    LARGE = (
        2048,
        "AC6BDB41 324A9A9B F166DE5E 1389582F AF72B665 1987EE07 FC319294 3DB56050 A37329CB B4A099ED 8193E075 7767A13D D52312AB 4B03310D CD7F48A9 DA04FD50 E8083969 EDB767B0 CF609517 9A163AB3 661A05FB D5FAAAE8 2918A996 2F0B93B8 55F97993 EC975EEA A80D740A DBF4FF74 7359D041 D5C33EA7 1D281E44 6B14773B CA97B43A 23FB8016 76BD207A 436C6481 F1D2B907 8717461A 5B9D32E6 88F87748 544523B5 24B0D57D 5EA77A27 75D2ECFA 032CFBDB F52FB378 61602790 04E57AE6 AF874E73 03CE5329 9CCC041C 7BC308D8 2A5698F3 A8D0C382 71AE35F8 E9DBFBB6 94B5C803 D89F7AE4 35DE236D 525F5475 9B65E372 FCD68EF2 0FA7111F 9E4AFF73",
        2,
    )

    def __init__(self, bits: int, prime: str, generator: int):
        self.bits = bits
        self.prime = int(prime.replace(" ", ""), 16)
        self.generator = generator

        # Derive multiplier (k) from prime and generator as described in RFC5054
        padded_generator = long_to_bytes(generator, bits // 8)
        predigest = long_to_bytes(self.prime) + padded_generator
        digest = SHA1.new(predigest).digest()
        self.multiplier = bytes_to_long(digest)


def get_verifier(security_details_file: Path) -> int:
    """
    Gets the verifier value from a file.

    :param security_details_file: security details file
    :return: the verifier
    """

    if (
        os.environ.get("EXCALIBUR_SERVER_DEBUG", "0") == "1"
        and os.environ.get("EXCALIBUR_SERVER_TEST_VERIFIER") is not None
    ):
        return bytes_to_long(b64decode(os.environ["EXCALIBUR_SERVER_TEST_VERIFIER"]))

    security_details = get_security_details(security_details_file)
    return bytes_to_long(security_details.verifier)


def compute_server_public_value(group: SRPGroup, verifier: int, private_value: int | None = None) -> tuple[int, int]:
    """
    Compute the server public value, B.

    :param group: SRP group
    :param verifier: verifier value
    :param private_value: private exponent, b, to use. If not provided, will generate a cryptographically random one
    :return: (server private value, server public value)
    """

    if private_value is None:
        private_value = getrandbits(256)

    public_value = (group.multiplier * verifier + pow(group.generator, private_value, group.prime)) % group.prime
    return private_value, public_value


def compute_u(group: SRPGroup, client_public_value: int, server_public_value: int) -> int:
    """
    Computes the SRP shared `u` value.

    :param group: SRP group
    :param client_public_value: client public value, A
    :param server_public_value: server public value, B
    :return: the `u` value
    """

    a_pub_bytes = long_to_bytes(client_public_value, group.bits // 8)
    b_pub_bytes = long_to_bytes(server_public_value, group.bits // 8)
    return bytes_to_long(SHA1.new(a_pub_bytes + b_pub_bytes).digest())


def compute_premaster_secret(
    group: SRPGroup, client_public_value: int, server_private_value: int, u: int, verifier: int
) -> int:
    """
    Computes the SRP pre-master secret.

    :param group: SRP group
    :param client_public_value: client public value, A
    :param server_private_value: server private value, b
    :param u: shared `u` value as computed by `compute_u()`
    :param verifier: verifier value
    :return: the pre-master secret
    """

    vu = pow(verifier, u, group.prime)
    return pow(client_public_value * vu % group.prime, server_private_value, group.prime)


def premaster_to_master(group: SRPGroup, premaster_secret: int) -> bytes:
    """
    Computes the master secret from the pre-master secret.

    RFC2945 allows the use of other hash algorithms other than the SHA1-Interleave. We adopt
    SHA3-256.

    :param group: SRP group
    :param premaster_secret: pre-master secret
    :return: the master secret
    """

    return SHA3_256.new(long_to_bytes(premaster_secret, group.bits // 8)).digest()


def generate_m1(
    group: SRPGroup,
    salt: bytes,
    client_public_value: int,
    server_public_value: int,
    master_secret: bytes,
) -> bytes:
    """
    Generates the server's M1 value.

    This value should be the same on both the client and server for successful mutual
    authentication.

    :param group: SRP group
    :param salt: salt used for key generation on the client side
    :param client_public_value: client public value, A
    :param server_public_value: server public value, B
    :param master_secret: server's computed master secret
    :return: server's M1 value
    """

    group_prime_hash = SHA3_256.new(long_to_bytes(group.prime)).digest()
    group_generator_hash = SHA3_256.new(long_to_bytes(group.generator)).digest()

    first = long_to_bytes(bytes_to_long(group_prime_hash) ^ bytes_to_long(group_generator_hash))
    third = long_to_bytes(client_public_value)
    fourth = long_to_bytes(server_public_value)

    pre_m = first + salt + third + fourth + master_secret
    return SHA3_256.new(pre_m).digest()


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
