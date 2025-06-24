from pathlib import Path

from .path import validate_path


def test_validate_path():
    assert validate_path(Path("a"), Path("root")) == (Path("root/a").resolve(), True)
    assert validate_path(Path(".."), Path("root")) == (Path("root/..").resolve(), False)
    assert validate_path(Path("vault"), Path("root")) == (Path("root/vault").resolve(), True)
    assert validate_path(Path("../vault"), Path("root")) == (Path("root/../vault").resolve(), False)
