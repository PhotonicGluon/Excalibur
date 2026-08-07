from .misc import frame, i2osp, xor


def test_i2osp():
    assert i2osp(0, 1) == b"\x00"
    assert i2osp(255, 1) == b"\xff"
    assert i2osp(256, 2) == b"\x01\x00"
    assert i2osp(65535, 2) == b"\xff\xff"
    assert i2osp(65536, 3) == b"\x01\x00\x00"
    assert i2osp(16777215, 3) == b"\xff\xff\xff"
    assert i2osp(16777216, 4) == b"\x01\x00\x00\x00"
    assert i2osp(4294967295, 4) == b"\xff\xff\xff\xff"
    assert i2osp(4294967296, 5) == b"\x01\x00\x00\x00\x00"
    assert i2osp(1099511627775, 5) == b"\xff\xff\xff\xff\xff"
    assert i2osp(1099511627776, 6) == b"\x01\x00\x00\x00\x00\x00"
    assert i2osp(281474976710655, 6) == b"\xff\xff\xff\xff\xff\xff"
    assert i2osp(281474976710656, 7) == b"\x01\x00\x00\x00\x00\x00\x00"
    assert i2osp(72057594037927935, 7) == b"\xff\xff\xff\xff\xff\xff\xff"
    assert i2osp(72057594037927936, 8) == b"\x01\x00\x00\x00\x00\x00\x00\x00"
    assert i2osp(18446744073709551615, 8) == b"\xff\xff\xff\xff\xff\xff\xff\xff"


def test_xor():
    assert xor(b"\x00", b"\x00") == b"\x00"
    assert xor(b"\x01", b"\x01") == b"\x00"
    assert xor(b"\x01", b"\x00") == b"\x01"
    assert xor(b"\x00", b"\x01") == b"\x01"


def test_frame():
    assert frame(b"hello") == b"\x00\x00\x00\x05hello"
    assert frame(b"hello", b"world") == b"\x00\x00\x00\x05hello\x00\x00\x00\x05world"
    assert frame(b"hello", b"world", prefix_len=2) == b"\x00\x05hello\x00\x05world"
