type OwnerSnapshot = {
  today: { salesTotal: string }
  balances: {
    receivableTotal: string
    payableTotal: string
    cashBankBalance: string
  }
}

export function mapOwnerSnapshotCards(snapshot: OwnerSnapshot) {
  return [
    { title: "Today's sales", amount: snapshot.today.salesTotal, badge: 'Sales' },
    {
      title: 'Receivables',
      amount: snapshot.balances.receivableTotal,
      badge: 'Due in',
    },
    {
      title: 'Payables',
      amount: snapshot.balances.payableTotal,
      badge: 'Outstanding',
    },
    {
      title: 'Cash & bank',
      amount: snapshot.balances.cashBankBalance,
      badge: 'Balance',
    },
  ]
}
