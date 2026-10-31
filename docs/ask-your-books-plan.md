# Ask your books — plan

The owner types a question in Hindi or English ("Sharma Traders ka kitna
baaki hai?", "GST payable this month?", "top items sold in October") and
Claude answers from that company's own books.

## Shape

- `src/features/assistant/assistant-tools.ts`: six read-only tools, each a
  thin wrapper over an existing domain service, always called with the
  `companyId` from the tRPC input (never from the model):
  | Tool | Wraps | Link |
  |---|---|---|
  | `party_balance` | party repo + open invoices/bills | `/app/masters/parties` |
  | `ageing` | `buildReceivablesAgeing` / `buildPayablesAgeing` | `/app/reports?tab=ageing` |
  | `sales_purchase_summary` | invoice/bill repos (period, group by party or item) | `/app/sales`, `/app/purchases` |
  | `gstr3b_summary` | `buildGstDocuments` + `buildGstr3bReport` | `/app/reports?tab=gstr3b` |
  | `stock_on_hand` | `buildStockSummary` | `/app/reports?tab=stock` |
  | `cash_bank_balances` | `buildTrialBalance` (cash/bank ledgers) | `/app/reports?tab=trial` |
  The model only sees tool names and JSON inputs; there is no SQL and no
  write or posting path.
- `assistant-service.ts`: the manual tool-use loop (`runAssistantConversation`)
  over an injected `createMessage` function, so tests mock Anthropic. Model
  `claude-sonnet-5-5`, effort `low`, server-side refusal fallback
  (`fallbacks: "default"`). At most 6 model turns. Links returned by the
  tools that ran are collected and returned with the answer.
- `assistant-router.ts`: `assistant.status` (configured?) and `assistant.ask`
  (`capabilityProcedure('view_reports')`). The key is read from
  `process.env.ANTHROPIC_API_KEY` on the Worker only; when it is missing
  `ask` returns a `PRECONDITION_FAILED` and the UI shows "not configured".
- UI: `components/ask-books-sheet.tsx`, a shadcn `Sheet` opened from an
  "Ask" button in the app header and with `Alt+A`. Short chat history lives
  in component state only (nothing stored server-side).

## Safety

Read-only (see `ai-safety-principles.md`). Tool results are figures from
existing reports; the answer cites them and links to the report page for
checking. Tool errors return `is_error` results instead of throwing.

## Tests (written first)

- Tools: company scoping (another company's rows never leak) and correct
  figures for each tool.
- Loop: mocked client calls a tool, gets a result, answers; links collected;
  unknown tool → `is_error`; iteration cap.
