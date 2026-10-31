import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '#/components/ui/table.tsx'

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], action: 'Search pages, parties and items' },
  { keys: ['Ctrl', 'B'], action: 'Show or hide the sidebar' },
  { keys: ['Alt', 'S'], action: 'New sales invoice' },
  { keys: ['Alt', 'P'], action: 'New purchase bill' },
  { keys: ['Alt', 'R'], action: 'Record a customer receipt' },
  { keys: ['Alt', 'Y'], action: 'Record a supplier payment' },
  { keys: ['F2'], action: 'Save the invoice or bill' },
  {
    keys: ['Enter'],
    action: 'Next cell in the item grid; on the last cell, a new line',
  },
  { keys: ['F9'], action: 'Delete the current item line' },
] as const

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <Table>
          <TableBody>
            {SHORTCUTS.map((shortcut) => (
              <TableRow key={shortcut.action}>
                <TableCell className="whitespace-normal">
                  {shortcut.action}
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex gap-1">
                    {shortcut.keys.map((key) => (
                      <kbd
                        key={key}
                        className="rounded border bg-muted px-1.5 font-mono text-[11px]"
                      >
                        {key}
                      </kbd>
                    ))}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  )
}
