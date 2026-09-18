/**
 * Nirvana Nook — Book Online page logic
 * ---------------------------------------------------------------
 * This talks to the Supabase functions set up in the database:
 *   - get_busy_slots(date)   -> read-only, no personal info returned
 *   - book_treatment(...)    -> the only way a booking can be created
 *
 * The actual "no double booking" rule lives in the database (see
 * the SQL constraint). The logic below only decides which times to
 * SHOW as available — the database is what actually enforces it,
 * so even if this file had a bug, a double-booking still couldn't
 * be saved. That's why we build it this way.
 */

document.addEventListener("DOMContentLoaded", function () {
  const serviceSelect = document.querySelector("#bk-service");
  const dateInput = document.querySelector("#bk-date");
  const checkBtn = document.querySelector("#bk-check-btn");
  const statusMsg = document.querySelector("#bk-status-msg");

  const step1 = document.querySelector("#booking-step-1");
  const step2 = document.querySelector("#booking-step-2");
  const step3 = document.querySelector("#booking-step-3");
  const confirmationBox = document.querySelector("#booking-confirmation");
  const confirmationDetail = document.querySelector("#bk-confirmation-detail");
  const slotsContainer = document.querySelector("#bk-slots");
  const backBtn = document.querySelector("#bk-back-btn");
  const changeSlotBtn = document.querySelector("#bk-change-slot-btn");

  if (!serviceSelect) return; // not on the booking page

  // Don't let people pick a date in the past
  const todayStr = new Date().toISOString().slice(0, 10);
  dateInput.setAttribute("min", todayStr);

  const STAFF_COUNT = 2;
  const BUFFER_MINUTES = 15;
  const SLOT_STEP_MINUTES = 15;
  const CAPE_TOWN_OFFSET = "+02:00"; // South Africa Standard Time, no daylight saving

  // Business hours by day of week (0 = Sunday ... 6 = Saturday)
  function hoursForDate(dateStr) {
    const day = new Date(dateStr + "T12:00:00" + CAPE_TOWN_OFFSET).getDay();
    if (day === 0) return { open: "10:00", close: "17:00" }; // Sunday
    if (day === 6) return { open: "09:00", close: "18:00" }; // Saturday
    return { open: "09:00", close: "19:00" }; // Mon-Fri
  }

  function toMinutes(timeStr) {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  }
  function toTimeStr(mins) {
    const h = Math.floor(mins / 60).toString().padStart(2, "0");
    const m = (mins % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  }
  function formatDisplayTime(timeStr) {
    const [h, m] = timeStr.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
  }

  // Same buffer logic as the database constraint (kept in sync manually)
  function fitsOnStaffTrack(staffBookings, start, end) {
    for (const b of staffBookings) {
      const blockedStart = b.start - BUFFER_MINUTES;
      const blockedEnd = b.end + BUFFER_MINUTES;
      if (start < blockedEnd && end > blockedStart) return false;
    }
    return true;
  }
  function isSlotAvailable(staffTimelines, start, end) {
    for (let i = 0; i < staffTimelines.length; i++) {
      if (fitsOnStaffTrack(staffTimelines[i], start, end)) return true;
    }
    return false;
  }
  function isSlotAvailableForBoth(staffTimelines, start, end) {
    return staffTimelines.every(function (timeline) {
      return fitsOnStaffTrack(timeline, start, end);
    });
  }
  function requiresBothStaff(serviceName) {
    return serviceName === "Couples Massage";
  }

  let selectedSlot = null; // { startISO, endISO, displayStart, durationMinutes, serviceName }

  checkBtn.addEventListener("click", async function () {
    const serviceOption = serviceSelect.selectedOptions[0];
    const dateStr = dateInput.value;

    if (!serviceSelect.value || !dateStr) {
      statusMsg.textContent = "Please choose a treatment and a date first.";
      return;
    }

    const durationMinutes = parseInt(serviceOption.getAttribute("data-duration"), 10);
    const serviceName = serviceOption.textContent.split(" (")[0].trim();

    statusMsg.textContent = "Checking availability...";
    checkBtn.disabled = true;

    try {
      const { data, error } = await supabaseClient.rpc("get_busy_slots", { p_date: dateStr });
      if (error) throw error;

      // Group existing bookings by staff member, converted to minutes-since-midnight
      // IN CAPE TOWN TIME specifically -- not the visitor's own browser timezone,
      // which could be different if someone is booking while travelling.
      const staffTimelines = Array.from({ length: STAFF_COUNT }, () => []);
      function toCapeTownMinutes(isoString) {
        const d = new Date(isoString);
        return (d.getUTCHours() * 60 + d.getUTCMinutes() + 120) % 1440; // UTC+2, no daylight saving
      }
      (data || []).forEach(function (row) {
        const startMin = toCapeTownMinutes(row.start_time);
        const endMin = toCapeTownMinutes(row.end_time);
        if (staffTimelines[row.staff_index]) {
          staffTimelines[row.staff_index].push({ start: startMin, end: endMin });
        }
      });

      const { open, close } = hoursForDate(dateStr);
      const openMin = toMinutes(open);
      const closeMin = toMinutes(close);
      const needsBoth = requiresBothStaff(serviceName);

      const availableTimes = [];
      for (let t = openMin; t + durationMinutes <= closeMin; t += SLOT_STEP_MINUTES) {
        const fits = needsBoth
          ? isSlotAvailableForBoth(staffTimelines, t, t + durationMinutes)
          : isSlotAvailable(staffTimelines, t, t + durationMinutes);
        if (fits) {
          availableTimes.push(t);
        }
      }

      renderSlots(availableTimes, durationMinutes, serviceName, dateStr);
      statusMsg.textContent = "";
    } catch (err) {
      console.error(err);
      statusMsg.textContent = "Something went wrong checking availability. Please try again, or contact us directly.";
    } finally {
      checkBtn.disabled = false;
    }
  });

  function renderSlots(availableTimes, durationMinutes, serviceName, dateStr) {
    slotsContainer.innerHTML = "";

    if (availableTimes.length === 0) {
      slotsContainer.innerHTML = '<p style="color:var(--ink-soft); font-size:14.5px;">No open times on this date for that treatment. Please try a different date.</p>';
    } else {
      availableTimes.forEach(function (startMin) {
        const timeStr = toTimeStr(startMin);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "slot-btn";
        btn.textContent = formatDisplayTime(timeStr);
        btn.addEventListener("click", function () {
          const startISO = `${dateStr}T${timeStr}:00${CAPE_TOWN_OFFSET}`;
          const endISO = `${dateStr}T${toTimeStr(startMin + durationMinutes)}:00${CAPE_TOWN_OFFSET}`;
          selectedSlot = {
            startISO: startISO,
            endISO: endISO,
            displayStart: `${formatDisplayTime(timeStr)} on ${dateStr}`,
            durationMinutes: durationMinutes,
            serviceName: serviceName,
          };
          step2.style.display = "none";
          step3.style.display = "block";
        });
        slotsContainer.appendChild(btn);
      });
    }

    step1.style.display = "none";
    step2.style.display = "block";
  }

  backBtn.addEventListener("click", function () {
    step2.style.display = "none";
    step1.style.display = "block";
  });
  changeSlotBtn.addEventListener("click", function () {
    step3.style.display = "none";
    step2.style.display = "block";
  });

  step3.addEventListener("submit", async function (e) {
    e.preventDefault();
    const submitBtn = step3.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Booking...";

    const name = document.querySelector("#bk-name").value;
    const phone = document.querySelector("#bk-phone").value;
    const email = document.querySelector("#bk-email").value || null;

    try {
      const { data, error } = await supabaseClient.rpc("book_treatment", {
        p_service_name: selectedSlot.serviceName,
        p_duration_minutes: selectedSlot.durationMinutes,
        p_start_time: selectedSlot.startISO,
        p_end_time: selectedSlot.endISO,
        p_client_name: name,
        p_client_email: email,
        p_client_phone: phone,
        p_both_staff: requiresBothStaff(selectedSlot.serviceName),
      });

      if (error) {
        // Most likely: someone else just took this exact slot
        alert("Sorry, that time was just booked by someone else. Please pick another time.");
        step3.style.display = "none";
        step2.style.display = "block";
        return;
      }

      step3.style.display = "none";
      confirmationDetail.textContent = `Your ${selectedSlot.serviceName} is confirmed for ${selectedSlot.displayStart}. We'll see you then!`;
      confirmationBox.style.display = "block";
    } catch (err) {
      console.error(err);
      alert("Something went wrong confirming your booking. Please try again or contact us directly.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirm Booking";
    }
  });
});
