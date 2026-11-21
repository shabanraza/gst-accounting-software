import Decimal from 'decimal.js'
import { describe, expect, test } from 'vitest'

import { fitReturnToDocument } from '#/features/returns/credit-debit-note-service.ts'
import { InMemoryCreditDebitNoteRepository } from '#/features/returns/credit-debit-note-store.ts'

// An invoice saved before CGST/SGST were rounded half-first: ₹10.50 at 18%
// stored GST 1.89, while recomputing today gives 2 × 0.95 = 1.90.
const legacyInvoice = {
  id: 'inv-1',
  taxableAmount: '10.50',
  totalGstAmount: '1.89',
}

function note(taxableAmount: string, totalGstAmount: string) {
  return {
    companyId: 'company-1',
    noteType: 'credit' as const,
    noteNumber: 'CN-0001',
    noteDate: '2026-11-20',
    partyId: 'party-1',
    referenceDocumentId: 'inv-1',
    taxableAmount,
    totalGstAmount,
    totalAmount: new Decimal(taxableAmount).plus(totalGstAmount).toFixed(2),
    ledgerEntryId: 'entry-1',
    narration: '',
  }
}

describe('fitReturnToDocument', () => {
  test('a full return reverses exactly the GST the document charged', async () => {
    const gst = await fitReturnToDocument(
      new InMemoryCreditDebitNoteRepository(),
      {
        companyId: 'company-1',
        document: legacyInvoice,
        taxableTotal: new Decimal('10.50'),
        gstTotal: new Decimal('1.90'),
      },
    )
    expect(gst.gstTotal.toFixed(2)).toBe('1.89')
    expect(gst.taxableTotal.toFixed(2)).toBe('10.50')
  })

  test('the last return takes the GST left after earlier returns, so no paisa is stuck', async () => {
    const notes = new InMemoryCreditDebitNoteRepository()
    await notes.create({ id: 'n1', createdAt: new Date(), ...note('5.25', '0.94') })
    const gst = await fitReturnToDocument(notes, {
      companyId: 'company-1',
      document: legacyInvoice,
      taxableTotal: new Decimal('5.25'),
      gstTotal: new Decimal('0.94'),
    })
    expect(gst.gstTotal.toFixed(2)).toBe('0.95')
    expect(gst.taxableTotal.toFixed(2)).toBe('5.25')
  })

  test('a part return keeps its own GST but never more than is left', async () => {
    const notes = new InMemoryCreditDebitNoteRepository()
    const part = await fitReturnToDocument(notes, {
      companyId: 'company-1',
      document: legacyInvoice,
      taxableTotal: new Decimal('5.00'),
      gstTotal: new Decimal('0.90'),
    })
    expect(part.gstTotal.toFixed(2)).toBe('0.90')
    expect(part.taxableTotal.toFixed(2)).toBe('5.00')

    await notes.create({ id: 'n1', createdAt: new Date(), ...note('10.00', '1.80') })
    const capped = await fitReturnToDocument(notes, {
      companyId: 'company-1',
      document: legacyInvoice,
      taxableTotal: new Decimal('0.40'),
      gstTotal: new Decimal('0.18'),
    })
    expect(capped.gstTotal.toFixed(2)).toBe('0.09')
    expect(capped.taxableTotal.toFixed(2)).toBe('0.40')
  })
})

describe('fitReturnToDocument after several part returns', () => {
  test('a last return a paisa short of what is left takes exactly what is left', async () => {
    const notes = new InMemoryCreditDebitNoteRepository()
    const invoice = { id: 'inv-1', taxableAmount: '254.24', totalGstAmount: '45.76' }
    await notes.create({ id: 'n1', createdAt: new Date(), ...note('84.74', '15.26') })
    await notes.create({ id: 'n2', createdAt: new Date(), ...note('84.74', '15.26') })
    const last = await fitReturnToDocument(notes, {
      companyId: 'company-1',
      document: invoice,
      taxableTotal: new Decimal('84.74'),
      gstTotal: new Decimal('15.26'),
    })
    expect(last.taxableTotal.toFixed(2)).toBe('84.76')
    expect(last.gstTotal.toFixed(2)).toBe('15.24')
  })
})
