from semver.version import Version

from .operators import tilde


def test_tilde():
    assert tilde(Version.parse("1.2.3"), Version.parse("1.2.3"))
    assert tilde(Version.parse("1.2.3-alpha.1"), Version.parse("1.2.3-alpha.1"))
    assert tilde(Version.parse("1.2.3+1"), Version.parse("1.2.3+1"))
    assert tilde(Version.parse("1.2.3-alpha.1+1"), Version.parse("1.2.3-alpha.1+1"))
