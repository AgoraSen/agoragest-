-- ============================================================
-- AGORÀ GESTIONALE — Schema Supabase
-- Esegui questo script nell'editor SQL di Supabase
-- ============================================================

-- Abilita estensioni
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILI UTENTI (estende auth.users di Supabase)
-- ============================================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  nome text not null,
  cognome text not null,
  email text not null,
  ruolo text not null check (ruolo in ('admin','senior','base')),
  attivo boolean default true,
  created_at timestamptz default now()
);

-- Trigger: crea profilo automaticamente alla registrazione
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome, cognome, email, ruolo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', 'Nuovo'),
    coalesce(new.raw_user_meta_data->>'cognome', 'Utente'),
    new.email,
    coalesce(new.raw_user_meta_data->>'ruolo', 'base')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- CANDIDATI
-- ============================================================
create table public.candidati (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  cognome text not null,
  cf text,
  email text,
  tel text,
  comune text,
  stato text not null default 'In attesa'
    check (stato in ('In attesa','Colloquio fissato','In formazione','Collocato','Abbandonato / non risponde')),
  percorso text,
  referente_id uuid references public.profiles(id),
  note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- COLLOQUI (storico per candidato)
-- ============================================================
create table public.colloqui (
  id uuid default uuid_generate_v4() primary key,
  candidato_id uuid references public.candidati(id) on delete cascade not null,
  data date not null,
  operatore_id uuid references public.profiles(id),
  operatore_nome text,
  note text,
  created_at timestamptz default now()
);

-- ============================================================
-- APPUNTAMENTI (agenda)
-- ============================================================
create table public.appuntamenti (
  id uuid default uuid_generate_v4() primary key,
  tipo text not null check (tipo in ('colloquio','formazione','riunione','altro')),
  titolo text not null,
  candidato_id uuid references public.candidati(id) on delete set null,
  operatore_id uuid references public.profiles(id),
  sala text,
  data date not null,
  ora_inizio time not null,
  ora_fine time not null,
  note text,
  stato text default 'attivo' check (stato in ('attivo','cancellato')),
  created_at timestamptz default now()
);

-- ============================================================
-- CORSI
-- ============================================================
create table public.corsi (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  descrizione text,
  percorso text,
  data_inizio date,
  data_fine date,
  sede text,
  aula text,
  ore integer default 0,
  stato text default 'In programmazione'
    check (stato in ('In programmazione','Attivo','Concluso','Sospeso')),
  created_at timestamptz default now()
);

-- iscrizioni ai corsi
create table public.iscrizioni (
  id uuid default uuid_generate_v4() primary key,
  corso_id uuid references public.corsi(id) on delete cascade,
  candidato_id uuid references public.candidati(id) on delete cascade,
  created_at timestamptz default now(),
  unique(corso_id, candidato_id)
);

-- sessioni presenze
create table public.sessioni (
  id uuid default uuid_generate_v4() primary key,
  corso_id uuid references public.corsi(id) on delete cascade,
  data date not null,
  orario text,
  created_at timestamptz default now()
);

-- presenze per sessione
create table public.presenze (
  id uuid default uuid_generate_v4() primary key,
  sessione_id uuid references public.sessioni(id) on delete cascade,
  candidato_id uuid references public.candidati(id) on delete cascade,
  presente boolean,
  unique(sessione_id, candidato_id)
);

-- task corsi
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  titolo text not null,
  corso_id uuid references public.corsi(id) on delete cascade,
  assegnato_a uuid references public.profiles(id),
  scadenza date,
  stato text default 'todo' check (stato in ('todo','wip','done')),
  note text,
  created_at timestamptz default now()
);

-- ============================================================
-- COMUNICAZIONI — TEMPLATE
-- ============================================================
create table public.templates (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  tipo text not null check (tipo in ('convocazione','promemoria','corso','inadempiente','altro')),
  oggetto text,
  testo text not null,
  created_at timestamptz default now()
);

