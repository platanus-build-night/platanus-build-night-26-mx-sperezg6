"use client";

import { createContext, useContext, useState } from "react";

type ShellContextValue = {
  /** Whether the mobile nav drawer is open. */
  navOpen: boolean;
  setNavOpen: (open: boolean) => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  return (
    <ShellContext.Provider value={{ navOpen, setNavOpen }}>{children}</ShellContext.Provider>
  );
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used within a ShellProvider");
  return ctx;
}
