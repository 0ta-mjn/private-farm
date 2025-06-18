-- Custom SQL migration file, put your code below! --
create or replace function public.link_oauth_identity()
returns trigger as $$
begin
  insert into public.user_external_accounts
         (user_id, provider, provider_user_id, display_name)
  values (new.user_id, new.provider, new.provider_id, new.identity_data->>'name')
  on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_link_oauth_identity on auth.identities;
create trigger trg_link_oauth_identity
after insert on auth.identities
for each row
execute procedure public.link_oauth_identity();
