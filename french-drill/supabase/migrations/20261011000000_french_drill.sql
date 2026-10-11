-- French Drill schema. Run in the Supabase SQL editor, or `supabase db push`.
-- Every table is owner-only via Row Level Security.

create table if not exists public.user_settings (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  new_per_day     int  not null default 12,
  daily_goal      int  not null default 25,
  intensity       text not null default 'drill',
  tenses          text[] not null default '{present,passe_compose,imparfait,futur,conditionnel,subjonctif,imperatif,plus_que_parfait}',
  reminder_times  text[] not null default '{08:00,19:30}',   -- local HH:MM, in `timezone`
  timezone        text not null default 'Europe/London',
  push_on         boolean not null default false,
  streak          int  not null default 0,
  streak_last     date,
  last_study_day  date,
  last_push_at    timestamptz,
  updated_at      timestamptz not null default now()
);

create table if not exists public.cards (
  user_id      uuid not null references auth.users(id) on delete cascade,
  id           text not null,                 -- c:aller:futur | m:aller | p:aller | w:la-maison
  kind         text not null check (kind in ('conj','meaning','pp','vocab')),
  ref          text not null,
  tense        text,
  state        text not null check (state in ('new','learning','review')),
  due          timestamptz not null,
  ivl          real not null default 0,
  ease         real not null default 2.4,
  reps         int  not null default 0,
  lapses       int  not null default 0,
  step         int  not null default 0,
  relearn      boolean not null default false,
  last_review  timestamptz,
  upd          timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists cards_due_idx on public.cards (user_id, due) where state <> 'new';
create index if not exists cards_upd_idx on public.cards (user_id, upd);

create table if not exists public.review_log (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  card_id      text not null,
  reviewed_at  timestamptz not null,
  rating       smallint not null check (rating between 0 and 3),
  wrong        int not null default 0,
  total        int not null default 1,
  ms           int not null default 0
);
create index if not exists review_log_user_time on public.review_log (user_id, reviewed_at desc);

create table if not exists public.form_stats (
  user_id    uuid not null references auth.users(id) on delete cascade,
  verb       text not null,
  tense      text not null,
  person     smallint not null,
  n_right    int not null default 0,
  n_wrong    int not null default 0,
  last_wrong timestamptz,
  primary key (user_id, verb, tense, person)
);

create table if not exists public.push_subscriptions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index if not exists push_subs_user on public.push_subscriptions (user_id);

alter table public.user_settings      enable row level security;
alter table public.cards              enable row level security;
alter table public.review_log         enable row level security;
alter table public.form_stats         enable row level security;
alter table public.push_subscriptions enable row level security;

do $$
declare t text;
begin
  foreach t in array array['user_settings','cards','review_log','form_stats','push_subscriptions'] loop
    execute format('drop policy if exists "%1$s owner" on public.%1$s', t);
    execute format(
      'create policy "%1$s owner" on public.%1$s for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t);
  end loop;
end $$;

-- Used by the send-reminders Edge Function (service role only): who is due a reminder right now.
create or replace function public.reminder_targets()
returns table (
  user_id uuid, timezone text, reminder_times text[], due_count bigint,
  streak int, streak_last date, last_study_day date, last_push_at timestamptz
)
language sql security definer set search_path = public as $$
  select s.user_id, s.timezone, s.reminder_times,
         (select count(*) from cards c where c.user_id = s.user_id and c.state <> 'new' and c.due <= now()),
         s.streak, s.streak_last, s.last_study_day, s.last_push_at
  from user_settings s
  where s.push_on
    and exists (select 1 from push_subscriptions p where p.user_id = s.user_id);
$$;
revoke all on function public.reminder_targets() from public, anon, authenticated;
grant execute on function public.reminder_targets() to service_role;
