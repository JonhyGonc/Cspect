import pytest
from pydantic import ValidationError

from app.schemas import CadastroRequest

DADOS_VALIDOS = {
    "email": "joao@exemplo.com",
    "senha": "senha-forte-123",
    "nome_exibicao": "João",
    "aceite_termo": True,
    "versao_termo": "0.1",
}


def _com(**alteracoes) -> dict:
    return {**DADOS_VALIDOS, **alteracoes}


def test_dados_validos_passam():
    dados = CadastroRequest(**DADOS_VALIDOS)
    assert dados.email == "joao@exemplo.com"


def test_email_e_normalizado_para_minusculas():
    dados = CadastroRequest(**_com(email="  Joao@Exemplo.COM "))
    assert dados.email == "joao@exemplo.com"


@pytest.mark.parametrize("email", ["sem-arroba", "a@b", "a b@exemplo.com", "@exemplo.com", ""])
def test_email_invalido_e_rejeitado(email):
    with pytest.raises(ValidationError):
        CadastroRequest(**_com(email=email))


def test_senha_com_menos_de_8_caracteres_e_rejeitada():
    with pytest.raises(ValidationError):
        CadastroRequest(**_com(senha="1234567"))


def test_senha_com_8_caracteres_e_aceita():
    assert CadastroRequest(**_com(senha="12345678")).senha == "12345678"


def test_nome_vazio_e_rejeitado():
    with pytest.raises(ValidationError):
        CadastroRequest(**_com(nome_exibicao=""))


def test_nome_só_com_espacos_e_rejeitado():
    with pytest.raises(ValidationError):
        CadastroRequest(**_com(nome_exibicao="   "))


def test_nome_com_mais_de_40_caracteres_e_rejeitado():
    with pytest.raises(ValidationError):
        CadastroRequest(**_com(nome_exibicao="a" * 41))


def test_aceite_nao_marcado_e_rejeitado():
    with pytest.raises(ValidationError):
        CadastroRequest(**_com(aceite_termo=False))


def test_versao_do_termo_obrigatoria():
    with pytest.raises(ValidationError):
        CadastroRequest(**_com(versao_termo="  "))
