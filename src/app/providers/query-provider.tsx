"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { FloatingPortalRoot } from "@/shared/ui/kit/floating-portal/FloatingPortalRoot";
import { Toaster } from "sonner";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}>{children}<FloatingPortalRoot /><Toaster richColors position="bottom-right" /></QueryClientProvider>;
}
