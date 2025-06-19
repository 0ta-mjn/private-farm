-- Supabase Authでユーザー作成時にpublic.usersテーブルにレコードを自動追加するトリガー

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users
         (id, name, created_at, updated_at)
  values (new.id,
            coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
          now(),
          now())
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- 既存のトリガーを削除（もし存在すれば）
drop trigger if exists trg_handle_new_user on auth.users;

-- 新しいトリガーを作成
create trigger trg_handle_new_user
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- Supabase AuthでOAuth認証を使用してユーザーがログインした際に
-- public.user_external_accountsテーブルにレコードを自動追加するトリガー
create or replace function public.link_oauth_identity()
returns trigger as $$
begin
  insert into public.user_external_accounts
         (user_id, provider, provider_user_id, display_name)
  values (new.user_id, new.provider, new.provider_id, coalesce(new.identity_data->>'display_name', new.identity_data->>'full_name', new.identity_data->>'name', ''))
  on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_link_oauth_identity on auth.identities;
create trigger trg_link_oauth_identity
after insert on auth.identities
for each row
execute procedure public.link_oauth_identity();
