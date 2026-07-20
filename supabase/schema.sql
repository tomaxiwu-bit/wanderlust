-- ============================================================
-- Wanderlust 数据库 Schema
-- 在 Supabase Dashboard → SQL Editor 中执行此文件
-- ============================================================

-- ==================== profiles 表 ====================
-- 扩展 auth.users，存储账号资料（其中 email 必须保持私有）
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text unique not null,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

-- 自动为新注册用户创建 profile 记录
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
  candidate_username text;
  suffix integer := 1;
begin
  base_username := left(
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'username'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'traveler'
    ),
    56
  );
  candidate_username := base_username;

  -- 用户名是公开唯一字段。为常见的重名自动添加序号，避免注册触发器
  -- 因唯一约束报错而回滚整个注册。
  while exists (
    select 1 from public.profiles where username = candidate_username
  ) loop
    candidate_username := left(base_username, 56 - length(suffix::text)) || '-' || suffix::text;
    suffix := suffix + 1;
  end loop;

  insert into public.profiles (id, email, username)
  values (
    new.id,
    new.email,
    candidate_username
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==================== trips 表 ====================
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  destination text not null,
  start_date date not null,
  end_date date not null,
  cover_image text,
  status text not null default 'planning' check (status in ('planning', 'ongoing', 'completed', 'archived')),
  visibility text not null default 'private' check (visibility in ('private', 'public', 'friends')),
  base_currency text not null default 'CNY',
  budget_limit numeric(12, 2),
  participants text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_trips_user_id on public.trips(user_id);
create index if not exists idx_trips_visibility on public.trips(visibility) where visibility = 'public';

-- 兼容已有项目：参与者在早期版本仅保存在浏览器 localStorage。
alter table public.trips
  add column if not exists participants text[] not null default '{}';

-- ==================== places 表 ====================
create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_index integer not null default 0,
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  type text not null default 'other' check (type in ('attraction', 'restaurant', 'hotel', 'transport', 'shopping', 'other')),
  stay_minutes integer,
  "order" integer not null default 0,
  notes text,
  rating integer check (rating >= 1 and rating <= 5),
  image_url text,
  website_url text
);

create index if not exists idx_places_trip_id on public.places(trip_id);

-- ==================== expenses 表 ====================
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  place_id uuid references public.places(id) on delete set null,
  category text not null default 'other' check (category in ('transport', 'accommodation', 'food', 'ticket', 'shopping', 'other')),
  amount numeric(12, 2) not null,
  currency text not null default 'CNY',
  converted_amount numeric(12, 2),
  date date not null,
  description text,
  paid_by text,
  split_among text[] not null default '{}'
);

create index if not exists idx_expenses_trip_id on public.expenses(trip_id);

-- 兼容已有项目：费用拆分元数据必须与支出一同同步。
alter table public.expenses
  add column if not exists paid_by text,
  add column if not exists split_among text[] not null default '{}';

-- ==================== notes 表 ====================
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  place_id uuid references public.places(id) on delete set null,
  title text not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notes_trip_id on public.notes(trip_id);

-- ==================== packing_items 表 ====================
create table if not exists public.packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  category text not null default 'miscellaneous' check (
    category in ('essentials', 'clothing', 'toiletries', 'electronics', 'documents', 'miscellaneous')
  ),
  packed boolean not null default false,
  quantity integer not null default 1 check (quantity > 0),
  suggested boolean not null default false,
  notes text
);

create index if not exists idx_packing_items_trip_id on public.packing_items(trip_id);

-- ==================== updated_at 自动更新触发器 ====================
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trips_updated_at on public.trips;
create trigger trips_updated_at before update on public.trips
  for each row execute function public.update_updated_at();

drop trigger if exists notes_updated_at on public.notes;
create trigger notes_updated_at before update on public.notes
  for each row execute function public.update_updated_at();

-- ==================== RLS 策略 ====================

-- profiles: 资料包含 email；仅本人可读取和修改。
-- 公开行程页面不依赖 profile 联表，避免意外暴露账号邮箱。
alter table public.profiles enable row level security;

drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

-- trips: 本人可 CRUD，公开行程所有人可查看
alter table public.trips enable row level security;

drop policy if exists "trips_select_own" on public.trips;
create policy "trips_select_own" on public.trips
  for select using (auth.uid() = user_id);

drop policy if exists "trips_select_public" on public.trips;
create policy "trips_select_public" on public.trips
  for select using (visibility = 'public');

drop policy if exists "trips_insert" on public.trips;
create policy "trips_insert" on public.trips
  for insert with check (auth.uid() = user_id);

drop policy if exists "trips_update" on public.trips;
create policy "trips_update" on public.trips
  for update using (auth.uid() = user_id);

drop policy if exists "trips_delete" on public.trips;
create policy "trips_delete" on public.trips
  for delete using (auth.uid() = user_id);

-- places: 通过父行程判断权限
alter table public.places enable row level security;

drop policy if exists "places_select" on public.places;
create policy "places_select" on public.places
  for select using (
    exists (
      select 1 from public.trips
      where trips.id = places.trip_id
      and (trips.user_id = auth.uid() or trips.visibility = 'public')
    )
  );

drop policy if exists "places_insert" on public.places;
create policy "places_insert" on public.places
  for insert with check (
    exists (
      select 1 from public.trips
      where trips.id = places.trip_id and trips.user_id = auth.uid()
    )
  );

drop policy if exists "places_update" on public.places;
create policy "places_update" on public.places
  for update using (
    exists (
      select 1 from public.trips
      where trips.id = places.trip_id and trips.user_id = auth.uid()
    )
  );

drop policy if exists "places_delete" on public.places;
create policy "places_delete" on public.places
  for delete using (
    exists (
      select 1 from public.trips
      where trips.id = places.trip_id and trips.user_id = auth.uid()
    )
  );

-- expenses: 通过父行程判断权限
alter table public.expenses enable row level security;

drop policy if exists "expenses_select" on public.expenses;
create policy "expenses_select" on public.expenses
  for select using (
    exists (
      select 1 from public.trips
      where trips.id = expenses.trip_id
      and (trips.user_id = auth.uid() or trips.visibility = 'public')
    )
  );

drop policy if exists "expenses_insert" on public.expenses;
create policy "expenses_insert" on public.expenses
  for insert with check (
    exists (
      select 1 from public.trips
      where trips.id = expenses.trip_id and trips.user_id = auth.uid()
    )
  );

drop policy if exists "expenses_update" on public.expenses;
create policy "expenses_update" on public.expenses
  for update using (
    exists (
      select 1 from public.trips
      where trips.id = expenses.trip_id and trips.user_id = auth.uid()
    )
  );

drop policy if exists "expenses_delete" on public.expenses;
create policy "expenses_delete" on public.expenses
  for delete using (
    exists (
      select 1 from public.trips
      where trips.id = expenses.trip_id and trips.user_id = auth.uid()
    )
  );

-- notes: 通过父行程判断权限
alter table public.notes enable row level security;

drop policy if exists "notes_select" on public.notes;
create policy "notes_select" on public.notes
  for select using (
    exists (
      select 1 from public.trips
      where trips.id = notes.trip_id
      and (trips.user_id = auth.uid() or trips.visibility = 'public')
    )
  );

drop policy if exists "notes_insert" on public.notes;
create policy "notes_insert" on public.notes
  for insert with check (
    exists (
      select 1 from public.trips
      where trips.id = notes.trip_id and trips.user_id = auth.uid()
    )
  );

drop policy if exists "notes_update" on public.notes;
create policy "notes_update" on public.notes
  for update using (
    exists (
      select 1 from public.trips
      where trips.id = notes.trip_id and trips.user_id = auth.uid()
    )
  );

drop policy if exists "notes_delete" on public.notes;
create policy "notes_delete" on public.notes
  for delete using (
    exists (
      select 1 from public.trips
      where trips.id = notes.trip_id and trips.user_id = auth.uid()
    )
  );

-- packing_items: 通过父行程判断权限
alter table public.packing_items enable row level security;

