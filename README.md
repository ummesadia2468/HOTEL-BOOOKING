# Tidewell Studio – Booking Website

Plain HTML, CSS and JavaScript with Supabase as the backend. No framework.

## Project structure
```
booking-website/
├── index.html    page layout
├── style.css     styles
├── script.js     booking logic (createBooking, fetchBookings, updateBookingStatus, deleteBooking, checkAvailability)
├── supabase.js   Supabase client + your URL and anon key
├── schema.sql    table, RLS policies, public view, availability function
└── README.md
```

## 1. Supabase setup
1. Create a project at supabase.com.
2. Open **SQL Editor**, paste all of `schema.sql`, click **Run**.
3. **Authentication → Providers → Email**: turn **off** "Allow new users to sign up".
4. **Authentication → Users → Add user**: create one staff user (email + password, tick "Auto Confirm").

## 2. Add your credentials
In **Project Settings → API**, copy the Project URL and the **anon public** key into `supabase.js`.
Never use the `service_role` key in this project.

## 3. Run locally
```
cd booking-website
python3 -m http.server 8000
```
Open http://localhost:8000 (or use the VS Code "Live Server" extension).

## How security (RLS) is set up
- RLS is **on**. Nothing is open by default.
- Visitors (`anon`) can only **insert** a booking, and only with status `pending`. They cannot read, edit or delete the table.
- The public schedule reads the `public_bookings` view: first name, service, date, time, status. No email, phone or notes.
- The availability check uses `is_slot_taken()`, which returns only true/false.
- Status changes and deletes need a signed-in staff user (`authenticated` role). Sign-ups are disabled, so only users you create can sign in.
- A unique index on date + time blocks double bookings even if two people submit at once.

Notes: any user you create in Supabase Auth gets full staff rights. For multiple roles, add a `staff` table and check it in the policies. Also add CAPTCHA/rate limiting before launching publicly, since anyone can insert bookings.

## Test checklist
1. Page loads, no console errors.
2. Submit empty form → field errors appear.
3. Submit valid form → success message, form clears, row appears in Schedule.
4. Submit the same date + time again → "Sorry, this time slot is already booked…".
5. Sign in as staff → status dropdown and Delete appear; change a status, then delete (with confirm).
6. Cancel a booking → that slot can be booked again.
7. Resize to phone width → single-column form, table scrolls sideways.

## Features
Responsive layout, booking form with validation, loading/success/error states, availability check (app + database), public schedule with empty state, staff sign-in, status updates, delete with confirmation, RLS-protected data.
