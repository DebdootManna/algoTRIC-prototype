from src.crypto import aes_rsa_hybrid as hybrid

def test_roundtrip():
    pub, priv = hybrid.generate_rsa_keypair(2048)
    data = b"test-data" * 100
    payload = hybrid.hybrid_encrypt(pub, data)
    out = hybrid.hybrid_decrypt(priv, payload)
    assert out == data
