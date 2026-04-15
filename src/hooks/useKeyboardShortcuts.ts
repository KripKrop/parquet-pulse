import { useEffect } from "react";

interface ShortcutHandlers {
  onToggleHelp?: () => void;
  onToggleColumnSettings?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // Ctrl+/ → toggle help
      if (mod && e.key === "/") {
        e.preventDefault();
        handlers.onToggleHelp?.();
        return;
      }

      // Ctrl+Shift+C → toggle column settings
      if (mod && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        handlers.onToggleColumnSettings?.();
        return;
      }

      // Skip single-key shortcuts when in input
      if (isInput) return;

      // ? → toggle help (no modifier)
      if (e.key === "?") {
        e.preventDefault();
        handlers.onToggleHelp?.();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handlers]);
}
