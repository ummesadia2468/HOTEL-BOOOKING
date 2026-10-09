-- Run this whole file in Supabase > SQL Editor.

create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  full_name    text        not null,
  email        text        not null,
  phone        text        not null,
  service      text        not null,
  booking_date date        not null,
  booking_time time        not null,
  notes        text,
  status       text        not null default 'pending'
               check (status in ('pending','confirmed','cancelled','completed')),
  created_at   timestamptz not null default now()
);

-- Database-level protection against double booking (also stops race conditions).
-- Cancelled bookings free up their slot.
create unique index if not exists bookings_unique_slot
  on public.bookings (booking_date, booking_time)
  where status <> 'cancelled';

-- Turn on Row Level Security. With RLS on and no policy, nobody can touch the table.
alter table public.bookings enable row level security;

-- Visitors (anon) may only CREATE bookings, and only as "pending".
create policy "Anyone can create a pending booking"
  on public.bookings for insert to anon, authenticated
  with check (status = 'pending');

-- Only the signed-in staff user can read full rows, change status, or delete.
create policy "Staff can read bookings"   on public.bookings for select to authenticated using (true);
create policy "Staff can update bookings" on public.bookings for update to authenticated using (true) with check (true);
create policy "Staff can delete bookings" on public.bookings for delete to authenticated using (true);

-- Public list: no email, phone, notes, and only the first name.
create or replace view public.public_bookings as
  select split_part(full_name, ' ', 1) as first_name,
         service, booking_date, booking_time, status
  from public.bookings;
grant select on public.public_bookings to anon, authenticated;

-- Availability check that reveals nothing except true/false.
create or replace function public.is_slot_taken(p_date date, p_time time)
returns boolean
language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.bookings
    where booking_date = p_date and booking_time = p_time and status <> 'cancelled'
  );
$$;
grant execute on function public.is_slot_taken(date, time) to anon, authenticated;
