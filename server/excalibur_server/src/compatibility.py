from pathlib import Path

import toml
from semver.version import Version

from excalibur_server.meta import VERSION
from excalibur_server.src.versioning import py2semver, tilde

COMPATIBILITY_FILE = Path(__file__).parent.parent / "COMPATIBILITY.toml"

with open(COMPATIBILITY_FILE, "r") as f:
    data = toml.loads(f.read())
    BACKWARDS_COMPATIBLE = data["backwards_compatible"]


def check_compatibility(client_version: Version) -> bool:
    """
    Checks if the client version is compatible with the server version.

    :param client_version: the client version to check
    :return: whether the client version is compatible with the server version
    """

    compatible = tilde(Version.parse(py2semver(VERSION)), client_version)
    if compatible:
        return True
    for condition in BACKWARDS_COMPATIBLE:
        if client_version.match(condition):
            return True
    return False
