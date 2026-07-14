// TODO: Bank statement imports and reconciliation matches are in-memory only.
// Add Drizzle tables (bank_statements, bank_statement_lines, bank_reconciliation_matches)
// when bank recon persistence is prioritized.
import {
  DuplicateBankMatchError,
  type BankReconciliationMatchRecord,
  type BankReconciliationRepository,
  type BankStatementLineRecord,
  type BankStatementRecord,
} from '#/features/banking/bank-reconciliation-service.ts'

export class InMemoryBankReconciliationRepository
  implements BankReconciliationRepository
{
  private statements: Array<BankStatementRecord> = []
  private lines: Array<BankStatementLineRecord> = []
  private matches: Array<BankReconciliationMatchRecord> = []

  async createStatement(
    statement: BankStatementRecord,
    lineRecords: Array<BankStatementLineRecord>,
  ) {
    this.statements.push(statement)
    this.lines.push(...lineRecords)
    return statement
  }

  async listStatementsByCompany(companyId: string) {
    return this.statements.filter(
      (statement) => statement.companyId === companyId,
    )
  }

  async listStatementLines(companyId: string, statementId: string) {
    return this.lines.filter(
      (line) =>
        line.companyId === companyId && line.statementId === statementId,
    )
  }

  async listMatchesByCompany(companyId: string) {
    return this.matches.filter((match) => match.companyId === companyId)
  }

  async createMatch(match: BankReconciliationMatchRecord) {
    const duplicate = this.matches.some(
      (existing) =>
        existing.companyId === match.companyId &&
        (existing.statementLineId === match.statementLineId ||
          existing.ledgerEntryId === match.ledgerEntryId),
    )
    if (duplicate) {
      throw new DuplicateBankMatchError()
    }

    this.matches.push(match)
    return match
  }

  async deleteMatch(companyId: string, matchId: string) {
    this.matches = this.matches.filter(
      (match) => !(match.companyId === companyId && match.id === matchId),
    )
  }
}

export function createBankReconciliationRepository(): BankReconciliationRepository {
  return new InMemoryBankReconciliationRepository()
}

export const bankReconciliationRepository = createBankReconciliationRepository()
