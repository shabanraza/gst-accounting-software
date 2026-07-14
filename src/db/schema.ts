import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const todos = pgTable('todos', {
  id: serial().primaryKey(),
  title: text().notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_user_id_idx').on(table.userId)],
)

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const companies = pgTable(
  'companies',
  {
    id: uuid().defaultRandom().primaryKey(),
    accountId: text('account_id').notNull(),
    legalName: text('legal_name').notNull(),
    tradeName: text('trade_name').notNull(),
    gstin: text(),
    stateCode: text('state_code').notNull(),
    financialYearStart: text('financial_year_start').notNull(),
    businessType: text('business_type').notNull(),
    addressLine1: text('address_line1').notNull().default(''),
    addressLine2: text('address_line2').notNull().default(''),
    city: text('city').notNull().default(''),
    pincode: text('pincode').notNull().default(''),
    pan: text('pan').notNull().default(''),
    contactPhone: text('contact_phone').notNull().default(''),
    contactEmail: text('contact_email').notNull().default(''),
    bankName: text('bank_name').notNull().default(''),
    bankAccountNumber: text('bank_account_number').notNull().default(''),
    bankIfsc: text('bank_ifsc').notNull().default(''),
    authorizedSignatory: text('authorized_signatory').notNull().default(''),
    logoUrl: text('logo_url').notNull().default(''),
    invoiceTerms: text('invoice_terms').notNull().default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('companies_account_gstin_idx').on(table.accountId, table.gstin),
  ],
)

export const ledgerAccounts = pgTable(
  'ledger_accounts',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    code: text('code').notNull(),
    name: text('name').notNull(),
    accountType: text('account_type').notNull(),
    systemKey: text('system_key'),
    isSystem: boolean('is_system').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('ledger_accounts_company_code_idx').on(
      table.companyId,
      table.code,
    ),
    uniqueIndex('ledger_accounts_company_system_key_idx').on(
      table.companyId,
      table.systemKey,
    ),
  ],
)

export const ledgerEntries = pgTable(
  'ledger_entries',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    entryDate: text('entry_date').notNull(),
    narration: text('narration').notNull(),
    voucherType: text('voucher_type').notNull(),
    totalDebit: text('total_debit').notNull(),
    totalCredit: text('total_credit').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('ledger_entries_company_date_idx').on(
      table.companyId,
      table.entryDate,
    ),
  ],
)

export const ledgerLines = pgTable(
  'ledger_lines',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    entryId: uuid('entry_id')
      .notNull()
      .references(() => ledgerEntries.id),
    ledgerAccountId: uuid('ledger_account_id')
      .notNull()
      .references(() => ledgerAccounts.id),
    debit: text('debit').notNull(),
    credit: text('credit').notNull(),
  },
  (table) => [
    index('ledger_lines_company_entry_idx').on(table.companyId, table.entryId),
    index('ledger_lines_account_idx').on(table.ledgerAccountId),
  ],
)

export const parties = pgTable(
  'parties',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    name: text('name').notNull(),
    partyType: text('party_type').notNull(),
    gstin: text(),
    pan: text('pan').notNull().default(''),
    stateCode: text('state_code').notNull(),
    addressLine1: text('address_line1').notNull().default(''),
    addressLine2: text('address_line2').notNull().default(''),
    city: text('city').notNull().default(''),
    pincode: text('pincode').notNull().default(''),
    contactPhone: text('contact_phone').notNull().default(''),
    contactEmail: text('contact_email').notNull().default(''),
    billingAddress: text('billing_address').notNull().default(''),
    shippingAddress: text('shipping_address').notNull().default(''),
    creditLimit: text('credit_limit'),
    paymentTermsDays: integer('payment_terms_days').notNull(),
    priceListId: uuid('price_list_id').references(() => priceLists.id),
    receivableAccountId: uuid('receivable_account_id').references(
      () => ledgerAccounts.id,
    ),
    payableAccountId: uuid('payable_account_id').references(
      () => ledgerAccounts.id,
    ),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('parties_company_name_idx').on(table.companyId, table.name),
  ],
)

