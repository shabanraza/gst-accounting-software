export type ScreenVariant = 'tab' | 'stack'

export function shouldShowBackButton(
  variant: ScreenVariant,
  showBack?: boolean,
): boolean {
  if (variant === 'tab') {
    return false
  }
  if (showBack === false) {
    return false
  }
  return true
}
