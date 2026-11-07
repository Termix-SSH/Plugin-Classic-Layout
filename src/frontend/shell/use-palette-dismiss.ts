import { useEffect } from "react";

/** Closes the command palette on Escape while it is open. */
export function usePaletteDismiss(
  isOpen: boolean,
  setIsOpen: (isOpen: boolean) => void,
): void {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, setIsOpen]);
}
