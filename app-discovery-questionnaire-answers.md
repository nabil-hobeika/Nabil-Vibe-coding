# Doctor's Appointment App — Discovery Questionnaire (Answered)

Blank reusable template: `C:\Users\andre\Documents\Project Template Structure\app-discovery-questionnaire.md`

## 1. Users
- **Roles:** Patients + one doctor/staff (staff has a simple back-office view to manage the schedule).
- **Scope:** Single practice, single doctor (Nabil's own practice).
- **Booking for others:** Patients can also book/manage appointments for dependents (children, elderly parents).
- **Target audience:** General adult population — no special accommodations beyond good UX defaults.

## 2. UX Design
- **Platform:** Web app only (responsive, via Vercel). No native mobile app for now.
- **Booking view:** Simple list of next available slots (e.g. "Tomorrow 9am, 10am, 2pm") — no full calendar grid.
- **Returning patients:** Data pre-filled, visit history visible to staff at a glance.
- **Language:** English only for MVP.

## 3. Technology
- **Frontend framework:** Claude Code's choice (likely Next.js, Vercel-native).
- **Database:** Claude Code's choice (likely Postgres via Supabase or Neon).

## 4. System Architecture
- **Tenancy:** Single-tenant now, but data model kept clean enough to go multi-tenant later.
- **Data separation:** Patient records and scheduling data in the same database, access-controlled (not physically separated services).

## 5. Data
- **Extra fields beyond core (name/address/DOB/ID/history):** Insurance info + emergency contact.
- **History structure:** Structured visit records (date, reason, notes per visit) — not free text, not document uploads (for now).
- **Edit permissions:** Doctor/staff only can edit history; patients can view their own.
- **Audit logs:** Not needed for MVP.

## 6. Compliance, Privacy & Legal
- **Applicable law:** No specific jurisdiction confirmed — treat as GDPR-equivalent best practice regardless (consent, encryption, deletion rights).
- **Encryption:** Required — encrypt data at rest, HTTPS everywhere. Non-negotiable given SSNs and medical history are stored.
- **Consent capture:** Yes — simple consent checkbox at signup.
- **Data controller:** Nabil individually (solo practice).

## 7. Business Model
- **Model:** Personal tool for Nabil's practice now, but architecture stays open to licensing to other doctors later (SaaS potential not ruled out).

## 8. Scheduling Logic
- **Slot length:** Fixed length (e.g. 30 min) for all appointments — no variable-by-visit-type logic yet.
- **Self-service changes:** Patients can cancel/reschedule themselves up to a cutoff window (e.g. 24h before).
- **Double-booking:** Auto-prevented by the system, no manual override.

## 9. Integrations & Communications
- **Reminders:** Email only for MVP (SMS/WhatsApp can be added later).
- **Payments:** Not handled in-app — patients pay at the clinic as usual (cash/insurance).
- **Telehealth:** Not addressed yet — in-person only assumed.

## 10. Trust & Safety
- **Identity verification:** Email verification only at signup (no phone OTP for MVP).
- **Abuse handling:** Not addressed yet — revisit if needed.
- **Staff account provisioning:** Not addressed yet — likely invite-only by Nabil since it's a solo practice.

## 11. Success Metrics
- **3-month goal:** Bookings fully moved off phone calls and into the app.
- **Scale target:** Not specified — MVP scoped for a single practice.

---
*From Workshop 2 session, 2026-07-08, plus discovery Q&A on 2026-07-22. Patient master data (name, address, DOB, SSN-equivalent, history, new/existing check) remains the first feature to build.*

run: http://localhost:3000
run: http://localhost:3000

