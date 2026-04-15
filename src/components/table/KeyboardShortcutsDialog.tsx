import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { keys: ["Ctrl", "/"], description: "Toggle this help dialog" },
  { keys: ["?"], description: "Toggle this help dialog" },
  { keys: ["Ctrl", "Shift", "C"], description: "Toggle column settings" },
  { keys: ["↑", "↓"], description: "Navigate rows (in row detail)" },
  { keys: ["J", "K"], description: "Navigate rows (in row detail)" },
  { keys: ["Esc"], description: "Close modal / popover" },
];

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <Table>
          <TableBody>
            {shortcuts.map((s, i) => (
              <TableRow key={i}>
                <TableCell className="py-2">
                  <div className="flex items-center gap-1">
                    {s.keys.map((key, ki) => (
                      <span key={ki}>
                        {ki > 0 && <span className="text-muted-foreground mx-0.5">+</span>}
                        <kbd className="px-1.5 py-0.5 rounded bg-muted border text-xs font-mono">
                          {key}
                        </kbd>
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="py-2 text-sm text-muted-foreground">
                  {s.description}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
