import { Resend } from "resend";
import ical, { ICalCalendarMethod } from "ical-generator";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SessionDetails {
  title: string;
  start: Date;
  end: Date;
  eventName: string;
  trackName?: string | null;
  location?: string | null;
}

export interface SpeakerDetails {
  name: string;
  email: string;
}

export async function sendCalendarInvite(
  speaker: SpeakerDetails,
  session: SessionDetails
): Promise<void> {
  const calendar = ical({ name: session.eventName });
  calendar.method(ICalCalendarMethod.REQUEST);

  calendar.createEvent({
    start: session.start,
    end: session.end,
    summary: session.title,
    description: `You have been confirmed as a speaker for: ${session.title}${session.trackName ? ` (${session.trackName} track)` : ""} at ${session.eventName}.`,
    location: session.location ?? undefined,
    organizer: { name: session.eventName, email: process.env.RESEND_FROM_EMAIL ?? "speakers@resend.dev" },
    attendees: [{ name: speaker.name, email: speaker.email, rsvp: true }],
  });

  const icsContent = calendar.toString();

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "speakers@resend.dev",
    to: speaker.email,
    subject: `📅 You're confirmed: ${session.title} at ${session.eventName}`,
    html: `
      <p>Hi ${speaker.name},</p>
      <p>This is your calendar invite confirming your speaking session:</p>
      <ul>
        <li><strong>Session:</strong> ${session.title}</li>
        ${session.trackName ? `<li><strong>Track:</strong> ${session.trackName}</li>` : ""}
        <li><strong>Event:</strong> ${session.eventName}</li>
        <li><strong>Time:</strong> ${session.start.toUTCString()} – ${session.end.toUTCString()}</li>
      </ul>
      <p>Please accept the calendar invite attached to hold this in your diary.</p>
      <p>We'll be in touch with further details ahead of the event.</p>
    `,
    attachments: [
      {
        filename: "session-invite.ics",
        content: Buffer.from(icsContent).toString("base64"),
        contentType: "text/calendar",
      },
    ],
  });
}