-- seed template
insert into public.templates (nome, tipo, oggetto, testo) values
('Conferma colloquio', 'convocazione', 'Convocazione a colloquio — Agorà',
 'Gentile {{nome}} {{cognome}},
la invitiamo a presentarsi per un colloquio il {{data_appuntamento}} alle {{ora_appuntamento}} presso {{sala}}.
Portare documento d''identità valido.
Operatore: {{operatore}}. — Agorà Società Cooperativa'),
('Promemoria 24h', 'promemoria', 'Promemoria appuntamento domani',
 'Gentile {{nome}}, ricordiamo il colloquio di domani {{data_appuntamento}} alle {{ora_appuntamento}} presso {{sala}}.
Per disdette contattare il proprio operatore. — Agorà'),
('Promemoria mattina', 'promemoria', null,
 'Gentile {{nome}}, buongiorno! Oggi alle {{ora_appuntamento}} ha il colloquio presso {{sala}}. — Agorà'),
('Cancellazione appuntamento', 'inadempiente', 'Annullamento appuntamento — Agorà',
 'Gentile {{nome}} {{cognome}},
l''appuntamento del {{data_appuntamento}} alle {{ora_appuntamento}} è stato ANNULLATO.
Sarà ricontattata/o dall''operatore {{operatore}} per fissare un nuovo appuntamento. — Agorà'),
('Non reperibile', 'inadempiente', 'Tentativo di contatto — Agorà',
 'Gentile {{nome}} {{cognome}} (C.F. {{cf}}),
abbiamo tentato di contattarla il {{data_appuntamento}} senza esito.
La invitiamo a contattarci entro 5 giorni per evitare segnalazione inadempienza.
Operatore: {{operatore}} — Agorà Società Cooperativa');

-- ============================================================
-- LOG INVII
-- ============================================================
create table public.log_invii (
  id uuid default uuid_generate_v4() primary key,
  candidato_id uuid references public.candidati(id) on delete set null,
  candidato_nome text,
  candidato_cf text,
  template_nome text,
  canale text check (canale in ('sms','email')),
  testo text,
  oggetto text,
  stato text default 'Inviato' check (stato in ('Inviato','Cancellato','Errore')),
  operatore_id uuid references public.profiles(id),
  operatore_nome text,
  appuntamento_id uuid references public.appuntamenti(id) on delete set null,
  trigger_tipo text,
  created_at timestamptz default now()
);

-- ============================================================
-- AUTOMAZIONI — REGOLE
-- ============================================================
create table public.regole_automazione (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  trigger_tipo text not null check (trigger_tipo in ('conferma','24h','mattina','cancellazione')),
  canale text not null check (canale in ('sms','email','entrambi')),
  template_id uuid references public.templates(id),
  attiva boolean default true,
  created_at timestamptz default now()
);

-- seed regole default
insert into public.regole_automazione (nome, trigger_tipo, canale, template_id)
select 'Conferma colloquio — SMS', 'conferma', 'sms', id from public.templates where nome='Conferma colloquio';
insert into public.regole_automazione (nome, trigger_tipo, canale, template_id)
select 'Conferma colloquio — Email', 'conferma', 'email', id from public.templates where nome='Conferma colloquio';
insert into public.regole_automazione (nome, trigger_tipo, canale, template_id)
select 'Promemoria 24h — SMS', '24h', 'sms', id from public.templates where nome='Promemoria 24h';
insert into public.regole_automazione (nome, trigger_tipo, canale, template_id)
select 'Promemoria mattina — SMS', 'mattina', 'sms', id from public.templates where nome='Promemoria mattina';
insert into public.regole_automazione (nome, trigger_tipo, canale, template_id)
select 'Cancellazione — SMS + Email', 'cancellazione', 'entrambi', id from public.templates where nome='Cancellazione appuntamento';

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.candidati enable row level security;
alter table public.colloqui enable row level security;
alter table public.appuntamenti enable row level security;
alter table public.corsi enable row level security;
alter table public.iscrizioni enable row level security;
alter table public.sessioni enable row level security;
alter table public.presenze enable row level security;
alter table public.tasks enable row level security;
alter table public.templates enable row level security;
alter table public.log_invii enable row level security;
alter table public.regole_automazione enable row level security;

-- Helper: ruolo utente corrente
create or replace function public.get_ruolo()
returns text as $$
  select ruolo from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- PROFILES: tutti leggono, solo admin modifica
create policy "profiles_read" on public.profiles for select using (auth.uid() is not null);
create policy "profiles_admin" on public.profiles for all using (public.get_ruolo() = 'admin');

-- CANDIDATI: base vede solo i suoi, senior/admin vedono tutti
create policy "candidati_base" on public.candidati for select
  using (
    public.get_ruolo() in ('admin','senior')
    or referente_id = auth.uid()
  );
create policy "candidati_insert" on public.candidati for insert
  with check (auth.uid() is not null);
create policy "candidati_update" on public.candidati for update
  using (
    public.get_ruolo() in ('admin','senior')
    or referente_id = auth.uid()
  );
create policy "candidati_delete" on public.candidati for delete
  using (public.get_ruolo() = 'admin');

-- COLLOQUI
create policy "colloqui_all" on public.colloqui for all using (auth.uid() is not null);

-- APPUNTAMENTI
create policy "appuntamenti_all" on public.appuntamenti for all using (auth.uid() is not null);

-- CORSI e tabelle collegate
create policy "corsi_all" on public.corsi for all using (auth.uid() is not null);
create policy "iscrizioni_all" on public.iscrizioni for all using (auth.uid() is not null);
create policy "sessioni_all" on public.sessioni for all using (auth.uid() is not null);
create policy "presenze_all" on public.presenze for all using (auth.uid() is not null);
create policy "tasks_all" on public.tasks for all using (auth.uid() is not null);

-- COMUNICAZIONI
create policy "templates_all" on public.templates for all using (auth.uid() is not null);
create policy "log_invii_all" on public.log_invii for all using (auth.uid() is not null);
create policy "regole_all" on public.regole_automazione for all using (auth.uid() is not null);
