import type {
  BankReconciliationMatchRecord,
  BankReconciliationRepository,
  BankStatementLineRecord,
  BankStatementRecord,
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