export const godowns = pgTable(
  'godowns',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    name: text('name').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('godowns_company_name_idx').on(table.companyId, table.name),
  ],
)

export const items = pgTable(
  'items',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    name: text('name').notNull(),
    alias: text('alias').notNull().default(''),
    itemGroup: text('item_group').notNull().default(''),
    hsnCode: text('hsn_code').notNull(),
    gstRate: text('gst_rate').notNull(),
    baseUnit: text('base_unit').notNull(),
    alternateUnit: text('alternate_unit').notNull().default(''),
    conversionFactor: text('conversion_factor').notNull().default('1'),
    mrp: text('mrp').notNull().default('0.00'),
    reorderLevel: text('reorder_level').notNull().default('0'),
    purchaseRate: text('purchase_rate').notNull(),
    saleRate: text('sale_rate').notNull(),
    tracksInventory: boolean('tracks_inventory').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('items_company_name_idx').on(table.companyId, table.name),
  ],
)

export const priceLists = pgTable(
  'price_lists',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('price_lists_company_name_idx').on(table.companyId, table.name),
  ],
)

export const priceListItems = pgTable(
  'price_list_items',
  {
    id: uuid().defaultRandom().primaryKey(),
    priceListId: uuid('price_list_id')
      .notNull()
      .references(() => priceLists.id),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id),
    rate: text('rate').notNull(),
  },
  (table) => [
    uniqueIndex('price_list_items_list_item_idx').on(
      table.priceListId,
      table.itemId,
    ),
  ],
)

export const stockMovements = pgTable(
  'stock_movements',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id),
    godownName: text('godown_name'),
    movementType: text('movement_type').notNull(),
    direction: text('direction').notNull(),
    quantity: text('quantity').notNull(),
    unit: text('unit').notNull(),
    referenceType: text('reference_type').notNull(),
    referenceId: text('reference_id').notNull(),
    occurredOn: text('occurred_on').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('stock_movements_company_item_date_idx').on(
      table.companyId,
      table.itemId,
      table.occurredOn,
    ),
  ],
)

export const stockBalances = pgTable(
  'stock_balances',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id),
    quantity: text('quantity').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('stock_balances_company_item_idx').on(
      table.companyId,
      table.itemId,
    ),
  ],
)

export const purchaseBills = pgTable(
  'purchase_bills',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    financialYearStart: text('financial_year_start').notNull(),
    supplierId: uuid('supplier_id')
      .notNull()
      .references(() => parties.id),
    supplierBillNumber: text('supplier_bill_number').notNull(),
    billDate: text('bill_date').notNull(),
    dueDate: text('due_date').notNull(),
    poReference: text('po_reference').notNull().default(''),
    transportMode: text('transport_mode').notNull().default(''),
    vehicleNo: text('vehicle_no').notNull().default(''),
    lrNumber: text('lr_number').notNull().default(''),
    challanRef: text('challan_ref').notNull().default(''),
    placeOfSupply: text('place_of_supply').notNull().default(''),
    reverseCharge: boolean('reverse_charge').notNull().default(false),
    partyNameSnapshot: text('party_name_snapshot').notNull().default(''),
    partyGstinSnapshot: text('party_gstin_snapshot'),
    partyPanSnapshot: text('party_pan_snapshot').notNull().default(''),
    partyBillingAddressSnapshot: text('party_billing_address_snapshot')
      .notNull()
      .default(''),
    partyShippingAddressSnapshot: text('party_shipping_address_snapshot')
      .notNull()
      .default(''),
    partyStateCodeSnapshot: text('party_state_code_snapshot')
      .notNull()
      .default(''),
    partyPhoneSnapshot: text('party_phone_snapshot').notNull().default(''),
    partyEmailSnapshot: text('party_email_snapshot').notNull().default(''),
    paymentStatus: text('payment_status').notNull().default('Pending'),
    taxMode: text('tax_mode').notNull().default('exclusive'),
    narration: text('narration').notNull().default(''),
    freight: text('freight').notNull().default('0.00'),
    packing: text('packing').notNull().default('0.00'),
    roundOff: text('round_off').notNull().default('0.00'),
    billDiscount: text('bill_discount').notNull().default('0.00'),
    godownName: text('godown_name'),
    taxableAmount: text('taxable_amount').notNull(),
    totalGstAmount: text('total_gst_amount').notNull(),
    totalAmount: text('total_amount').notNull(),
    outstandingAmount: text('outstanding_amount').notNull(),
    ledgerEntryId: uuid('ledger_entry_id')
      .notNull()
      .references(() => ledgerEntries.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('purchase_bills_supplier_number_fy_idx').on(
      table.companyId,
      table.supplierId,
      table.supplierBillNumber,
      table.financialYearStart,
    ),
    index('purchase_bills_company_date_idx').on(
      table.companyId,
      table.billDate,
    ),
    index('purchase_bills_company_supplier_idx').on(
      table.companyId,
      table.supplierId,
    ),
  ],
)

