import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  PencilIcon,
  PlusIcon,
  StarIcon,
  Trash2Icon,
  WarehouseIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
import { Input } from '#/components/ui/input.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'
import type { GodownRecord } from '#/features/inventory/godown-service.ts'

export function GodownsPanel() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, isReady } = useWorkspace()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editGodown, setEditGodown] = React.useState<GodownRecord | null>(null)
  const [name, setName] = React.useState('')

  const godownsQuery = useQuery({
    ...trpc.inventory.listGodowns.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })

  const createMutation = useMutation(
    trpc.inventory.createGodown.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.inventory.listGodowns.queryKey({
            companyId: companyId ?? '',
          }),
        })
        setCreateOpen(false)
        setName('')
        toast.success('Godown created')
      },
      onError: (error) => toastActionError(error, 'Action failed'),
    }),
  )

  const updateMutation = useMutation(
    trpc.inventory.updateGodown.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.inventory.listGodowns.queryKey({
            companyId: companyId ?? '',
          }),
        })
        setEditGodown(null)
        setName('')
        toast.success('Godown updated')
      },
      onError: (error) => toastActionError(error, 'Action failed'),
    }),
  )

  const deleteMutation = useMutation(
    trpc.inventory.deleteGodown.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.inventory.listGodowns.queryKey({
            companyId: companyId ?? '',
          }),
        })
        toast.success('Godown deleted')
      },
      onError: (error) => toastActionError(error, 'Action failed'),
    }),
  )

  const setDefaultMutation = useMutation(
    trpc.inventory.setDefaultGodown.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.inventory.listGodowns.queryKey({
            companyId: companyId ?? '',
          }),
        })
        toast.success('Default godown updated')
      },
      onError: (error) => toastActionError(error, 'Action failed'),
    }),
  )

  function openCreate() {
    setName('')
    setCreateOpen(true)
  }

  function openEdit(godown: GodownRecord) {
    setEditGodown(godown)
    setName(godown.name)
  }

  function submitCreate() {
    if (!companyId || !name.trim()) return
    createMutation.mutate({ companyId, name: name.trim() })
  }

  function submitEdit() {
    if (!companyId || !editGodown || !name.trim()) return
    updateMutation.mutate({
      companyId,
      godownId: editGodown.id,
      name: name.trim(),
    })
  }

  const godowns = godownsQuery.data ?? []

  return (
    <WorkspacePage
      actions={
        <Button onClick={openCreate} size="sm">
          <PlusIcon data-icon="inline-start" />
          Add godown
        </Button>
      }
      title="Godowns"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Default</TableHead>
            <TableHead className="w-40 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {godowns.map((godown) => (
            <TableRow key={godown.id}>
              <TableCell className="font-medium">{godown.name}</TableCell>
              <TableCell>
                {godown.isDefault ? (
                  <Badge variant="info">Default</Badge>
                ) : (
                  <Button
                    onClick={() => {
                      if (!companyId) return
                      setDefaultMutation.mutate({
                        companyId,
                        godownId: godown.id,
                      })
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    <StarIcon className="size-4" />
                    Set default
                  </Button>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    onClick={() => openEdit(godown)}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <PencilIcon className="size-4" />
                  </Button>
                  <Button
                    disabled={godown.isDefault}
                    onClick={() => {
                      if (!companyId) return
                      deleteMutation.mutate({
                        companyId,
                        godownId: godown.id,
                      })
                    }}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2Icon className="size-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {godowns.length === 0 ? (
            <TableRow>
              <TableCell className="text-muted-foreground" colSpan={3}>
                <div className="flex items-center gap-2 py-6">
                  <WarehouseIcon className="size-4" />
                  No godowns yet. Add your first warehouse location.
                </div>
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      <Dialog onOpenChange={setCreateOpen} open={createOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New godown</DialogTitle>
          </DialogHeader>
          <Input
            onChange={(event) => setName(event.target.value)}
            placeholder="Godown name"
            value={name}
          />
          <DialogFooter>
            <Button onClick={submitCreate} type="button">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) setEditGodown(null)
        }}
        open={Boolean(editGodown)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename godown</DialogTitle>
          </DialogHeader>
          <Input
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
          <DialogFooter>
            <Button onClick={submitEdit} type="button">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspacePage>
  )
}
