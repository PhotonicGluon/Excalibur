import pytest

from .py2semver import py2semver


def test_py2semver():
    # Standard versions
    assert py2semver("0.1.0") == "0.1.0"
    assert py2semver("1.2.3") == "1.2.3"

    # Prerelease versions
    assert py2semver("0.1.1a10") == "0.1.1-alpha.10"
    assert py2semver("0.2.3b55") == "0.2.3-beta.55"
    assert py2semver("0.5.7rc1") == "0.5.7-rc.1"

    # Dev versions
    assert py2semver("0.1.0.dev1") == "0.1.0+1"
    assert py2semver("0.1.1a10.dev32") == "0.1.1-alpha.10+32"
    assert py2semver("0.2.3b55.dev32") == "0.2.3-beta.55+32"
    assert py2semver("0.5.7rc1.dev32") == "0.5.7-rc.1+32"


def test_has_epoch():
    with pytest.raises(ValueError):
        py2semver("1!0.1.0")


def test_has_post():
    with pytest.raises(ValueError):
        py2semver("0.1.0.post1")
