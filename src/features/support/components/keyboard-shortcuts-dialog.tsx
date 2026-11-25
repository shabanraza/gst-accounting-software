import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog.tsx'
import { Kbd, KbdGroup } from '#/components/ui/kbd.tsx'

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], action: 'Search pages, parties and items' },
  { keys: ['Ctrl', 'B'], action: 'Show or hide the sidebar' },
  { keys: ['Alt', 'A'], action: 'Open Ask AI' },
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
        <ul className="flex flex-col divide-y">
          {SHORTCUTS.map((shortcut) => (
            <li
              className="flex items-center justify-between gap-4 py-2"
              key={shortcut.action}
            >
              <span>{shortcut.action}</span>
              <KbdGroup className="shrink-0">
                {shortcut.keys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </KbdGroup>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