drop policy if exists "packing_items_select" on public.packing_items;
create policy "packing_items_select" on public.packing_items
  for select using (
    exists (
      select 1 from public.trips
      where trips.id = packing_items.trip_id
      and (trips.user_id = auth.uid() or trips.visibility = 'public')
    )
  );

drop policy if exists "packing_items_insert" on public.packing_items;
create policy "packing_items_insert" on public.packing_items
  for insert with check (
    exists (
      select 1 from public.trips
      where trips.id = packing_items.trip_id and trips.user_id = auth.uid()
    )
  );

drop policy if exists "packing_items_update" on public.packing_items;
create policy "packing_items_update" on public.packing_items
  for update using (
    exists (
      select 1 from public.trips
      where trips.id = packing_items.trip_id and trips.user_id = auth.uid()
    )
  );

drop policy if exists "packing_items_delete" on public.packing_items;
create policy "packing_items_delete" on public.packing_items
  for delete using (
    exists (
      select 1 from public.trips
      where trips.id = packing_items.trip_id and trips.user_id = auth.uid()
    )
  );

-- ==================== fork 函数 ====================
-- 深拷贝一个公开行程到当前用户（含 places, expenses, notes）
create or replace function public.fork_trip(source_trip_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_trip_id uuid;
  source_trip record;
  source_place record;
  new_place_id uuid;
  place_id_map jsonb;
begin
  if auth.uid() is null then
    raise exception '请先登录后再复制行程';
  end if;

  -- 获取源行程
  select * into source_trip from public.trips where id = source_trip_id and visibility = 'public';
  if not found then
    raise exception '行程不存在或不是公开行程';
  end if;

  -- 创建新行程
  insert into public.trips (user_id, title, description, destination, start_date, end_date, cover_image, status, visibility, base_currency, budget_limit, participants)
  values (
    auth.uid(),
    source_trip.title,
    source_trip.description,
    source_trip.destination,
    source_trip.start_date,
    source_trip.end_date,
    source_trip.cover_image,
    'planning',
    'private',
    source_trip.base_currency,
    source_trip.budget_limit,
    source_trip.participants
  )
  returning id into new_trip_id;

  -- 复制地点，并保留旧地点 ID 到新地点 ID 的映射，供支出和笔记重建关联。
  place_id_map := '{}'::jsonb;
  for source_place in
    select * from public.places
    where trip_id = source_trip_id
    order by day_index, "order"
  loop
    insert into public.places (
      trip_id, day_index, name, address, lat, lng, type, stay_minutes,
      "order", notes, rating, image_url, website_url
    )
    values (
      new_trip_id, source_place.day_index, source_place.name,
      source_place.address, source_place.lat, source_place.lng,
      source_place.type, source_place.stay_minutes, source_place."order",
      source_place.notes, source_place.rating, source_place.image_url,
      source_place.website_url
    )
    returning id into new_place_id;

    place_id_map := place_id_map || jsonb_build_object(
      source_place.id::text,
      new_place_id::text
    );
  end loop;

  -- 复制支出
  insert into public.expenses (trip_id, place_id, category, amount, currency, converted_amount, date, description, paid_by, split_among)
  select
    new_trip_id,
    case
      when place_id is null then null
      else (place_id_map ->> place_id::text)::uuid
    end,
    category, amount, currency, converted_amount, date, description, paid_by, split_among
  from public.expenses where trip_id = source_trip_id;

  -- 复制笔记
  insert into public.notes (trip_id, place_id, title, content)
  select
    new_trip_id,
    case
      when place_id is null then null
      else (place_id_map ->> place_id::text)::uuid
    end,
    title, content
  from public.notes where trip_id = source_trip_id;

  -- 复制打包清单
  insert into public.packing_items (trip_id, name, category, packed, quantity, suggested, notes)
  select new_trip_id, name, category, packed, quantity, suggested, notes
  from public.packing_items where trip_id = source_trip_id;

  return new_trip_id;
end;
$$;

revoke all on function public.fork_trip(uuid) from public;
grant execute on function public.fork_trip(uuid) to authenticated;
