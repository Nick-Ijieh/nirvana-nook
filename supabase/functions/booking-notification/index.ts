// Supabase Edge Function: send-booking-notification
//
// Fires automatically whenever a new row is inserted into the
// `bookings` table (wired up via a Database Webhook -- see setup
// instructions). Sends:
//   - ALWAYS an email to the admin (info@nirvananookwellness.co.za)
//   - EITHER an email to the client (if they gave an email)
//   - OR an SMS to the client via BulkSMS.com (if they only gave a phone)

import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const BULKSMS_TOKEN_ID = Deno.env.get("BULKSMS_TOKEN_ID")!;
const BULKSMS_TOKEN_SECRET = Deno.env.get("BULKSMS_TOKEN_SECRET")!;

const FROM_EMAIL = "Nirvana Nook Wellness Spa <info@nirvananookwellness.co.za>";
const ADMIN_EMAIL = "info@nirvananookwellness.co.za";

function formatCapeTownDateTime(isoString: string): { date: string; time: string } {
  const d = new Date(isoString);
  const date = new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return { date, time };
}

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  if (!res.ok) {
    console.error("Resend error:", await res.text());
  }
  return res.ok;
}

async function sendSMS(toPhone: string, body: string) {
  // BulkSMS.com REST API v1 -- Basic Auth using a token ID + token secret
  // (created in BulkSMS dashboard, NOT your main account password).
  const credentials = btoa(`${BULKSMS_TOKEN_ID}:${BULKSMS_TOKEN_SECRET}`);

  // South African numbers need the +27 international format for BulkSMS.
  // Converts a local "076..." number to "+2776..." if needed.
  let formattedPhone = toPhone.trim().replace(/\s+/g, "");
  if (formattedPhone.startsWith("0")) {
    formattedPhone = "+27" + formattedPhone.slice(1);
  } else if (!formattedPhone.startsWith("+")) {
    formattedPhone = "+27" + formattedPhone;
  }

  const res = await fetch("https://api.bulksms.com/v1/messages", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([{ to: formattedPhone, body }]),
  });
  if (!res.ok) {
    console.error("BulkSMS error:", await res.text());
  }
  return res.ok;
}

serve(async (req) => {
  try {
    const payload = await req.json();
    const booking = payload.record; // the newly inserted row

    if (!booking || booking.status !== "confirmed") {
      return new Response("Skipped (not a confirmed booking)", { status: 200 });
    }

    const { date, time } = formatCapeTownDateTime(booking.start_time);
    const staffLabel = booking.staff_index === -1 ? "Both staff members" : `Staff ${booking.staff_index + 1}`;

    // ---- Always notify the admin ----
    await sendEmail(
      ADMIN_EMAIL,
      `New Booking: ${booking.service_name} on ${date}`,
      `
        <h2>New Booking Received</h2>
        <p><strong>Treatment:</strong> ${booking.service_name} (${booking.duration_minutes} min)</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Time:</strong> ${time}</p>
        <p><strong>Assigned:</strong> ${staffLabel}</p>
        <p><strong>Client:</strong> ${booking.client_name}</p>
        <p><strong>Phone:</strong> ${booking.client_phone || "Not provided"}</p>
        <p><strong>Email:</strong> ${booking.client_email || "Not provided"}</p>
      `
    );

    // ---- Notify the client: email if they gave one, SMS otherwise ----
    if (booking.client_email) {
      await sendEmail(
        booking.client_email,
        "Your Nirvana Nook Booking is Confirmed",
        `
          <h2>You're booked!</h2>
          <p>Hi ${booking.client_name},</p>
          <p>Your <strong>${booking.service_name}</strong> is confirmed for:</p>
          <p><strong>${date} at ${time}</strong></p>
          <p>We look forward to seeing you at Nirvana Nook Wellness Spa, 12 Merlot Avenue, Table View.</p>
          <p>Need to change or cancel? Call or WhatsApp us at 076 582 3013.</p>
        `
      );
    } else if (booking.client_phone) {
      await sendSMS(
        booking.client_phone,
        `Nirvana Nook: Your ${booking.service_name} is confirmed for ${date} at ${time}. See you then! Call/WhatsApp 076 582 3013 to change.`
      );
    }

    return new Response("Notifications sent", { status: 200 });
  } catch (err) {
    console.error("Error in send-booking-notification:", err);
    return new Response("Error", { status: 500 });
  }
});