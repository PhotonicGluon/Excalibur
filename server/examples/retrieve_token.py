import json
from base64 import b64decode, b64encode

import requests
from Crypto.Cipher import AES
from Crypto.Hash import SHA1
from Crypto.Util.number import bytes_to_long, long_to_bytes

from excalibur_server.api.v1.security.auth.srp import generate_m1, premaster_to_master
from excalibur_server.api.v1.security.consts import SRP_GROUP

HOST = "localhost"
PORT = 8000
URL = f"http://{HOST}:{PORT}/api/v1"

N = 167609434410335061345139523764350090260135525329813904557420930309800865859473551531551523800013916573891864789934747039010546328480848979516637673776605610374669426214776197828492691384519453218253702788022233205683635831626913357154941914129985489522629902540768368409482248290641036967659389658897350067939
G = 2
K = int("7556AA04 5AEF2CDD 07ABAF0F 665C3E81 8913186F".replace(" ", ""), 16)

X = int("94B7555A ABE9127C C58CCF49 93DB6CF8 4D16C124".replace(" ", ""), 16)
S = int("BEB25379 D1A8581E B5A72767 3A2441EE".replace(" ", ""), 16)

A_PRIV = int("60975527 035CF2AD 1989806F 0407210B C81EDC04 E2762A56 AFD529DD DA2D4393".replace(" ", ""), 16)

gMasterSecret: bytes = None


def form_verify_request(handshake_response):
    global gMasterSecret

    RESPONSE_FORMAT = {
        "handshake_uuid": "FILL_IN",
        "salt": "vrJTedGoWB61pydnOiRB7g==",
        "client_public_value": "YdXkkPbxt5VHsHBMQ29SPdDlYPDGQRW7clV+xENS6JAyEcBGkictiy0aU1iizxtuC/z5n5IVMOyOOTVheerkXkK6kq6s7YJRceHoua9tnAPhMn9Evgh+8GUw5p9mYVJh7vVAc8oRz1hY8O39/hXv6rNJ7112mIo2cvrEewdpRHs=",
        "server_public_value": "FILL_IN",
        "m1": "FILL_IN",
    }

    a_pub = b64decode(RESPONSE_FORMAT["client_public_value"])
    b_pub = b64decode(handshake_response["server_public_value"])
    u = SHA1.new(a_pub + b_pub).digest()
    u = bytes_to_long(u)
    premaster_secret = bytes_to_long(b_pub) - K * pow(G, X, N)
    premaster_secret = pow(premaster_secret, A_PRIV + u * X, N)

    gMasterSecret = premaster_to_master(premaster_secret)
    m1 = generate_m1(SRP_GROUP, long_to_bytes(S), bytes_to_long(a_pub), bytes_to_long(b_pub), gMasterSecret)

    RESPONSE_FORMAT["handshake_uuid"] = handshake_response["handshake_uuid"]
    RESPONSE_FORMAT["server_public_value"] = handshake_response["server_public_value"]
    RESPONSE_FORMAT["m1"] = b64encode(m1).decode("UTF-8")

    return RESPONSE_FORMAT


# Handshake
print("Handshake...")
response = requests.post(
    f"{URL}/security/srp/handshake",
    json="YdXkkPbxt5VHsHBMQ29SPdDlYPDGQRW7clV+xENS6JAyEcBGkictiy0aU1iizxtuC/z5n5IVMOyOOTVheerkXkK6kq6s7YJRceHoua9tnAPhMn9Evgh+8GUw5p9mYVJh7vVAc8oRz1hY8O39/hXv6rNJ7112mIo2cvrEewdpRHs=",
)
response.raise_for_status()
handshake_response = response.json()

# Verify
print("Verify...")
response = requests.post(
    f"{URL}/security/srp/check-validity",
    json=form_verify_request(handshake_response),
)
response.raise_for_status()

print("Valid UUID found:", handshake_response["handshake_uuid"])

# Retrieve token
print("Retrieve token...")
response = requests.post(
    f"{URL}/security/generate-token",
    json=handshake_response["handshake_uuid"],
)
response.raise_for_status()
ciphertext, nonce, tag = response.json()["ciphertext"], response.json()["nonce"], response.json()["tag"]
print("Encoded Token:", ciphertext)
token = json.loads(
    AES.new(gMasterSecret, AES.MODE_GCM, nonce=b64decode(nonce))
    .decrypt_and_verify(b64decode(ciphertext), b64decode(tag))
    .decode("UTF-8")
)["token"]
print("Decoded Token:", token)
