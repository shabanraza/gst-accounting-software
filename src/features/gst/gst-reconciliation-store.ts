export type Gstr2bItcStatus = 'pending' | 'accepted' | 'rejected'

export type Gstr2bItcDecisionRecord = {
  companyId: string
  periodStart: string
  periodEnd: string
  rowKey: string
  status: Gstr2bItcStatus
  updatedAt: Date
}

export type GstReconciliationRepository = {
  listGstr2bItcDecisions(
    companyId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<Array<Gstr2bItcDecisionRecord>>
  setGstr2bItcDecision(
    decision: Gstr2bItcDecisionRecord,
  ): Promise<Gstr2bItcDecisionRecord>
}

class InMemoryGstReconciliationRepository implements GstReconciliationRepository {
  private decisions: Array<Gstr2bItcDecisionRecord> = []

  async listGstr2bItcDecisions(
    companyId: string,
    periodStart: string,
    periodEnd: string,
  ) {
    return this.decisions.filter(
      (decision) =>
        decision.companyId === companyId &&
        decision.periodStart === periodStart &&
        decision.periodEnd === periodEnd,
    )
  }

  async setGstr2bItcDecision(decision: Gstr2bItcDecisionRecord) {
    this.decisions = this.decisions.filter(
      (existing) =>
        !(
          existing.companyId === decision.companyId &&
          existing.periodStart === decision.periodStart &&
          existing.periodEnd === decision.periodEnd &&
          existing.rowKey === decision.rowKey
        ),
    )
    this.decisions.push(decision)
    return decision
  }
}

export function createGstReconciliationRepository(): GstReconciliationRepository {
  return new InMemoryGstReconciliationRepository()
}

export const gstReconciliationRepository = createGstReconciliationRepository()
