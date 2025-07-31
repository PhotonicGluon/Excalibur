from packaging.version import Version as PyPIVersion
from semver.version import Version


def py2semver(py_ver: str) -> str:
    """
    Converts a PyPI version (formally defined in PEP440) into a valid semver version.

    :param py_ver: the PyPI version
    :return: a valid semver version
    :raises ValueError: if epoch or post parts are used
    """

    py_ver: PyPIVersion = PyPIVersion(py_ver)

    # Check for non-supported fields for semver
    if py_ver.epoch != 0:
        raise ValueError("Can't convert an epoch to semver")

    if py_ver.post is not None:
        raise ValueError("Can't convert a post part to semver")

    # Handle prerelease cases
    pre = None
    if py_ver.pre:
        raw_part, num = py_ver.pre
        if raw_part == "a":
            part = "alpha"
        elif raw_part == "b":
            part = "beta"
        elif raw_part == "rc":
            part = "rc"
        else:
            raise ValueError(f"Unsupported prerelease part: {raw_part}")

        pre = f"{part}.{num}"

    # Form semver
    version = Version(*py_ver.release, prerelease=pre, build=py_ver.dev)
    return str(version)
