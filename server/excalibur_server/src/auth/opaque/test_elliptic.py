# ruff: noqa: E501
from excalibur_server.src.auth.opaque.elliptic import Decaf448

# Test vectors from RFC9496, Appendix B
EXPECTED_B1_RAW = [  # Multiples of the generator
    "00000000 00000000 00000000 00000000 00000000 00000000 00000000 00000000 00000000 00000000 00000000 00000000 00000000 00000000",
    "66666666 66666666 66666666 66666666 66666666 66666666 66666666 33333333 33333333 33333333 33333333 33333333 33333333 33333333",
    "c898eb4f 87f97c56 4c6fd61f c7e49689 314a1f81 8ec85eeb 3bd5514a c816d387 78f69ef3 47a89fca 817e66de fdedce17 8c7cc709 b2116e75",
    "a0c09bf2 ba7208fd a0f4bfe3 d0f5b29a 54301230 6d43831b 5adc6fe7 f8596fa3 08763db1 5468323b 11cf6e4a eb8c18fe 44678f44 545a69bc",
    "b46f1836 aa287c0a 5a5653f0 ec5ef9e9 03f436e2 1c1570c2 9ad9e5f5 96da97ee af17150a e30bcb31 74d04bc2 d712c8c7 789d7cb4 fda138f4",
    "1c5bbecf 4741dfaa e79db72d face00ea aac502c2 060934b6 eaaeca6a 20bd3da9 e0be8777 f7d02033 d1b15884 232281a4 1fc7f80e ed04af5e",
    "86ff0182 d40f7f9e db786251 5821bd67 bfd6165a 3c44de95 d7df79b8 779ccf64 60e3c68b 70c16aaa 280f2d7b 3f22d745 b97a8990 6cfc476c",
    "502bcb68 42eb06f0 e49032ba e87c554c 031d6d4d 2d7694ef bf9c468d 48220c50 f8ca2884 3364d70c ee92d6fe 246e6144 8f9db980 8b3b2408",
    "0c9810f1 e2ebd389 caa78937 4d780079 74ef4d17 227316f4 0e578b33 6827da3f 6b482a47 94eb6a39 75b971b5 e1388f52 e91ea2f1 bcb0f912",
    "20d41d85 a18d5657 a2964032 1563bbd0 4c2ffbd0 a37a7ba4 3a4f7d26 3ce26faf 4e1f74f9 f4b590c6 9229ae57 1fe37fa6 39b5b8eb 48bd9a55",
    "e6b4b8f4 08c7010d 0601e7ed a0c309a1 a42720d6 d06b5759 fdc4e1ef e22d076d 6c44d42f 508d67be 462914d2 8b8edce3 2e709430 5164af17",
    "be88bbb8 6c59c13d 8e9d09ab 98105f69 c2d1dd13 4dbcd3b0 863658f5 3159db64 c0e139d1 80f3c89b 8296d0ae 324419c0 6fa87fc7 daaf34c1",
    "a456f936 9769e8f0 8902124a 0314c7a0 6537a06e 32411f4f 93415950 a17badfa 7442b621 7434a3a0 5ef45be5 f10bd7b2 ef8ea00c 431edec5",
    "186e452c 4466aa43 83b4c002 10d52e79 22dbf977 1e8b47e2 29a9b7b7 3c8d10fd 7ef0b6e4 1530f91f 24a3ed9a b71fa38b 98b2fe47 46d51d68",
    "4ae7fdca e9453f19 5a8ead5c be1a7b96 99673b52 c40ab279 27464887 be53237f 7f3a21b9 38d40d0e c9e15b1d 5130b13f fed81373 a53e2b43",
    "841981c3 bfeec3f6 0cfeca75 d9d8dc17 f46cf010 6f2422b5 9aec580a 58f34227 2e3a5e57 5a055ddb 051390c5 4c24c6ec b1e0aceb 075f6056",
]
EXPECTED_B2_RAW = [  # Invalid encodings
    # Non-canonical field encodings
    "8e24f838 059ee9fe f1e20912 6defe53d cd74ef9b 6304601c 6966099e ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff",
    "86fcc721 2bd4a0b9 80928666 dc28c444 a605ef38 e09fb569 e28d4443 ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff",
    "866d54bd 4c4ff41a 55d4eefd beca73cb d653c7bd 3135b383 708ec0bd ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff",
    "4a380ccd ab9c8636 4a89e77a 464d64f9 157538cf dfa686ad c0d5ece4 ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff",
    "f22d9d4c 945dd44d 11e0b1d3 d3d358d9 59b4844d 83b08c44 e659d79f ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff",
    "8cdffc68 1aa99e9c 818c8ef4 c3808b58 e86acdef 1ab68c84 77af185b ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff",
    "0e1c12ac 7b5920ef fbd044e8 97c57634 e2d05b5c 27f8fa3d f8a086a1 ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff",
    # Negative field elements
    "15141bd2 121837ef 71a0016b d11be757 507221c2 6542244f 23806f3f d3496b7d 4c368262 76f3bf5d eea2c60c 4fa4cec6 9946876d a497e795",
    "455d3802 38434ab7 40a56267 f4f46b7d 2eb2dd8e e905e51d 7b0ae8a6 cb2bae50 1e67df34 ab21fa45 946068c9 f233939b 1d9521a9 98b7cb93",
    "810b1d8e 8bf3a9c0 23294bbf d3d905a9 7531709b dc0f4239 0feedd70 10f77e98 686d400c 9c86ed25 0ceecd9d e0a18888 ffecda0f 4ea1c60d",
    "d3af9cc4 1be0e5de 83c0c627 3bedcb93 51970110 044a9a41 c7b9b226 7cdb9d7b f4dc9c2f db8bed32 87818460 4f1d9944 305a8df4 274ce301",
    "9312bcab 09009e43 30ff89c4 bc1e9e00 0d863efc 3c863d3b 6c507a40 fd2cdefd e1bf0892 b4b5ed97 80b91ed1 398fb4a7 344c605a a5efda74",
    "53d11bce 9e62a29d 63ed82ae 93761bdd 76e38c21 e2822d6e bee5eb1c 5b8a03ea f9df749e 2490eda9 d8ac27d1 f71150de 93668074 d18d1c3a",
    "697c1aed 3cd88585 15d4be8a c158b229 fe184d79 cb2b06e4 9210a6f3 a7cd537b cd9bd390 d96c4ab6 a4406da5 d9364072 6285370c fa95df80",
    # Non-square x^2
    "58ad4871 5c9a1025 69b68b88 362a4b06 45781f5a 19eb7e59 c6a4686f d0f0750f f42e3d7a f1ab38c2 9d69b670 f3125891 9c9fdbf6 093d06c0",
    "8ca37ee2 b15693f0 6e910cf4 3c4e32f1 d5551dda 8b1e48cb 6ddd55e4 40dbc7b2 96b60191 9a4e4069 f59239ca 247ff693 f7daa42f 086122b1",
    "982c0ec7 f43d9f97 c0a74b36 db0abd9c a6bfb981 23a90782 787242c8 a523cdc7 6df14a91 0d544711 27e7662a 1059201f 902940cd 39d57af5",
    "baa9ab82 d07ca282 b968a911 a6c3728d 74bf2fe2 58901925 787f03ee 4be7e3cb 6684fd1b cfe5071a 9a974ad2 49a4aaa8 ca812642 16c68574",
    "2ed9ffe2 ded67a37 2b181ac5 24996402 c4297062 9db03f5e 8636cbaf 6074b523 d154a7a8 c4472c4c 353ab88c d6fec7da 7780834c c5bd5242",
    "f063769e 4241e76d 815800e4 933a3a14 4327a30e c40758ad 3723a788 388399f7 b3f5d45b 6351eb8e ddefda7d 5bff4ee9 20d338a8 b89d8b63",
    "5a0104f1 f55d152c eb68bc13 81824998 91d90ee8 f09b4003 8ccc1e07 cb621fd4 62f781d0 45732a4f 0bda73f0 b2acf943 55424ff0 388d4b9c",
]
EXPECTED_B3_RAW = [  # Group Elements from Uniform Byte Strings
    (
        "cbb8c991fd2f0b7e1913462d6463e4fd2ce4ccdd28274dc2ca1f4165 d5ee6cdccea57be3416e166fd06718a31af45a2f8e987e301be59ae6 673e963001dbbda80df47014a21a26d6c7eb4ebe0312aa6fffb8d1b2 6bc62ca40ed51f8057a635a02c2b8c83f48fa6a2d70f58a1185902c0",
        "0c709c96 07dbb01c 94513358 745b7c23 953d03b3 3e39c723 4e268d1d 6e24f340 14ccbc22 16b965dd 231d5327 e591dc3c 0e8844cc fd568848",
    ),
    (
        "b6d8da654b13c3101d6634a231569e6b85961c3f4b460a08ac4a5857 069576b64428676584baa45b97701be6d0b0ba18ac28d443403b4569 9ea0fbd1164f5893d39ad8f29e48e399aec5902508ea95e33bc1e9e4 620489d684eb5c26bc1ad1e09aba61fabc2cdfee0b6b6862ffc8e55a",
        "76ab794e 28ff1224 c727fa10 16bf7f1d 329260b7 218a39ae a2fdb17d 8bd91190 17b093d6 41cedf74 328c3271 84dc6f2a 64bd90ed dccfcdab",
    ),
    (
        "36a69976c3e5d74e4904776993cbac27d10f25f5626dd45c51d15dcf 7b3e6a5446a6649ec912a56895d6baa9dc395ce9e34b868d9fb2c1fc 72eb6495702ea4f446c9b7a188a4e0826b1506b0747a6709f37988ff 1aeb5e3788d5076ccbb01a4bc6623c92ff147a1e21b29cc3fdd0e0f4",
        "c8d7ac38 4143500e 50890a1c 25d64334 3accce58 4caf2544 f9249b2b f4a69210 82be0e7f 3669bb5e c24535e6 c45621e1 f6dec676 edd8b664",
    ),
    (
        "d5938acbba432ecd5617c555a6a777734494f176259bff9dab844c81 aadcf8f7abd1a9001d89c7008c1957272c1786a4293bb0ee7cb37cf3 988e2513b14e1b75249a5343643d3c5e5545a0c1a2a4d3c685927c38 bc5e5879d68745464e2589e000b31301f1dfb7471a4f1300d6fd0f99",
        "62beffc6 b8ee11cc d79dbaac 8f0252c7 50eb052b 192f41ee ecb12f29 79713b56 3caf7d22 588eca5e 80995241 ef963e7a d7cb7962 f343a973",
    ),
    (
        "4dec58199a35f531a5f0a9f71a53376d7b4bdd6bbd2904234a8ea65b bacbce2a542291378157a8f4be7b6a092672a34d85e473b26ccfbd4c dc6739783dc3f4f6ee3537b7aed81df898c7ea0ae89a15b5559596c2 a5eeacf8b2b362f3db2940e3798b63203cae77c4683ebaed71533e51",
        "f4ccb31d 263731ab 88bed634 304956d2 603174c6 6da38742 053fa37d d902346c 3862155d 68db63be 87439e3d 68758ad7 268e239d 39c4fd3b",
    ),
    (
        "df2aa1536abb4acab26efa538ce07fd7bca921b13e17bc5ebcba7d1b 6b733deda1d04c220f6b5ab35c61b6bcb15808251cab909a01465b8a e3fc770850c66246d5a9eae9e2877e0826e2b8dc1bc08009590bc677 8a84e919fbd28e02a0f9c49b48dc689eb5d5d922dc01469968ee81b5",
        "7e79b00e 8e0a76a6 7c0040f6 2713b8b8 c6d6f05e 9c6d0259 2e8a22ea 896f5dea cc7c7df5 ed42beae 6fedb900 0285b482 aa504e27 9fd49c32",
    ),
    (
        "e9fb440282e07145f1f7f5ecf3c273212cd3d26b836b41b02f108431 488e5e84bd15f2418b3d92a3380dd66a374645c2a995976a015632d3 6a6c2189f202fc766e1c82f50ad9189be190a1f0e8f9b9e69c9c18cc 98fdd885608f68bf0fdedd7b894081a63f70016a8abf04953affbefa",
        "20b171cb 16be977f 15e013b9 752cf86c 54c631c4 fc8cbf7c 03c4d3ac 9b8e8640 e7b0e930 0b987fe0 ab504466 9314f6ed 1650ae03 7db853f1",
    ),
]

