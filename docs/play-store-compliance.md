# HisaabKro Play Store Compliance Notes

Last updated: July 18, 2026

## Current Store URLs

- Privacy policy: `https://hisaabkro.in/privacy`
- Account/data deletion: `https://hisaabkro.in/data-deletion`

## Android Permissions

The production app should request only permissions tied to user-visible
features.

- Allowed: `INTERNET`, `VIBRATE`, camera/photo access through Expo Image Picker
  when users capture or attach purchase bills.
- Blocked: `android.permission.RECORD_AUDIO` because HisaabKro has no
  microphone feature.
- Blocked: `android.permission.SYSTEM_ALERT_WINDOW` because HisaabKro has no
  production overlay feature.

## Data Safety Draft

Declare collection for:

- Account data: name, email, authentication/session data.
- Business data: company profile, GSTIN, ledgers, invoices, purchases, stock,
  payments, reports, attachments, and OCR review data.
- Photos/files: bill images selected or captured by the user for purchase/OCR
  review.

Declare no collection for:

- Microphone/audio.
- Location, contacts, SMS, health, or calendar data.

## Financial Features Draft

HisaabKro is a business accounting, GST billing, khata/ledger, inventory,
payments tracking, purchase, sales, and reporting app.

It does not provide loans, credit, investments, insurance, trading, gambling,
or wallet/banking services.

## Before Production Submission

- Ensure `privacy@hisaabkro.in` and `support@hisaabkro.in` route to a monitored
  inbox.
- Complete Play Console App Content, Data Safety, Financial Features, target
  audience, ads, and content rating sections.
- Run a closed test with at least 12 opted-in testers for at least 14 continuous
  days before applying for production access.
- Review target API level before upload because Google Play requirements change
  over time.
