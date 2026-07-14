import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from './tanstack-query/devtools'

/** Opt in with VITE_ENABLE_DEVTOOLS=true — off by default so the FAB cannot block voucher Save. */
export function AppDevtools() {
  if (!import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEVTOOLS !== 'true') {
    return null
  }

  return (
    <TanStackDevtools
      config={{
        position: 'bottom-left',
      }}
      plugins={[
        {
          name: 'Tanstack Router',
          render: <TanStackRouterDevtoolsPanel />,
        },
        TanStackQueryDevtools,
      ]}
    />
  )
}
