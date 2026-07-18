import * as React from 'react'
import { Keyboard } from 'react-native'

type FormPickerContextValue = {
  anyPickerOpen: boolean
  dismissOnFocus: () => void
  registerPickerOpen: () => void
  registerPickerClose: () => void
  registerDismissOnFocus: (handler: () => void) => () => void
}

const FormPickerContext = React.createContext<FormPickerContextValue | null>(null)

export function useFormPickerContext() {
  return React.useContext(FormPickerContext)
}

/** @deprecated Use useFormPickerContext */
export function useFormPickerDismissOnFocus() {
  return useFormPickerContext()
}

export function useFormPickerOpenRegistration(visible: boolean) {
  const context = useFormPickerContext()

  React.useEffect(() => {
    if (!context || !visible) return
    context.registerPickerOpen()
    return () => context.registerPickerClose()
  }, [context, visible])
}

export function FormPickerScope({
  children,
  dismissOnFocus: dismissOnFocusProp,
}: {
  children: React.ReactNode
  dismissOnFocus?: () => void
}) {
  const [openCount, setOpenCount] = React.useState(0)
  const dismissHandlersRef = React.useRef(new Set<() => void>())

  const registerPickerOpen = React.useCallback(() => {
    setOpenCount((count) => count + 1)
  }, [])

  const registerPickerClose = React.useCallback(() => {
    setOpenCount((count) => Math.max(0, count - 1))
  }, [])

  const registerDismissOnFocus = React.useCallback((handler: () => void) => {
    dismissHandlersRef.current.add(handler)
    return () => {
      dismissHandlersRef.current.delete(handler)
    }
  }, [])

  const dismissOnFocus = React.useCallback(() => {
    dismissOnFocusProp?.()
    dismissHandlersRef.current.forEach((handler) => handler())
  }, [dismissOnFocusProp])

  const value = React.useMemo(
    () => ({
      anyPickerOpen: openCount > 0,
      dismissOnFocus,
      registerPickerOpen,
      registerPickerClose,
      registerDismissOnFocus,
    }),
    [
      dismissOnFocus,
      openCount,
      registerDismissOnFocus,
      registerPickerClose,
      registerPickerOpen,
    ],
  )

  return (
    <FormPickerContext.Provider value={value}>{children}</FormPickerContext.Provider>
  )
}

export function useFormPickerCoordination<T extends string>(ids: readonly T[]) {
  const context = useFormPickerContext()
  const [openId, setOpenId] = React.useState<T | null>(null)

  const closeAll = React.useCallback(() => {
    setOpenId(null)
  }, [])

  const open = React.useCallback((id: T) => {
    Keyboard.dismiss()
    setOpenId(id)
  }, [])

  const isOpen = React.useCallback((id: T) => openId === id, [openId])

  React.useEffect(() => {
    if (!context) return
    return context.registerDismissOnFocus(closeAll)
  }, [closeAll, context])

  const anyOpen = openId !== null && ids.includes(openId)

  return {
    open,
    closeAll,
    isOpen,
    anyOpen,
    dismissOnFocus: closeAll,
  }
}
