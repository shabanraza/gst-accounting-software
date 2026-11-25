export function formatInr(value: string | number) {
  const amount = Math.round(Number(value) * 100) / 100
  // `+ 0` turns -0 into 0 so tiny negative balances never show as "₹-0.00".
  return `₹${(amount + 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
