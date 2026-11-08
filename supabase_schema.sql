-- ==============================================================================
-- كود SQL الشامل والمحدث لتطبيق "سوق سوريا" في Supabase
-- يدعم: تسجيل الدخول عبر Google و Facebook، والتسجيل بالبريد، والمزامنة التلقائية
-- انسخ هذا الكود بالكامل، والصقه في SQL Editor في لوحة Supabase واضغط على RUN
-- ==============================================================================

-- 1. جدول الملفات الشخصية الموحد (Profiles)
-- يستقبل بيانات المستخدم سواء سجل عبر (Google، Facebook، أو البريد الإلكتروني مع البيانات السورية)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  email text,
  full_name text,
  avatar_url text,
  provider text default 'email',
  father_name text,
  mother_name text,
  birth_place_date text,
  province text,
  address text,
  national_id text,
  is_verified boolean default false
);

-- تمكين سياسات الأمان RLS للملفات الشخصية
alter table public.profiles enable row level security;

-- السماح للجميع بقراءة الملفات الشخصية العامة
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

-- السماح للمستخدم بتحديث ملفه الشخصي فقط
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- السماح للمستخدم بإنشاء ملفه الشخصي
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);


-- ==============================================================================
-- 2. دالة و Trigger تلقائي لمزامنة المستخدمين (سواء من Google أو Facebook أو البريد)
-- هذا التريغر ينشئ ملف المستخدم تلقائياً في السحابة فور نجاح تسجيله
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    avatar_url,
    provider,
    father_name,
    mother_name,
    birth_place_date,
    province,
    address,
    national_id,
    is_verified
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    coalesce(new.raw_app_meta_data->>'provider', 'email'),
    coalesce(new.raw_user_meta_data->>'father_name', ''),
    coalesce(new.raw_user_meta_data->>'mother_name', ''),
    coalesce(new.raw_user_meta_data->>'birth_place_date', ''),
    coalesce(new.raw_user_meta_data->>'province', ''),
    coalesce(new.raw_user_meta_data->>'address', ''),
    coalesce(new.raw_user_meta_data->>'national_id', ''),
    case when new.email_confirmed_at is not null then true else false end
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    avatar_url = coalesce(nullif(excluded.avatar_url, ''), public.profiles.avatar_url),
    is_verified = excluded.is_verified,
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer;

-- تفعيل التريغر
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute procedure public.handle_new_user();


-- ==============================================================================
-- 3. جدول المنتجات والإعلانات (Products)
-- ==============================================================================
create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  category text not null,
  sub_category text not null,
  province text not null,
  location text not null,
  price text,
  whatsapp text not null,
  image_url text,
  description text
);

alter table public.products enable row level security;

-- السماح للجميع بقراءة وتصفح الإعلانات
drop policy if exists "Allow public read access" on public.products;
create policy "Allow public read access"
  on public.products for select
  using (true);

-- السماح للمستخدمين بإضافة إعلانات
drop policy if exists "Allow anyone or authenticated users to insert" on public.products;
create policy "Allow anyone or authenticated users to insert"
  on public.products for insert
  with check (true);

-- السماح لصاحب الإعلان فقط بتعديل أو حذف إعلانه
drop policy if exists "Allow owners to update their products" on public.products;
create policy "Allow owners to update their products"
  on public.products for update
  using (auth.uid() = user_id);

-- السماح لصاحب الإعلان بحذف إعلانه، والسماح بحذف الإعلانات المنشورة كزائر (user_id is null)
drop policy if exists "Allow owners to delete their products" on public.products;
create policy "Allow owners to delete their products"
  on public.products for delete
  using (auth.uid() = user_id or user_id is null);


-- ==============================================================================
-- 4. جدول إشعارات إدارة التطبيق (Notifications)
-- ==============================================================================
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  message text not null,
  is_read boolean default false
);

alter table public.notifications enable row level security;

drop policy if exists "Allow public read notifications" on public.notifications;
create policy "Allow public read notifications"
  on public.notifications for select
  using (true);

-- صلاحيات القراءة العامة
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
