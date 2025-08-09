"""AES+RSA hybrid encryption prototype.
Usage:
    python -m src.crypto.aes_rsa_hybrid --demo
"""
import argparse
from Crypto.Cipher import AES, PKCS1_OAEP
from Crypto.PublicKey import RSA
from Crypto.Random import get_random_bytes
from base64 import b64encode, b64decode

def generate_rsa_keypair(bits: int = 2048):
    key = RSA.generate(bits)
    priv = key.export_key()
    pub = key.publickey().export_key()
    return pub, priv

def aes_encrypt(plaintext: bytes):
    key = get_random_bytes(32)  # AES-256
    cipher = AES.new(key, AES.MODE_GCM)
    ciphertext, tag = cipher.encrypt_and_digest(plaintext)
    return key, cipher.nonce, ciphertext, tag

def aes_decrypt(key: bytes, nonce: bytes, ciphertext: bytes, tag: bytes) -> bytes:
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    plaintext = cipher.decrypt_and_verify(ciphertext, tag)
    return plaintext

def rsa_encrypt_oaep(pubkey_pem: bytes, data: bytes) -> bytes:
    pub = RSA.import_key(pubkey_pem)
    cipher_rsa = PKCS1_OAEP.new(pub)
    return cipher_rsa.encrypt(data)

def rsa_decrypt_oaep(privkey_pem: bytes, ciphertext: bytes) -> bytes:
    priv = RSA.import_key(privkey_pem)
    cipher_rsa = PKCS1_OAEP.new(priv)
    return cipher_rsa.decrypt(ciphertext)

def hybrid_encrypt(pubkey_pem: bytes, plaintext: bytes) -> dict:
    key, nonce, ciphertext, tag = aes_encrypt(plaintext)
    enc_key = rsa_encrypt_oaep(pubkey_pem, key)
    payload = {
        "enc_key": b64encode(enc_key).decode(),
        "nonce": b64encode(nonce).decode(),
        "tag": b64encode(tag).decode(),
        "ciphertext": b64encode(ciphertext).decode(),
    }
    return payload

def hybrid_decrypt(privkey_pem: bytes, payload: dict) -> bytes:
    enc_key = b64decode(payload["enc_key"])
    nonce = b64decode(payload["nonce"])
    tag = b64decode(payload["tag"])
    ciphertext = b64decode(payload["ciphertext"])
    key = rsa_decrypt_oaep(privkey_pem, enc_key)
    plaintext = aes_decrypt(key, nonce, ciphertext, tag)
    return plaintext

def demo():
    pub, priv = generate_rsa_keypair(2048)
    message = b"Hello algoTRIC - hybrid test!" * 10
    payload = hybrid_encrypt(pub, message)
    recovered = hybrid_decrypt(priv, payload)
    assert recovered == message
    print("Demo OK — recovered plaintext matches original")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--demo", action="store_true")
    args = parser.parse_args()
    if args.demo:
        demo()
