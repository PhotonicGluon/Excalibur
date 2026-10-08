from pathlib import Path

from .path import check_path_subdir, split_path


def test_check_path_subdir():
    assert check_path_subdir(Path("a"), Path("root")) == (Path("root/a").resolve(), True)
    assert check_path_subdir(Path(".."), Path("root")) == (Path("root/..").resolve(), False)
    assert check_path_subdir(Path("vault"), Path("root")) == (Path("root/vault").resolve(), True)
    assert check_path_subdir(Path("../vault"), Path("root")) == (Path("root/../vault").resolve(), False)


class TestSplitPath:
    def test_root(self):
        assert split_path(".") == ()
        assert split_path("") == ()
        assert split_path("/") == ()
        assert split_path("./") == ()

    def test_single_part(self):
        assert split_path("a") == ("a",)
        assert split_path("/a") == ("a",)
        assert split_path("a/") == ("a",)
        assert split_path("/a/") == ("a",)

    def test_multiple_parts(self):
        assert split_path("a/b") == ("a", "b")
        assert split_path("a/b/c") == ("a", "b", "c")
        assert split_path("/a/b/c") == ("a", "b", "c")
        assert split_path("a/b/c/") == ("a", "b", "c")

    def test_repeated_slashes(self):
        assert split_path("a//b") == ("a", "b")
        assert split_path("//a//b//") == ("a", "b")

    def test_dot_segments_are_dropped(self):
        assert split_path("./a") == ("a",)
        assert split_path("a/.") == ("a",)
        assert split_path("./a/./b/.") == ("a", "b")
        assert split_path("a/./b") == ("a", "b")

    def test_double_dot_is_kept_literally(self):
        # `split_path` does lexical splitting only; it does not resolve `..` segments
        assert split_path("..") == ("..",)
        assert split_path("a/..") == ("a", "..")
        assert split_path("a/../b") == ("a", "..", "b")
