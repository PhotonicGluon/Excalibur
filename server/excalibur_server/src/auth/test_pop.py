from excalibur_server.src.auth.pop import generate_pop, generate_pop_header, parse_pop_header


def test_generate_pop():
    pop = generate_pop(
        b"one demo 16B key",
        "GET",
        "/some-path",
        1234,
        b"some nonce value",
    )
    assert pop.hex() == "4116ecf4f60c9af95fdfeaa53704eab6eb816aa526a3e0a93550f2adfc702deb"


def test_generate_pop_header():
    pop_header = generate_pop_header(
        b"one demo 16B key",
        "GET",
        "/some-path",
        1234,
        b"some nonce value",
    )
    assert pop_header == "1234 c29tZSBub25jZSB2YWx1ZQ== QRbs9PYMmvlf3+qlNwTqtuuBaqUmo+CpNVDyrfxwLes="


def test_parse_pop_header():
    timestamp, nonce, hmac = parse_pop_header(
        "1234 c29tZSBub25jZSB2YWx1ZQ== QRbs9PYMmvlf3+qlNwTqtuuBaqUmo+CpNVDyrfxwLes=",
    )
    assert timestamp == 1234
    assert nonce == b"some nonce value"
    assert hmac.hex() == "4116ecf4f60c9af95fdfeaa53704eab6eb816aa526a3e0a93550f2adfc702deb"
