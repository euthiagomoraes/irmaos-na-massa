-- =====================================================================
-- 0014 · PERFIS DE ACESSO: SÓCIO OU COLABORADOR
-- Sócio       = administrador (e o titular da conta, que segue como
--               'proprietario' para as ações exclusivas, como excluir a empresa)
-- Colaborador = atendente (dia a dia, sem exclusões/estornos e sem ver o lucro)
-- Os perfis 'gerente' e 'producao' deixam de ser usados.
-- =====================================================================

-- Quem tinha perfil antigo vira Colaborador (nunca ganha acesso a mais)
update public.empresa_membros set papel = 'atendente' where papel in ('gerente', 'producao');

alter table public.empresa_membros drop constraint if exists empresa_membros_papel_permitido;
alter table public.empresa_membros add constraint empresa_membros_papel_permitido
  check (papel in ('proprietario', 'administrador', 'atendente'));
