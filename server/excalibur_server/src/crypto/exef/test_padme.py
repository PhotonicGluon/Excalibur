import pytest

from excalibur_server.src.crypto.exef.padme import PADME


class TestPADME:
    def test_small_values(self):
        assert PADME.compute_padded_length(0) == 0
        assert PADME.compute_padded_length(1) == 1

    @pytest.mark.parametrize("length", [0, 1, 2, 3, 7, 8, 9, 100, 1000, 4096, 4097, 100_000, 2**20, 2**20 + 1])
    def test_idempotent_and_non_shrinking(self, length: int):
        padded = PADME.compute_padded_length(length)
        assert padded >= length
        assert PADME.compute_padded_length(padded) == padded  # Idempotent
        assert PADME.is_fixed_point(padded)

    def test_negative_rejected(self):
        with pytest.raises(ValueError):
            PADME.compute_padded_length(-1)