EXPECTED_B1 = [bytes.fromhex(x.replace(" ", "")) for x in EXPECTED_B1_RAW]
EXPECTED_B2 = [bytes.fromhex(x.replace(" ", "")) for x in EXPECTED_B2_RAW]
EXPECTED_B3 = [(bytes.fromhex(x[0].replace(" ", "")), bytes.fromhex(x[1].replace(" ", ""))) for x in EXPECTED_B3_RAW]


class TestDecaf448Point:
    def test_encode_decode(self):
        for e in EXPECTED_B1:
            assert Decaf448.from_bytes(e).to_bytes() == e

    def test_multiples_of_generator(self):
        curr = Decaf448.from_bytes(EXPECTED_B1[0])
        for i in range(1, len(EXPECTED_B1)):
            curr = curr + Decaf448.from_bytes(EXPECTED_B1[1])
            assert curr.to_bytes() == EXPECTED_B1[i], f"Addition differs at index {i}"

    def test_invalid_encodings(self):
        for e in EXPECTED_B2:
            try:
                Decaf448.from_bytes(e)
                assert False, f"Should have raised ValueError for '{e.hex()}'"
            except ValueError:
                pass

    def test_group_elements_from_uniform_byte_strings(self):
        for b, expected in EXPECTED_B3:
            point = Decaf448.derive(b)
            assert point.to_bytes() == expected
