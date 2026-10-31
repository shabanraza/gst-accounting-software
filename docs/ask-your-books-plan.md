# Ask your books — plan

The owner types a question in Hindi or English ("Sharma Traders ka kitna
baaki hai?", "GST payable this month?", "top items sold in October") and
an AI model answers from that company's own books.

## Model and cost

- Cloudflare Workers AI through the `AI` binding (`wrangler.jsonc`), so it
  runs on the account's free daily allowance of 10,000 Neurons (resets at
  00:00 UTC). No API key.
- Model: `ASSISTANT_MODEL` in `assistant-service.ts`, currently
  `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (function calling, available
  on the Workers Free plan). Swap it there.
- One question is roughly 2–4 model calls of a few thousand input tokens,
  about 150–300 Neurons, so the allowance covers a few dozen questions a
  day across all companies.
- Guards: `ASSISTANT_DAILY_LIMIT` (20) questions per company per IST day,
  counted in `assistant_usage` with a single upsert; tool results are capped
  (top 5 rows, top 10 stock items); at most 4 model calls and 400 output
  tokens per call.
- When Workers AI returns error 3036 (daily free allocation used up) the user
  sees "Today's free AI questions are used up. Please try again tomorrow."
  Capacity errors (3040/429) show a "busy, try again" message. Nothing falls
  back to paid usage.
- Note: on the Workers **Paid** plan Cloudflare bills usage beyond the free
  allowance instead of returning 3036. The per-company limit is the cap there;
  stay on the Free plan for a hard stop.

## Shape

- `assistant-tools.ts`: six read-only tools, each a thin wrapper over an
  existing report service, always called with the `companyId` from the tRPC
  input (never from the model):
  | Tool | Wraps | Link |
  |---|---|---|
  | `party_balance` | party repo + open invoices/bills | `/app/masters/parties` |
  | `ageing` | `buildReceivablesAgeing` / `buildPayablesAgeing` | `/app/reports?tab=ageing` |
  | `sales_purchase_summary` | invoice/bill repos (period, group by party or item) | `/app/sales`, `/app/purchases` |
  | `gstr3b_summary` | `buildGstDocuments` + `buildGstr3bReport` | `/app/reports?tab=gstr3b` |
  | `stock_on_hand` | `buildStockSummary` | `/app/reports?tab=stock` |
  | `cash_bank_balances` | `buildTrialBalance` (cash/bank ledgers) | `/app/reports?tab=trial` |
  No SQL from the model and no write or posting path.
- `assistant-service.ts`: the tool-calling loop over an injected `AiBinding`
  (mocked in tests); accepts both the native and OpenAI-style outputs.
- `assistant-router.ts`: `assistant.status` and `assistant.ask`
  (`capabilityProcedure('view_reports')`), daily limit, friendly errors.
- `assistant-usage-store.ts` + `drizzle/0015_assistant_usage.sql`: the
  per-company daily counter (in-memory version for tests).
- UI: `components/assistant-chat-page.tsx` at `/app/assistant`, a full chat page ("Ask AI" at the top of the sidebar, `Alt+A`): scrolling thread, working state, composer pinned at the bottom (Enter sends, Shift+Enter adds a line), starter chips, `?q=` to open with a question. The conversation is kept per company in sessionStorage.

## Safety

Read-only (see `ai-safety-principles.md`). Answers cite figures from existing
reports and link to the report page for checking. Tool errors go back to the
model as error text instead of throwing.

## Tests (written first)

- Tools: company scoping and correct figures for each tool.
- Loop: mocked binding calls a tool and answers; OpenAI-style output; tool
  errors; free-quota error mapping; turn cap; history.
- Router: binding missing, capability gate, daily limit, free-quota message.