export const purchaseBillLines = pgTable(
  'purchase_bill_lines',
  {
    id: uuid().defaultRandom().primaryKey(),
    purchaseBillId: uuid('purchase_bill_id')
      .notNull()
      .references(() => purchaseBills.id),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id),
    description: text('description').notNull(),
    quantity: text('quantity').notNull(),
    unit: text('unit').notNull(),
    rate: text('rate').notNull(),
    gstRate: text('gst_rate').notNull(),
    discountPercent: text('discount_percent').notNull().default('0.00'),
    discountAmount: text('discount_amount').notNull().default('0.00'),
    godownName: text('godown_name'),
    taxableAmount: text('taxable_amount').notNull(),
    gstAmount: text('gst_amount').notNull(),
    lineTotal: text('line_total').notNull(),
  },
  (table) => [index('purchase_bill_lines_bill_idx').on(table.purchaseBillId)],
)

export const salesInvoices = pgTable(
  'sales_invoices',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => parties.id),
    invoiceNumber: text('invoice_number').notNull(),
    invoiceDate: text('invoice_date').notNull(),
    dueDate: text('due_date').notNull().default(''),
    poReference: text('po_reference').notNull().default(''),
    transportMode: text('transport_mode').notNull().default(''),
    vehicleNo: text('vehicle_no').notNull().default(''),
    lrNumber: text('lr_number').notNull().default(''),
    challanRef: text('challan_ref').notNull().default(''),
    placeOfSupply: text('place_of_supply').notNull().default(''),
    reverseCharge: boolean('reverse_charge').notNull().default(false),
    partyNameSnapshot: text('party_name_snapshot').notNull().default(''),
    partyGstinSnapshot: text('party_gstin_snapshot'),
    partyPanSnapshot: text('party_pan_snapshot').notNull().default(''),
    partyBillingAddressSnapshot: text('party_billing_address_snapshot')
      .notNull()
      .default(''),
    partyShippingAddressSnapshot: text('party_shipping_address_snapshot')
      .notNull()
      .default(''),
    partyStateCodeSnapshot: text('party_state_code_snapshot')
      .notNull()
      .default(''),
    partyPhoneSnapshot: text('party_phone_snapshot').notNull().default(''),
    partyEmailSnapshot: text('party_email_snapshot').notNull().default(''),
    paymentMode: text('payment_mode').notNull(),
    paymentStatus: text('payment_status').notNull(),
    taxMode: text('tax_mode').notNull().default('exclusive'),
    narration: text('narration').notNull().default(''),
    freight: text('freight').notNull().default('0.00'),
    packing: text('packing').notNull().default('0.00'),
    roundOff: text('round_off').notNull().default('0.00'),
    billDiscount: text('bill_discount').notNull().default('0.00'),
    godownName: text('godown_name'),
    status: text('status').notNull().default('posted'),
    taxableAmount: text('taxable_amount').notNull(),
    totalGstAmount: text('total_gst_amount').notNull(),
    totalAmount: text('total_amount').notNull(),
    outstandingAmount: text('outstanding_amount').notNull(),
    ledgerEntryId: uuid('ledger_entry_id')
      .notNull()
      .references(() => ledgerEntries.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('sales_invoices_company_number_idx').on(
      table.companyId,
      table.invoiceNumber,
    ),
    index('sales_invoices_company_date_idx').on(
      table.companyId,
      table.invoiceDate,
    ),
    index('sales_invoices_company_customer_idx').on(
      table.companyId,
      table.customerId,
    ),
  ],
)

