import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Sending domain — update to your verified Resend domain when ready.
// During development you can use 'onboarding@resend.dev' (sends only to your Resend account email).
const FROM = process.env.RESEND_FROM_EMAIL || 'BookRight <onboarding@resend.dev>'

// ─── Helper: format a date for email display ──────────────────────────────────
function formatApptDate(isoString: string, timezone: string) {
  const date = new Date(isoString)
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: timezone,
  })
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone,
  })
  return { dateStr, timeStr }
}

// ─── Email: New booking → artist ──────────────────────────────────────────────
export async function sendArtistNewBooking({
  artistEmail,
  artistName,
  clientName,
  clientEmail,
  clientPhone,
  serviceName,
  startAt,
  timezone,
  depositRequired,
  appointmentId,
}: {
  artistEmail: string
  artistName: string
  clientName: string
  clientEmail: string
  clientPhone?: string | null
  serviceName: string
  startAt: string
  timezone: string
  depositRequired?: number | null
  appointmentId: string
}) {
  const { dateStr, timeStr } = formatApptDate(startAt, timezone)
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/appointments/${appointmentId}`

  await resend.emails.send({
    from: FROM,
    to: artistEmail,
    subject: `New booking request — ${clientName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; background: #0a0a0a; color: #f5f5f5; border-radius: 12px; overflow: hidden;">
        <div style="background: #141414; padding: 24px 32px; border-bottom: 1px solid #2a2a2a;">
          <p style="margin: 0; font-size: 13px; color: #888; letter-spacing: 0.05em; text-transform: uppercase;">BookRight</p>
          <h1 style="margin: 8px 0 0; font-size: 22px; font-weight: 700; color: #f5f5f5;">New Booking Request</h1>
        </div>

        <div style="padding: 28px 32px;">
          <p style="margin: 0 0 20px; color: #ccc; line-height: 1.6;">
            Hey ${artistName}, you have a new booking request from <strong style="color: #f5f5f5;">${clientName}</strong>.
          </p>

          <div style="background: #141414; border: 1px solid #2a2a2a; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 13px; width: 120px;">Service</td>
                <td style="padding: 8px 0; color: #f5f5f5; font-weight: 500;">${serviceName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 13px; border-top: 1px solid #2a2a2a;">Date</td>
                <td style="padding: 8px 0; color: #f5f5f5; font-weight: 500; border-top: 1px solid #2a2a2a;">${dateStr}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 13px; border-top: 1px solid #2a2a2a;">Time</td>
                <td style="padding: 8px 0; color: #f5f5f5; font-weight: 500; font-family: monospace; border-top: 1px solid #2a2a2a;">${timeStr}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 13px; border-top: 1px solid #2a2a2a;">Client</td>
                <td style="padding: 8px 0; color: #f5f5f5; font-weight: 500; border-top: 1px solid #2a2a2a;">${clientName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 13px; border-top: 1px solid #2a2a2a;">Email</td>
                <td style="padding: 8px 0; border-top: 1px solid #2a2a2a;"><a href="mailto:${clientEmail}" style="color: #c8a97e;">${clientEmail}</a></td>
              </tr>
              ${clientPhone ? `
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 13px; border-top: 1px solid #2a2a2a;">Phone</td>
                <td style="padding: 8px 0; color: #f5f5f5; border-top: 1px solid #2a2a2a;">${clientPhone}</td>
              </tr>` : ''}
              ${depositRequired ? `
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 13px; border-top: 1px solid #2a2a2a;">Deposit</td>
                <td style="padding: 8px 0; color: #c8a97e; font-weight: 600; border-top: 1px solid #2a2a2a;">$${(depositRequired / 100).toFixed(0)} — awaiting payment</td>
              </tr>` : ''}
            </table>
          </div>

          <a href="${dashboardUrl}" style="display: inline-block; background: #c8a97e; color: #0a0a0a; font-weight: 700; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-size: 15px; margin-bottom: 24px;">
            View & Confirm Appointment →
          </a>

          <p style="margin: 0; color: #555; font-size: 12px; line-height: 1.5;">
            Reply to this email to contact ${clientName} directly. Powered by BookRight.
          </p>
        </div>
      </div>
    `,
  })
}

// ─── Email: Confirmed → client ────────────────────────────────────────────────
export async function sendClientConfirmation({
  clientEmail,
  clientName,
  artistName,
  serviceName,
  startAt,
  timezone,
  bookingSlug,
}: {
  clientEmail: string
  clientName: string
  artistName: string
  serviceName: string
  startAt: string
  timezone: string
  bookingSlug: string
}) {
  const { dateStr, timeStr } = formatApptDate(startAt, timezone)

  await resend.emails.send({
    from: FROM,
    to: clientEmail,
    subject: `Your appointment is confirmed — ${artistName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; background: #0a0a0a; color: #f5f5f5; border-radius: 12px; overflow: hidden;">
        <div style="background: #141414; padding: 24px 32px; border-bottom: 1px solid #2a2a2a;">
          <p style="margin: 0; font-size: 13px; color: #888; letter-spacing: 0.05em; text-transform: uppercase;">BookRight</p>
          <h1 style="margin: 8px 0 0; font-size: 22px; font-weight: 700; color: #f5f5f5;">You're Confirmed! 🎉</h1>
        </div>

        <div style="padding: 28px 32px;">
          <p style="margin: 0 0 20px; color: #ccc; line-height: 1.6;">
            Hey ${clientName}, your appointment with <strong style="color: #f5f5f5;">${artistName}</strong> has been confirmed. See you soon!
          </p>

          <div style="background: #141414; border: 1px solid #2a2a2a; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 13px; width: 100px;">Service</td>
                <td style="padding: 8px 0; color: #f5f5f5; font-weight: 500;">${serviceName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 13px; border-top: 1px solid #2a2a2a;">Date</td>
                <td style="padding: 8px 0; color: #f5f5f5; font-weight: 500; border-top: 1px solid #2a2a2a;">${dateStr}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 13px; border-top: 1px solid #2a2a2a;">Time</td>
                <td style="padding: 8px 0; color: #f5f5f5; font-weight: 500; font-family: monospace; border-top: 1px solid #2a2a2a;">${timeStr}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 13px; border-top: 1px solid #2a2a2a;">With</td>
                <td style="padding: 8px 0; color: #c8a97e; font-weight: 600; border-top: 1px solid #2a2a2a;">${artistName}</td>
              </tr>
            </table>
          </div>

          <p style="margin: 0 0 8px; color: #888; font-size: 13px;">Need to reschedule? Reach out to ${artistName} directly to make any changes.</p>
          <p style="margin: 0; color: #555; font-size: 12px; line-height: 1.5;">Powered by BookRight.</p>
        </div>
      </div>
    `,
  })
}
