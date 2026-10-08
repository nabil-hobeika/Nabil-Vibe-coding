function formatSlotTime(startAt: Date): string {
  return startAt.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function bookingConfirmationEmail({
  patientName,
  startAt,
}: {
  patientName: string;
  startAt: Date;
}) {
  return {
    subject: "Appointment confirmed",
    text: `Your appointment for ${patientName} is confirmed for ${formatSlotTime(startAt)}.\n\nYou can cancel or reschedule from your account up until 24 hours before the appointment.`,
  };
}

export function appointmentReminderEmail({
  patientName,
  startAt,
}: {
  patientName: string;
  startAt: Date;
}) {
  return {
    subject: "Appointment reminder",
    text: `Reminder: ${patientName} has an appointment tomorrow, ${formatSlotTime(startAt)}.`,
  };
}
