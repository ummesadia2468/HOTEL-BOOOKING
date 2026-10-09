// ---------- Setup ----------
const TIME_SLOTS = ["09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
const STATUSES = ["pending", "confirmed", "cancelled", "completed"];
let isStaff = false; // true when a staff member is signed in

const $ = (id) => document.getElementById(id);
const form = $("booking-form");

// ---------- Small helpers ----------
// Escape text before putting it into HTML (prevents script injection).
function esc(text) {
  const d = document.createElement("div");
  d.textContent = text ?? "";
  return d.innerHTML;
}

function showMessage(type, text) {
  const box = $("message");
  box.className = type;
  box.textContent = text;
  box.hidden = false;
}

function setFieldError(id, text) {
  document.querySelector(`[data-for="${id}"]`).textContent = text;
  $(id).classList.toggle("invalid", Boolean(text));
}

// ---------- Validation ----------
// Returns true if every required field is filled in correctly.
function validateForm() {
  const rules = {
    full_name: (v) => (v.length >= 2 ? "" : "Enter your full name."),
    email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? "" : "Enter a valid email address."),
    phone: (v) => (/^[+()\d\s-]{7,20}$/.test(v) ? "" : "Enter a valid phone number."),
    service: (v) => (v ? "" : "Choose a service."),
    booking_date: (v) => {
      if (!v) return "Choose a date.";
      return v < todayString() ? "Choose today or a future date." : "";
    },
    booking_time: (v) => (v ? "" : "Choose a time."),
  };
  let ok = true;
  for (const [id, check] of Object.entries(rules)) {
    const error = check($(id).value.trim());
    setFieldError(id, error);
    if (error) ok = false;
  }
  return ok;
}

function todayString() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); // use local date
  return d.toISOString().slice(0, 10);
}

// ---------- Database operations ----------

// Asks Supabase whether a date + time is already booked. Returns true/false.
async function checkAvailability(date, time) {
  const { data, error } = await db.rpc("is_slot_taken", { p_date: date, p_time: time });
  if (error) throw error;
  return !data; // available = not taken
}

