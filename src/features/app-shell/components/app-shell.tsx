import * as React from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import {
  Building2Icon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  MoonStarIcon,
  PlusIcon,
  SearchIcon,
  SunMediumIcon,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '#/components/ui/avatar.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu.tsx'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from '#/components/ui/sidebar.tsx'
import {
  appNav,
  isAppNavPathActive,
  navLinkActiveOptions,
} from '#/features/app-shell/data/app-shell-nav.ts'
import type {
  AppNavItem,
  AppNavSection,
} from '#/features/app-shell/data/app-shell-nav.ts'
import { CommandPalette } from '#/features/app-shell/components/command-palette.tsx'
import { useTheme } from '#/features/app-shell/use-theme.ts'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { authClient } from '#/lib/auth-client.ts'

function NavItemButton({
  item,
  pathname,
}: {
  item: AppNavItem
  pathname: string
}) {
  const Icon = item.icon

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isAppNavPathActive(pathname, item.path)}
        tooltip={item.label}
      >
        <Link activeOptions={navLinkActiveOptions(item.path)} to={item.path}>
          <Icon />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function CollapsibleNavGroup({
  group,
  pathname,
}: {
  group: Extract<AppNavSection, { kind: 'group' }>
  pathname: string
}) {
  const isGroupActive = group.items.some((item) =>
    isAppNavPathActive(pathname, item.path),
  )
  const [open, setOpen] = React.useState(isGroupActive)
  const Icon = group.icon

  React.useEffect(() => {
    setOpen(isGroupActive)
  }, [isGroupActive])

  return (
    <Collapsible
      className="group/collapsible"
      key={group.label}
      onOpenChange={setOpen}
      open={open}
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={group.label}>
            <Icon />
            <span>{group.label}</span>
            <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {group.items.map((item) => {
              const ItemIcon = item.icon

              return (
                <SidebarMenuSubItem key={item.path}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isAppNavPathActive(pathname, item.path)}
                  >
                    <Link
                      activeOptions={navLinkActiveOptions(item.path)}
                      to={item.path}
                    >
                      <ItemIcon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const lastSessionRef = React.useRef(session)
  if (session) {
    lastSessionRef.current = session
  }
  const { company, companies, setActiveCompany, isReady } = useWorkspace()
  const lastCompanyRef = React.useRef(company)
  if (company) {
    lastCompanyRef.current = company
  }
  const displayCompany = company ?? lastCompanyRef.current
  const { isDark, toggle, mounted: themeMounted } = useTheme()
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const displayUser = session?.user ?? lastSessionRef.current?.user
  const userName = displayUser?.name ?? (isSessionPending ? '…' : 'Guest')
  const userEmail =
    displayUser?.email ?? (isSessionPending ? '…' : 'Sign in to sync')
  const userInitials = displayUser?.name
    ? displayUser.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || (isSessionPending ? '…' : 'G')
    : isSessionPending
      ? '…'
      : 'G'

  async function handleSignOut() {
    await authClient.signOut()
    void navigate({ to: '/login' })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SidebarProvider>
        <Sidebar className="print:hidden" collapsible="icon" variant="sidebar">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton size="lg" tooltip="Company switcher">
                      <div className="grid size-8 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <Building2Icon className="size-4" />
                      </div>
                      <div className="grid flex-1 text-left leading-tight">
                        <span className="truncate font-medium">
                          {displayCompany?.tradeName ??
                            (isReady ? 'No company' : 'Loading…')}
                        </span>
                        <span className="truncate text-muted-foreground">
                          {displayCompany
                            ? `FY ${displayCompany.financialYearStart}`
                            : 'Workspace'}
                        </span>
                      </div>
                      <ChevronsUpDownIcon className="ml-auto" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuGroup>
                      {companies.map((entry) => (
                        <DropdownMenuItem
                          key={entry.id}
                          onClick={() => void setActiveCompany(entry.id)}
                        >
                          {entry.tradeName}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild>
                        <Link to="/onboarding">Create company</Link>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarSeparator />
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {appNav.map((section) =>
                    section.kind === 'link' ? (
                      <NavItemButton
                        key={section.path}
                        item={section}
                        pathname={pathname}
                      />
                    ) : (
                      <CollapsibleNavGroup
                        group={section}
                        key={section.label}
                        pathname={pathname}
                      />
                    ),
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarSeparator />
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton size="lg" tooltip="User menu">
                      <Avatar className="size-8 rounded-lg">
                        <AvatarFallback className="rounded-lg">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left leading-tight">
                        <span className="truncate font-medium">{userName}</span>
                        <span className="truncate text-muted-foreground">
                          {userEmail}
                        </span>
                      </div>
                      <ChevronsUpDownIcon className="ml-auto" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild>
                        <Link to="/app/settings">Account</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>Billing</DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem onClick={() => void handleSignOut()}>
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <SidebarInset className="min-h-0 overflow-hidden">
          <header className="flex h-11 shrink-0 items-center gap-2 px-3 print:hidden">
            <SidebarTrigger className="-ml-1" />
            <div className="flex-1" />
            <Button
              className="gap-2"
              onClick={() => setPaletteOpen(true)}
              size="sm"
              variant="outline"
            >
              <SearchIcon data-icon="inline-start" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden rounded border bg-muted px-1 text-[10px] sm:inline">
                ⌘K
              </kbd>
            </Button>
            <Button onClick={toggle} size="sm" variant="outline">
              {themeMounted ? (
                isDark ? (
                  <SunMediumIcon data-icon="inline-start" />
                ) : (
                  <MoonStarIcon data-icon="inline-start" />
                )
              ) : (
                <MoonStarIcon data-icon="inline-start" />
              )}
              <span className="hidden md:inline">
                {themeMounted ? (isDark ? 'Light' : 'Dark') : 'Theme'}
              </span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button aria-label="New bill" variant="secondary">
                  <PlusIcon data-icon="inline-start" />
                  <span className="hidden sm:inline">New bill</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link to="/app/sales/new">New sales bill</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/app/purchases/new">New purchase bill</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/app/payments">Record payment</Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
      <CommandPalette onOpenChange={setPaletteOpen} open={paletteOpen} />
    </div>
  )
}
