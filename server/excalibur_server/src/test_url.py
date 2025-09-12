from starlette.datastructures import URL

from .url import get_url_encoded_path


class TestGetURLEncodedPath:
    def test_no_path(self):
        assert get_url_encoded_path(URL("http://example.com")) == "/"

    def test_with_path(self):
        assert get_url_encoded_path(URL("http://example.com/test")) == "/test"

    def test_path_with_spaces(self):
        assert get_url_encoded_path(URL("http://example.com/John Doe")) == "/John%20Doe"

    def test_path_with_slashes(self):
        assert get_url_encoded_path(URL("http://example.com/John/Doe")) == "/John/Doe"

    def test_path_with_slashes_and_spaces(self):
        assert get_url_encoded_path(URL("http://example.com/John/Doe Jr")) == "/John/Doe%20Jr"

    def test_path_mixed(self):
        assert get_url_encoded_path(URL("http://example.com/John/Doe+the III")) == "/John/Doe%2Bthe%20III"

    def test_path_unicode(self):
        assert get_url_encoded_path(URL("http://example.com/測試/測")) == "/%E6%B8%AC%E8%A9%A6/%E6%B8%AC"