export const salesInvoiceLines = pgTable(
  'sales_invoice_lines',
  {
    id: uuid().defaultRandom().primaryKey(),
    salesInvoiceId: uuid('sales_invoice_id')
      .notNull()
      .references(() => salesInvoices.id),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id),
    description: text('description').notNull(),
    quantity: text('quantity').notNull(),
    unit: text('unit').notNull(),
    rate: text('rate').notNull(),
    gstRate: text('gst_rate').notNull(),
    discountPercent: text('discount_percent').notNull().default('0.00'),
    discountAmount: text('discount_amount').notNull().default('0.00'),
    godownName: text('godown_name'),
    taxableAmount: text('taxable_amount').notNull(),
    gstAmount: text('gst_amount').notNull(),
    lineTotal: text('line_total').notNull(),
  },
  (table) => [
    index('sales_invoice_lines_invoice_idx').on(table.salesInvoiceId),
  ],
)

export const creditDebitNotes = pgTable(
  'credit_debit_notes',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    noteType: text('note_type').notNull(),
    noteNumber: text('note_number').notNull(),
    noteDate: text('note_date').notNull(),
    partyId: uuid('party_id')
      .notNull()
      .references(() => parties.id),
    referenceDocumentId: text('reference_document_id'),
    taxableAmount: text('taxable_amount').notNull(),
    totalGstAmount: text('total_gst_amount').notNull(),
    totalAmount: text('total_amount').notNull(),
    ledgerEntryId: uuid('ledger_entry_id')
      .notNull()
      .references(() => ledgerEntries.id),
    narration: text('narration').notNull().default(''),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('credit_debit_notes_company_date_idx').on(
      table.companyId,
      table.noteDate,
    ),
    index('credit_debit_notes_company_party_idx').on(
      table.companyId,
      table.partyId,
    ),
  ],
)

export const financialYears = pgTable(
  'financial_years',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    startDate: text('start_date').notNull(),
    endDate: text('end_date').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('financial_years_company_start_idx').on(
      table.companyId,
      table.startDate,
    ),
  ],
)

export const companyMemberships = pgTable(
  'company_memberships',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    userId: text('user_id').notNull(),
    role: text('role').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('company_memberships_company_user_idx').on(
      table.companyId,
      table.userId,
    ),
    index('company_memberships_user_idx').on(table.userId),
  ],
)

export const companyInvitations = pgTable(
  'company_invitations',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    email: text('email').notNull(),
    role: text('role').notNull(),
    token: text('token').notNull().unique(),
    status: text('status').notNull().default('pending'),
    invitedByUserId: text('invited_by_user_id').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    acceptedAt: timestamp('accepted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('company_invitations_company_email_idx').on(
      table.companyId,
      table.email,
    ),
  ],
)

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    actorUserId: text('actor_user_id').notNull(),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    metadata: text('metadata').notNull().default('{}'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('audit_events_company_created_idx').on(
      table.companyId,
      table.createdAt,
    ),
  ],
)