// CREATE: validate, check the slot, then insert.
async function createBooking(event) {
  event.preventDefault();
  $("message").hidden = true;
  if (!validateForm()) return;

  const booking = {
    full_name: $("full_name").value.trim(),
    email: $("email").value.trim(),
    phone: $("phone").value.trim(),
    service: $("service").value,
    booking_date: $("booking_date").value,
    booking_time: $("booking_time").value,
    notes: $("notes").value.trim() || null,
    // status is not sent: the database defaults it to "pending"
  };

  const btn = $("submit-btn");
  btn.disabled = true;
  btn.textContent = "Booking…";

  try {
    const available = await checkAvailability(booking.booking_date, booking.booking_time);
    if (!available) {
      showMessage("error", "Sorry, this time slot is already booked. Please select another time.");
      return;
    }
    const { error } = await db.from("bookings").insert(booking);
    if (error) {
      // 23505 = unique violation: someone booked this slot a moment ago
      if (error.code === "23505") {
        showMessage("error", "Sorry, this time slot is already booked. Please select another time.");
        return;
      }
      throw error;
    }
    showMessage("success", `Booking received, ${booking.full_name.split(" ")[0]}! ` +
      `${booking.service} on ${booking.booking_date} at ${booking.booking_time}. Status: pending.`);
    form.reset();
    fetchBookings();
  } catch (err) {
    console.error(err);
    showMessage("error", "Something went wrong while saving your booking. Please try again.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Book now";
  }
}

// READ: visitors read the safe public view; signed-in staff read the full table.
async function fetchBookings() {
  $("loading-bookings").hidden = false;
  $("empty-state").hidden = true;
  $("bookings-table").hidden = true;

  const query = isStaff
    ? db.from("bookings").select("id, full_name, service, booking_date, booking_time, status")
    : db.from("public_bookings").select("first_name, service, booking_date, booking_time, status");
  const { data, error } = await query
    .order("booking_date", { ascending: true })
    .order("booking_time", { ascending: true });

  $("loading-bookings").hidden = true;
  if (error) {
    console.error(error);
    $("empty-state").textContent = "Could not load bookings. Check your Supabase settings.";
    $("empty-state").hidden = false;
    return;
  }
  renderBookings(data);
}

function renderBookings(bookings) {
  const body = $("bookings-body");
  body.innerHTML = "";
  document.querySelectorAll(".staff-only").forEach((el) => (el.hidden = !isStaff));

  if (bookings.length === 0) {
    $("empty-state").textContent = "No bookings yet. Be the first to book a time above.";
    $("empty-state").hidden = false;
    return;
  }

  for (const b of bookings) {
    const row = document.createElement("tr");
    const actions = isStaff
      ? `<td><select aria-label="Change status" data-id="${esc(b.id)}">
           ${STATUSES.map((s) => `<option ${s === b.status ? "selected" : ""}>${s}</option>`).join("")}
         </select>
         <button class="link danger" data-delete="${esc(b.id)}">Delete</button></td>`
      : "";
    row.innerHTML = `
      <td>${esc(b.full_name || b.first_name)}</td>
      <td>${esc(b.service)}</td>
      <td>${esc(b.booking_date)}</td>
      <td>${esc(b.booking_time.slice(0, 5))}</td>
      <td><span class="badge ${esc(b.status)}">${esc(b.status)}</span></td>${actions}`;
    body.appendChild(row);
  }
  $("bookings-table").hidden = false;
}

// UPDATE: staff only (enforced by RLS in the database).
async function updateBookingStatus(id, status) {
  const { error } = await db.from("bookings").update({ status }).eq("id", id);
  if (error) {
    console.error(error);
    alert("Could not update the status.");
  }
  fetchBookings();
}

// DELETE: staff only (enforced by RLS in the database).
async function deleteBooking(id) {
  if (!confirm("Delete this booking? This cannot be undone.")) return;
  const { error } = await db.from("bookings").delete().eq("id", id);
  if (error) {
    console.error(error);
    alert("Could not delete the booking.");
  }
  fetchBookings();
}

// ---------- Staff sign in ----------
async function refreshAuthState() {
  const { data } = await db.auth.getSession();
  isStaff = Boolean(data.session);
  $("auth-toggle").textContent = isStaff ? "Sign out" : "Staff sign in";
  $("login-form").hidden = true;
  fetchBookings();
}

async function handleLogin(event) {
  event.preventDefault();
  $("login-error").textContent = "";
  const { error } = await db.auth.signInWithPassword({
    email: $("login_email").value.trim(),
    password: $("login_password").value,
  });
  if (error) {
    $("login-error").textContent = "Sign in failed. Check your email and password.";
    return;
  }
  $("login-form").reset();
  refreshAuthState();
}

async function handleAuthToggle() {
  if (isStaff) {
    await db.auth.signOut();
    refreshAuthState();
  } else {
    $("login-form").hidden = !$("login-form").hidden;
  }
}

// ---------- Page setup ----------
function init() {
  // Fill the time dropdown and block past dates.
  $("booking_time").innerHTML += TIME_SLOTS.map((t) => `<option>${t}</option>`).join("");
  $("booking_date").min = todayString();

  form.addEventListener("submit", createBooking);
  $("login-form").addEventListener("submit", handleLogin);
  $("auth-toggle").addEventListener("click", handleAuthToggle);

  // One listener handles every status dropdown and delete button in the table.
  $("bookings-body").addEventListener("change", (e) => {
    if (e.target.dataset.id) updateBookingStatus(e.target.dataset.id, e.target.value);
  });
  $("bookings-body").addEventListener("click", (e) => {
    if (e.target.dataset.delete) deleteBooking(e.target.dataset.delete);
  });

  refreshAuthState();
}

document.addEventListener("DOMContentLoaded", init);
