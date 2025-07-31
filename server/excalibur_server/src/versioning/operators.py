from semver.version import Version


def tilde(version: Version, comp_ver: Version) -> bool:
    major, minor, patch, prerelease, _ = version.to_tuple()
    first_ver = f"{major}.{minor}.{patch}"
    if prerelease is not None:
        first_ver += f"-{prerelease}"

    if not comp_ver.match(f">={first_ver}"):
        return False

    return comp_ver.match(f"<{major}.{minor+1}.0")