export const documentSequences = pgTable(
  'document_sequences',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    financialYearId: uuid('financial_year_id')
      .notNull()
      .references(() => financialYears.id),
    voucherType: text('voucher_type').notNull(),
    series: text('series').notNull(),
    nextNumber: integer('next_number').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('document_sequences_scope_idx').on(
      table.companyId,
      table.financialYearId,
      table.voucherType,
      table.series,
    ),
  ],
)

export const documentAttachments = pgTable('document_attachments', {
  id: uuid().defaultRandom().primaryKey(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id),
  linkedDocumentType: text('linked_document_type').notNull(),
  linkedDocumentId: text('linked_document_id').notNull(),
  storageKey: text('storage_key').notNull(),
  originalFilename: text('original_filename').notNull(),
  contentType: text('content_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const ocrDrafts = pgTable(
  'ocr_drafts',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    attachmentId: uuid('attachment_id')
      .notNull()
      .references(() => documentAttachments.id),
    status: text('status').notNull(),
    fieldsJson: text('fields_json').notNull(),
    lowConfidenceFieldsJson: text('low_confidence_fields_json').notNull(),
    postedPurchaseBillId: uuid('posted_purchase_bill_id'),
    reviewedByUserId: text('reviewed_by_user_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('ocr_drafts_company_status_idx').on(table.companyId, table.status),
  ],
)

export const dashboardDailySummaries = pgTable(
  'dashboard_daily_summaries',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    summaryDate: text('summary_date').notNull(),
    salesTotal: text('sales_total').notNull(),
    purchaseTotal: text('purchase_total').notNull(),
    receivableTotal: text('receivable_total').notNull(),
    payableTotal: text('payable_total').notNull(),
    stockInQuantity: text('stock_in_quantity').notNull(),
    stockOutQuantity: text('stock_out_quantity').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('dashboard_daily_summaries_company_date_idx').on(
      table.companyId,
      table.summaryDate,
    ),
  ],
)

export const expenses = pgTable(
  'expenses',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    expenseDate: text('expense_date').notNull(),
    narration: text('narration').notNull(),
    amount: text('amount').notNull(),
    expenseAccountId: uuid('expense_account_id')
      .notNull()
      .references(() => ledgerAccounts.id),
    paymentAccountId: uuid('payment_account_id')
      .notNull()
      .references(() => ledgerAccounts.id),
    ledgerEntryId: uuid('ledger_entry_id')
      .notNull()
      .references(() => ledgerEntries.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('expenses_company_date_idx').on(table.companyId, table.expenseDate),
  ],
)

export const salesDocuments = pgTable(
  'sales_documents',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    documentType: text('document_type').notNull(),
    documentNumber: text('document_number').notNull(),
    documentDate: text('document_date').notNull(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => parties.id),
    narration: text('narration').notNull().default(''),
    totalAmount: text('total_amount').notNull(),
    status: text('status').notNull().default('open'),
    convertedToInvoiceId: uuid('converted_to_invoice_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('sales_documents_company_number_idx').on(
      table.companyId,
      table.documentNumber,
    ),
  ],
)

export const salesDocumentLines = pgTable(
  'sales_document_lines',
  {
    id: uuid().defaultRandom().primaryKey(),
    salesDocumentId: uuid('sales_document_id')
      .notNull()
      .references(() => salesDocuments.id),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id),
    description: text('description').notNull(),
    quantity: text('quantity').notNull(),
    unit: text('unit').notNull(),
    rate: text('rate').notNull(),
  },
  (table) => [index('sales_document_lines_doc_idx').on(table.salesDocumentId)],
)

export const purchaseOrders = pgTable(
  'purchase_orders',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    supplierId: uuid('supplier_id')
      .notNull()
      .references(() => parties.id),
    orderNumber: text('order_number').notNull(),
    orderDate: text('order_date').notNull(),
    status: text('status').notNull().default('open'),
    narration: text('narration').notNull().default(''),
    totalAmount: text('total_amount').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('purchase_orders_company_number_idx').on(
      table.companyId,
      table.orderNumber,
    ),
  ],
)

