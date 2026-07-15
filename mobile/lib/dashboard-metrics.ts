type AgeingBuckets = {
  '0-30': string
  '31-60': string
  '61-90': string
  '90+': string
}

export type OwnerSnapshot = {
  asOfDate: string
  today: {
    salesTotal: string
    purchaseTotal: string
    moneyIn: string
    moneyOut: string
    expensesTotal: string
    netCashFlow: string
  }
  balances: {
    receivableTotal: string
    payableTotal: string
    cashBankBalance: string
  }
  ageing: {
    receivables: AgeingBuckets
    payables: AgeingBuckets
  }
}

export type DashboardMetric = {
  id: string
  label: string
  amount: string
  icon: 'trending-up-outline' | 'cash-outline' | 'arrow-down-outline' | 'arrow-up-outline' | 'wallet-outline'
  tone: 'blue' | 'emerald' | 'amber' | 'violet'
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

export function mapOwnerSnapshotMetrics(snapshot: OwnerSnapshot): Array<DashboardMetric> {
  return [
    {
      id: 'sales',
      label: 'Sales',
      amount: snapshot.today.salesTotal,
      icon: 'trending-up-outline',
      tone: 'blue',
    },
    {
      id: 'receipts',
      label: 'Receipts',
      amount: snapshot.today.moneyIn,
      icon: 'cash-outline',
      tone: 'emerald',
    },
    {
      id: 'receivables',
      label: 'Receivables',
      amount: snapshot.balances.receivableTotal,
      icon: 'arrow-down-outline',
      tone: 'violet',
    },
    {
      id: 'payables',
      label: 'Payables',
      amount: snapshot.balances.payableTotal,
      icon: 'arrow-up-outline',
      tone: 'amber',
    },
    {
      id: 'cash',
      label: 'Cash & bank',
      amount: snapshot.balances.cashBankBalance,
      icon: 'wallet-outline',
      tone: 'blue',
    },
  ]
}

function sumAgeingOverdue(buckets: AgeingBuckets) {
  return (
    Number(buckets['31-60']) +
    Number(buckets['61-90']) +
    Number(buckets['90+'])
  )
}

export function getOverdueTotals(snapshot: OwnerSnapshot) {
  return {
    receivables: sumAgeingOverdue(snapshot.ageing.receivables),
    payables: sumAgeingOverdue(snapshot.ageing.payables),
  }
}

export function formatDashboardDate(date: string) {
  const value = new Date(`${date}T12:00:00`)
  return value.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
