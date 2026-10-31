# AI Feature Log

This log tracks planned, active, and shipped AI-related work in HisaabKro.

## Status Legend

- Planned: defined but not started.
- In progress: implementation has started.
- Experimental: available for testing, not production-ready.
- Shipped: available in the main product flow.
- Paused: intentionally deferred.

## Features

| Feature | Status | Area | Notes |
| --- | --- | --- | --- |
| AI provider abstraction | Planned | Backend | Shared interface for OpenAI, Cloudflare Workers AI, or future providers. |
| Prompt templates | Planned | Backend | Versioned prompts for extraction, summaries, reminders, and suggestions. |
| Structured output validation | Planned | Backend | Validate AI JSON before creating drafts or UI suggestions. |
| AI usage logging | Planned | Backend | Track provider, model, status, latency, and validation outcomes. |
| Receipt extraction draft | Planned | OCR / Purchases | Extract bill fields into a reviewable purchase draft. |
| Sales invoice extraction draft | Planned | Sales | Extract customer invoice details into a reviewable sales draft. |
| GST rate suggestion | Planned | Items / GST | Suggest GST rate with explanation and user override. |
| HSN/SAC suggestion | Planned | Items / GST | Suggest HSN/SAC when there is enough product context. |
| Customer ledger summary | Planned | Ledger | Plain-English summary of balance, unpaid invoices, and last payment. |
| Vendor ledger summary | Planned | Ledger | Plain-English summary of outstanding bills and purchase activity. |
| GST monthly summary | Planned | Reports | Explain GST collected, paid, and estimated liability. |
| Ask your books | Experimental | Reports | Read-only Q&A on Cloudflare Workers AI (`ASSISTANT_MODEL`, Llama 3.3 70B fp8-fast) over six company-scoped report tools; full chat page at `/app/assistant` ("Ask AI" at the top of the sidebar, Alt+A). Uses the `AI` binding and the free daily Neuron allowance; 20 questions per company per day. See `ask-your-books-plan.md`. |
| Payment reminder draft | Planned | Receivables | Generate editable follow-up message text. |
| Duplicate bill warning | Planned | Anomaly detection | Detect possible duplicate vendor invoice before posting. |
| Tax total mismatch warning | Planned | Anomaly detection | Warn when taxable, GST, and grand total do not reconcile. |

## Upcoming Implementation Order

1. AI provider abstraction.
2. Structured output validation.
3. Receipt extraction draft.
4. User review and correction UI.
5. GST suggestion experiments.
6. Ledger summaries.
7. Payment reminder drafts.
8. Accounting anomaly warnings.

## Release Notes Template

Use this format when an AI feature ships:

```text
## Feature

## Status

## What changed

## How it stays safe

## Known limitations

## Feedback needed
```
