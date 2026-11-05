from argon2 import PasswordHasher

# Hash de senhas com Argon2id (RNF02). Os parâmetros são os padrões da biblioteca.
_hasher = PasswordHasher()


def gerar_hash_senha(senha: str) -> str:
    return _hasher.hash(senha)
