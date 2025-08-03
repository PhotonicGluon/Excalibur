from pathlib import Path

from .path import check_path_subdir


def test_check_path_subdir():
    assert check_path_subdir(Path("a"), Path("root")) == (Path("root/a").resolve(), True)
    assert check_path_subdir(Path(".."), Path("root")) == (Path("root/..").resolve(), False)
    assert check_path_subdir(Path("vault"), Path("root")) == (Path("root/vault").resolve(), True)
    assert check_path_subdir(Path("../vault"), Path("root")) == (Path("root/../vault").resolve(), False)
