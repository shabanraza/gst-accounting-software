import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MailIcon, Trash2Icon, UserPlusIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog.tsx'
import { Input } from '#/components/ui/input.tsx'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { getFormErrorMessage } from '#/features/app-shell/form-error.ts'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { useTRPC } from '#/integrations/trpc/react.ts'
import { authClient } from '#/lib/auth-client.ts'

const assignableRoles = [
  { value: 'admin', label: 'Admin' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'billing', label: 'Billing' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'readonly', label: 'Read only' },
] as const

type AssignableRole = (typeof assignableRoles)[number]['value']

export function TeamMembersPanel() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId } = useWorkspace()
  const { data: session } = authClient.useSession()
  const currentUserId = session?.user.id

  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState('')
  const [inviteRole, setInviteRole] = React.useState<AssignableRole>('billing')
  const [formError, setFormError] = React.useState<string | null>(null)

  const enabled = Boolean(companyId)
  const membersQuery = useQuery({
    ...trpc.team.listMembers.queryOptions({ companyId: companyId ?? '' }),
    enabled,
  })

  const queryKey = trpc.team.listMembers.queryKey({ companyId: companyId ?? '' })
  const invalidate = () => queryClient.invalidateQueries({ queryKey })

  const inviteMutation = useMutation({
    ...trpc.team.invite.mutationOptions(),
    onSuccess: () => void invalidate(),
  })
  const resendMutation = useMutation(trpc.team.resendInvite.mutationOptions())
  const revokeMutation = useMutation({
    ...trpc.team.revokeInvite.mutationOptions(),
    onSuccess: () => void invalidate(),
  })
  const updateRoleMutation = useMutation({
    ...trpc.team.updateRole.mutationOptions(),
    onSuccess: () => void invalidate(),
  })
  const removeMutation = useMutation({
    ...trpc.team.removeMember.mutationOptions(),
    onSuccess: () => void invalidate(),
  })

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!companyId || !inviteEmail.trim()) return
    setFormError(null)
    try {
      await inviteMutation.mutateAsync({
        companyId,
        email: inviteEmail.trim(),
        role: inviteRole,
      })
      setInviteEmail('')
      setInviteRole('billing')
      setInviteOpen(false)
    } catch (error) {
      setFormError(getFormErrorMessage(error, 'Unable to send invite'))
    }
  }

  const data = membersQuery.data
  const members = data?.members ?? []
  const invitations = data?.invitations ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base">Team members</CardTitle>
          <CardDescription>
            Invite teammates and control what they can do.
          </CardDescription>
        </div>
        <Dialog onOpenChange={setInviteOpen} open={inviteOpen}>
          <DialogTrigger asChild>
            <Button disabled={!companyId} size="sm">
              <UserPlusIcon data-icon="inline-start" />
              Invite
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite teammate</DialogTitle>
              <DialogDescription>
                They will receive an email link to join this company.
              </DialogDescription>
            </DialogHeader>
            <form className="flex flex-col gap-4" onSubmit={handleInvite}>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" htmlFor="invite-email">
                  Email
                </label>
                <Input
                  id="invite-email"
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="teammate@business.com"
                  required
                  type="email"
                  value={inviteEmail}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium">Role</span>
                <Select
                  onValueChange={(value) =>
                    setInviteRole(value as AssignableRole)
                  }
                  value={inviteRole}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {assignableRoles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              {formError ? (
                <p className="text-sm text-destructive">{formError}</p>
              ) : null}
              <DialogFooter>
                <Button disabled={inviteMutation.isPending} type="submit">
                  {inviteMutation.isPending ? 'Sending…' : 'Send invite'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const isSelf = member.userId === currentUserId
              const isOwner = member.role === 'owner'
              return (
                <TableRow key={member.userId}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {member.name ?? member.email ?? member.userId.slice(0, 8)}
                        {isSelf ? ' (you)' : ''}
                      </span>
                      {member.email ? (
                        <span className="text-xs text-muted-foreground">
                          {member.email}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {isOwner || isSelf ? (
                      <Badge variant="outline">{member.role}</Badge>
                    ) : (
                      <Select
                        onValueChange={(value) =>
                          companyId &&
                          updateRoleMutation.mutate({
                            companyId,
                            userId: member.userId,
                            role: value as AssignableRole,
                          })
                        }
                        value={member.role}
                      >
                        <SelectTrigger className="h-8 w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {assignableRoles.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>
                    {isOwner || isSelf ? null : (
                      <Button
                        onClick={() =>
                          companyId &&
                          removeMutation.mutate({
                            companyId,
                            userId: member.userId,
                          })
                        }
                        size="icon-sm"
                        variant="ghost"
                      >
                        <Trash2Icon />
                        <span className="sr-only">Remove member</span>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {members.length === 0 ? (
              <TableRow>
                <TableCell
                  className="text-sm text-muted-foreground"
                  colSpan={3}
                >
                  No members yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>

        {invitations.length > 0 ? (
          <div className="flex flex-col gap-2 px-6">
            <span className="text-xs font-medium text-muted-foreground">
              Pending invitations
            </span>
            {invitations.map((invitation) => (
              <div
                className="flex items-center justify-between gap-3 rounded-md border p-2"
                key={invitation.email}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{invitation.email}</span>
                  <span className="text-xs text-muted-foreground">
                    {invitation.role}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    disabled={resendMutation.isPending}
                    onClick={() =>
                      companyId &&
                      resendMutation.mutate({
                        companyId,
                        email: invitation.email,
                      })
                    }
                    size="icon-sm"
                    variant="ghost"
                  >
                    <MailIcon />
                    <span className="sr-only">Resend invite</span>
                  </Button>
                  <Button
                    onClick={() =>
                      companyId &&
                      revokeMutation.mutate({
                        companyId,
                        email: invitation.email,
                      })
                    }
                    size="icon-sm"
                    variant="ghost"
                  >
                    <Trash2Icon />
                    <span className="sr-only">Revoke invite</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
