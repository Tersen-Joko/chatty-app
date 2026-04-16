-- Chatty Social Media Database Schema

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

-- Posts table
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  image_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.posts enable row level security;

create policy "posts_select_all" on public.posts for select using (true);
create policy "posts_insert_own" on public.posts for insert with check (auth.uid() = user_id);
create policy "posts_update_own" on public.posts for update using (auth.uid() = user_id);
create policy "posts_delete_own" on public.posts for delete using (auth.uid() = user_id);

-- Likes table
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(user_id, post_id)
);

alter table public.likes enable row level security;

create policy "likes_select_all" on public.likes for select using (true);
create policy "likes_insert_own" on public.likes for insert with check (auth.uid() = user_id);
create policy "likes_delete_own" on public.likes for delete using (auth.uid() = user_id);

-- Comments table
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now()
);

alter table public.comments enable row level security;

create policy "comments_select_all" on public.comments for select using (true);
create policy "comments_insert_own" on public.comments for insert with check (auth.uid() = user_id);
create policy "comments_update_own" on public.comments for update using (auth.uid() = user_id);
create policy "comments_delete_own" on public.comments for delete using (auth.uid() = user_id);

-- Friendships table
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(requester_id, addressee_id)
);

alter table public.friendships enable row level security;

create policy "friendships_select_own" on public.friendships for select 
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "friendships_insert_own" on public.friendships for insert 
  with check (auth.uid() = requester_id);
create policy "friendships_update_addressee" on public.friendships for update 
  using (auth.uid() = addressee_id);
create policy "friendships_delete_own" on public.friendships for delete 
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Groups table
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  cover_image_url text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  is_private boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.groups enable row level security;

create policy "groups_select_all" on public.groups for select using (true);
create policy "groups_insert_auth" on public.groups for insert with check (auth.uid() = created_by);
create policy "groups_update_owner" on public.groups for update using (auth.uid() = created_by);
create policy "groups_delete_owner" on public.groups for delete using (auth.uid() = created_by);

-- Group members table
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'moderator', 'member')),
  joined_at timestamp with time zone default now(),
  unique(group_id, user_id)
);

alter table public.group_members enable row level security;

create policy "group_members_select_all" on public.group_members for select using (true);
create policy "group_members_insert_own" on public.group_members for insert with check (auth.uid() = user_id);
create policy "group_members_delete_own" on public.group_members for delete using (auth.uid() = user_id);

-- Saved posts table
create table if not exists public.saved_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(user_id, post_id)
);

alter table public.saved_posts enable row level security;

create policy "saved_posts_select_own" on public.saved_posts for select using (auth.uid() = user_id);
create policy "saved_posts_insert_own" on public.saved_posts for insert with check (auth.uid() = user_id);
create policy "saved_posts_delete_own" on public.saved_posts for delete using (auth.uid() = user_id);

-- Messages table for real-time chat
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  read boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.messages enable row level security;

create policy "messages_select_own" on public.messages for select 
  using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "messages_insert_own" on public.messages for insert 
  with check (auth.uid() = sender_id);
create policy "messages_update_receiver" on public.messages for update 
  using (auth.uid() = receiver_id);

-- Profile trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', null)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Enable realtime for messages
alter publication supabase_realtime add table messages;
