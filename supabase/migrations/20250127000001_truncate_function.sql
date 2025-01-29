-- Create a function to truncate the users table
create or replace function truncate_users()
returns void
language plpgsql
security definer
as $$
begin
  truncate table users cascade;
end;
$$; 