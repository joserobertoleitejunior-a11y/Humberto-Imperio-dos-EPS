-- =====================================================================
-- Império do EPS — schema do Supabase (rodar uma vez no SQL Editor)
-- Modelo de segurança (base: San Comércio, endurecido):
--   * site (anon) só INSERE cadastros, orçamentos e analytics — nunca lê;
--   * site (anon) LÊ apenas promoções e fotos da galeria marcadas "ativo";
--   * painel: só usuários cadastrados na tabela "admins" (papel checado no
--     banco por is_admin(), não só escondendo link no front).
-- Toda tabela nasce com RLS ativa (PADROES-AGENCIA.md §4).
-- =====================================================================

-- ---------- Papel de administrador ----------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  criado_em timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

grant select on public.admins to authenticated;
create policy "admin ve a si mesmo" on public.admins for select to authenticated using (user_id = auth.uid());

-- ---------- Clientes (cadastro "Entrar com WhatsApp") ----------
create table public.clientes (
  id bigint generated always as identity primary key,
  nome text not null default '',
  whatsapp text not null default '',
  cidade text default '',
  perfil text default '',            -- construir | reformar | profissional
  origem text default '',
  visitante_id text default '',
  criado_em timestamptz not null default now(),
  constraint clientes_whatsapp check (whatsapp ~ '^[0-9]{10,13}$'),
  constraint clientes_perfil check (perfil in ('', 'construir', 'reformar', 'profissional'))
);

-- ---------- Orçamentos (calculadora → WhatsApp) ----------
create table public.orcamentos (
  id bigint generated always as identity primary key,
  nome text default '',
  whatsapp text default '',
  cidade text default '',
  bloco text default '',
  area_m2 numeric(10, 2),
  blocos_estimados integer,
  detalhes jsonb not null default '{}',
  origem text default '',
  visitante_id text default '',
  status text not null default 'novo',   -- novo | atendendo | fechado | perdido
  valor_fechado numeric(12, 2),
  criado_em timestamptz not null default now(),
  constraint orcamentos_status check (status in ('novo', 'atendendo', 'fechado', 'perdido'))
);

-- ---------- Analytics ----------
create table public.paginas_vistas (
  id bigint generated always as identity primary key,
  pagina text default '', referencia text default '',
  visitante_id text default '', cliente_whatsapp text default '',
  criado_em timestamptz not null default now()
);
create table public.cliques (
  id bigint generated always as identity primary key,
  tipo text default '', detalhe text default '', pagina text default '',
  visitante_id text default '', cliente_whatsapp text default '',
  criado_em timestamptz not null default now()
);

-- ---------- Conteúdo editável pelo painel ----------
create table public.promocoes (
  id bigint generated always as identity primary key,
  titulo text not null,
  descricao text default '',
  selo text default '',
  validade date,
  imagem_url text default '',
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  constraint promocoes_titulo check (char_length(titulo) between 3 and 120)
);
create table public.galeria (
  id bigint generated always as identity primary key,
  titulo text not null,
  categoria text not null default 'obra',  -- obra | fachada | moldura | laje | fabrica
  cidade text default '',
  imagem_url text not null,
  ativo boolean not null default true,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  constraint galeria_categoria check (categoria in ('obra', 'fachada', 'moldura', 'laje', 'fabrica'))
);

create index on public.clientes (whatsapp);
create index on public.orcamentos (criado_em desc);
create index on public.paginas_vistas (criado_em desc);
create index on public.cliques (criado_em desc);

-- ---------- RLS ----------
alter table public.clientes       enable row level security;
alter table public.orcamentos     enable row level security;
alter table public.paginas_vistas enable row level security;
alter table public.cliques        enable row level security;
alter table public.promocoes      enable row level security;
alter table public.galeria        enable row level security;

revoke all on public.clientes, public.orcamentos, public.paginas_vistas, public.cliques, public.promocoes, public.galeria from anon, authenticated;

-- Site (anon e também um admin navegando logado) só insere
grant insert on public.clientes, public.orcamentos, public.paginas_vistas, public.cliques to anon, authenticated;
create policy "site insere" on public.clientes for insert to anon, authenticated
  with check (char_length(nome) between 1 and 120 and char_length(coalesce(cidade, '')) <= 120);
create policy "site insere" on public.orcamentos for insert to anon, authenticated
  with check (status = 'novo' and valor_fechado is null and char_length(coalesce(nome, '')) <= 120
              and coalesce(area_m2, 0) between 0 and 20000 and pg_column_size(detalhes) < 4000);
create policy "site insere" on public.paginas_vistas for insert to anon, authenticated
  with check (char_length(coalesce(pagina, '')) <= 200 and char_length(coalesce(referencia, '')) <= 500);
create policy "site insere" on public.cliques for insert to anon, authenticated
  with check (char_length(coalesce(tipo, '')) <= 60 and char_length(coalesce(detalhe, '')) <= 200);

-- Site lê só conteúdo ativo
grant select on public.promocoes, public.galeria to anon, authenticated;
create policy "publico ve ativas" on public.promocoes for select to anon, authenticated using (ativo or public.is_admin());
create policy "publico ve ativas" on public.galeria   for select to anon, authenticated using (ativo or public.is_admin());

-- Painel (somente admins)
grant select on public.clientes, public.paginas_vistas, public.cliques to authenticated;
grant select, update on public.orcamentos to authenticated;
grant insert, update, delete on public.promocoes, public.galeria to authenticated;
create policy "admin le" on public.clientes       for select to authenticated using (public.is_admin());
create policy "admin le" on public.orcamentos     for select to authenticated using (public.is_admin());
create policy "admin muda" on public.orcamentos   for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin le" on public.paginas_vistas for select to authenticated using (public.is_admin());
create policy "admin le" on public.cliques        for select to authenticated using (public.is_admin());
create policy "admin cria" on public.promocoes  for insert to authenticated with check (public.is_admin());
create policy "admin muda" on public.promocoes  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin apaga" on public.promocoes for delete to authenticated using (public.is_admin());
create policy "admin cria" on public.galeria    for insert to authenticated with check (public.is_admin());
create policy "admin muda" on public.galeria    for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin apaga" on public.galeria   for delete to authenticated using (public.is_admin());

-- ---------- Storage: fotos da galeria/promoções ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
create policy "admin envia fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and public.is_admin());
create policy "admin apaga fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and public.is_admin());

-- ---------- Primeiro admin (depois de criar o usuário em Authentication → Users) ----------
-- insert into public.admins (user_id, nome) select id, 'Vinicius' from auth.users where email = 'EMAIL_DO_VINICIUS';
