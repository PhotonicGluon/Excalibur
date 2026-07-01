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


class TestGetURLEncodedPathWithQuery:
    def test_query_excluded_by_default(self):
        assert get_url_encoded_path(URL("http://example.com/upload?force=true")) == "/upload"

    def test_no_query_string(self):
        assert get_url_encoded_path(URL("http://example.com/test"), include_query=True) == "/test"

    def test_with_query_string(self):
        assert (
            get_url_encoded_path(URL("http://example.com/upload?force=true"), include_query=True)
            == "/upload?force=true"
        )

    def test_multiple_query_params(self):
        assert (
            get_url_encoded_path(URL("http://example.com/upload?force=true&x=1"), include_query=True)
            == "/upload?force=true&x=1"
        )

    def test_empty_query_string(self):
        assert get_url_encoded_path(URL("http://example.com/upload?"), include_query=True) == "/upload"
