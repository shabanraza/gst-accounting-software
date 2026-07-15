export function bankReconStatusLabel(status: string) {
  if (status === 'matched') return 'Matched'
  if (status === 'unmatched_book') return 'In books only'
  return 'In statement only'
}

export function bankReconRowAmount(row: {
  statementDebit?: string | null
  statementCredit?: string | null
  bookDebit?: string | null
  bookCredit?: string | null
}) {
  const statementAmount =
    Number(row.statementCredit) > 0
      ? row.statementCredit
      : row.statementDebit
  const bookAmount =
    Number(row.bookDebit) > 0 ? row.bookDebit : row.bookCredit

  return {
    statementAmount: statementAmount ?? '0',
    bookAmount: bookAmount ?? '0',
  }
}
