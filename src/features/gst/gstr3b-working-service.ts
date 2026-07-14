import Decimal from 'decimal.js'

import { buildGstr3bReport } from '#/features/gst/gstr3b-report-service.ts'
import { reconcileGstr2b } from '#/features/gst/gstr2b-reconciliation-service.ts'
import type { GstReportDocument } from '#/features/gst/gst-report-types.ts'
import type { GstReconciliationRepository } from '#/features/gst/gst-reconciliation-store.ts'
import type { PartyRepository } from '#/features/parties/party-service.ts'
import type { PurchaseBillRepository } from '#/features/purchases/purchase-bill-service.ts'
import type { Gstr2bRow } from '#/features/gst/gstr2b-reconciliation-service.ts'

export type Gstr3bWorkingReport = {
  companyId: string
  periodStart: string
  periodEnd: string
  outwardTaxableValue: string
  outputGst: string
  booksInputGst: string
  acceptedInputGst: string
  pendingInputGst: string
  rejectedInputGst: string
  netGstPayableWithAcceptedItc: string
  netGstPayableWithBooksItc: string
}

export async function buildGstr3bWorkingReport(
  deps: {
    bills: PurchaseBillRepository
    parties: PartyRepository
    recon: GstReconciliationRepository
  },
  input: {
    companyId: string
    companyStateCode: string
    periodStart: string
    periodEnd: string
    documents: Array<GstReportDocument>
    portalRows: Array<Gstr2bRow>
  },
): Promise<Gstr3bWorkingReport> {
  const gstr3b = buildGstr3bReport({
    companyId: input.companyId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    documents: input.documents,
  })

  const recon = await reconcileGstr2b(
    { bills: deps.bills, parties: deps.parties, recon: deps.recon },
    {
      companyId: input.companyId,
      companyStateCode: input.companyStateCode,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      portalRows: input.portalRows,
    },
  )

  const outputGst = new Decimal(gstr3b.outputGst)
  const booksInputGst = new Decimal(gstr3b.inputGst)
  const acceptedInputGst = new Decimal(recon.summary.acceptedItcTotal)
  const pendingInputGst = new Decimal(recon.summary.pendingItcTotal)
  const rejectedInputGst = new Decimal(recon.summary.rejectedItcTotal)

  return {
    companyId: input.companyId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    outwardTaxableValue: gstr3b.outwardTaxableValue,
    outputGst: gstr3b.outputGst,
    booksInputGst: gstr3b.inputGst,
    acceptedInputGst: acceptedInputGst.toFixed(2),
    pendingInputGst: pendingInputGst.toFixed(2),
    rejectedInputGst: rejectedInputGst.toFixed(2),
    netGstPayableWithAcceptedItc: outputGst.minus(acceptedInputGst).toFixed(2),
    netGstPayableWithBooksItc: gstr3b.netGstPayable,
  }
}