export const purchaseOrderLines = pgTable(
  'purchase_order_lines',
  {
    id: uuid().defaultRandom().primaryKey(),
    purchaseOrderId: uuid('purchase_order_id')
      .notNull()
      .references(() => purchaseOrders.id),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id),
    description: text('description').notNull(),
    quantity: text('quantity').notNull(),
    unit: text('unit').notNull(),
    rate: text('rate').notNull(),
    gstRate: text('gst_rate').notNull(),
  },
  (table) => [
    index('purchase_order_lines_order_idx').on(table.purchaseOrderId),
  ],
)

export const purchaseGrns = pgTable(
  'purchase_grns',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    purchaseOrderId: uuid('purchase_order_id').references(
      () => purchaseOrders.id,
    ),
    supplierId: uuid('supplier_id')
      .notNull()
      .references(() => parties.id),
    grnNumber: text('grn_number').notNull(),
    grnDate: text('grn_date').notNull(),
    status: text('status').notNull().default('open'),
    convertedToBillId: uuid('converted_to_bill_id'),
    narration: text('narration').notNull().default(''),
    godownName: text('godown_name'),
    totalAmount: text('total_amount').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('purchase_grns_company_number_idx').on(
      table.companyId,
      table.grnNumber,
    ),
  ],
)

export const purchaseGrnLines = pgTable(
  'purchase_grn_lines',
  {
    id: uuid().defaultRandom().primaryKey(),
    purchaseGrnId: uuid('purchase_grn_id')
      .notNull()
      .references(() => purchaseGrns.id),
    purchaseOrderLineId: uuid('purchase_order_line_id').references(
      () => purchaseOrderLines.id,
    ),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id),
    description: text('description').notNull(),
    quantity: text('quantity').notNull(),
    unit: text('unit').notNull(),
    rate: text('rate').notNull(),
    gstRate: text('gst_rate').notNull(),
  },
  (table) => [index('purchase_grn_lines_grn_idx').on(table.purchaseGrnId)],
)

export const eInvoices = pgTable(
  'e_invoices',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    salesInvoiceId: uuid('sales_invoice_id')
      .notNull()
      .references(() => salesInvoices.id),
    irn: text('irn').notNull(),
    ackNumber: text('ack_number').notNull(),
    ackDate: text('ack_date').notNull(),
    qrCodeData: text('qr_code_data').notNull(),
    generatedAt: timestamp('generated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('e_invoices_sales_invoice_idx').on(table.salesInvoiceId),
    index('e_invoices_company_idx').on(table.companyId),
  ],
)

export const eWayBills = pgTable(
  'e_way_bills',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    salesInvoiceId: uuid('sales_invoice_id')
      .notNull()
      .references(() => salesInvoices.id),
    ewbNumber: text('ewb_number').notNull(),
    ewbDate: text('ewb_date').notNull(),
    vehicleNumber: text('vehicle_number'),
    validUntil: text('valid_until').notNull(),
    generatedAt: timestamp('generated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('e_way_bills_sales_invoice_idx').on(table.salesInvoiceId),
    index('e_way_bills_company_idx').on(table.companyId),
  ],
)

export const gstr2bItcDecisions = pgTable(
  'gstr2b_itc_decisions',
  {
    id: uuid().defaultRandom().primaryKey(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id),
    periodStart: text('period_start').notNull(),
    periodEnd: text('period_end').notNull(),
    rowKey: text('row_key').notNull(),
    status: text('status').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('gstr2b_itc_decisions_unique_idx').on(
      table.companyId,
      table.periodStart,
      table.periodEnd,
      table.rowKey,
    ),
    index('gstr2b_itc_decisions_company_period_idx').on(
      table.companyId,
      table.periodStart,
      table.periodEnd,
    ),
  ],
)
