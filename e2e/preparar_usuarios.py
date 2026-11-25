"""Cria os usuários do teste E2E no banco temporário. Senhas vêm do ambiente
(geradas a cada execução pelo playwright.config.ts), nunca fixas no código."""

import os

import estoque_doacoes.entidades  # noqa: F401
from estoque_doacoes.shared.database.db import SessionLocal
from estoque_doacoes.usuario.domain.enum.Role import Role
from estoque_doacoes.usuario.dto.UsuarioDTO import UsuarioCreate
from estoque_doacoes.usuario.service.UsuarioService import UsuarioService

with SessionLocal() as s:
    svc = UsuarioService(s)
    svc.criar(UsuarioCreate(nome="Chefe E2E", email="chefe@e2e.local", senha=os.environ["E2E_SENHA"], role=Role.ADMIN))
    svc.criar(UsuarioCreate(nome="Bancada E2E", email="bancada@e2e.local", senha=os.environ["E2E_SENHA"], role=Role.COMUM))
