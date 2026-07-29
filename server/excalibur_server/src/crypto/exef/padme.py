class PADME:
    """
    PADME padding (Nikitin, Barman et al., 2019; https://arxiv.org/pdf/1806.03160v4).

    PADME bounds the padding overhead to a small fraction of the file size while collapsing file
    lengths into a limited number of buckets, reducing (but not eliminating) length leakage to
    O(log log n).
    """

    @staticmethod
    def compute_padded_length(length: int) -> int:
        """
        Computes the PADME-padded length for a plaintext of `length` bytes.

        :param length: length of plaintext
        :raises ValueError: if the provided length is negative
        :return: padded length
        """

        if length < 0:
            raise ValueError("length must be non-negative")

        if length < 2:
            return length

        exponent = length.bit_length() - 1
        significant = exponent.bit_length()
        last_bits = exponent - significant
        bit_mask = (1 << last_bits) - 1
        return (length + bit_mask) & ~bit_mask

    @staticmethod
    def is_fixed_point(value: int) -> bool:
        """
        Checks if the provided value is a fixed point of the PADME length function.

        A valid PADME length is a fixed point of the PADME length function, and thus this function
        can be used to validate that a given length is a valid PADME length.

        :param value: value to check
        :return: True if the value is a fixed point, False otherwise
        """

        if value < 0:
            return False
        return PADME.compute_padded_length(value) == value
