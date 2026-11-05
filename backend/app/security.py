from argon2 import PasswordHasher
from argon2.exceptions import VerificationError

# Hash de senhas com Argon2id (RNF02). Os parâmetros são os padrões da biblioteca.
_hasher = PasswordHasher()

# Usado quando o e-mail não existe, para que a resposta leve o mesmo tempo de uma senha real
# e não revele se a conta existe (RF01).
_HASH_FICTICIO = _hasher.hash("senha-ficticia-usada-so-para-igualar-o-tempo")


def gerar_hash_senha(senha: str) -> str:
    return _hasher.hash(senha)


def verificar_senha(senha_hash: str, senha: str) -> bool:
    """Retorna True se a senha confere com o hash. Senha errada retorna False, sem lançar erro."""
    try:
        return _hasher.verify(senha_hash, senha)
    except VerificationError:  # inclui VerifyMismatchError (senha errada)
        return False


def precisa_rehash(senha_hash: str) -> bool:
    """Indica se o hash foi gerado com parâmetros antigos e deve ser atualizado."""
    return _hasher.check_needs_rehash(senha_hash)


def verificar_senha_ficticia(senha: str) -> None:
    """Gasta o mesmo tempo de uma verificação real, sem resultado. Usada para e-mails inexistentes."""
    verificar_senha(_HASH_FICTICIO, senha)
