"use client";

import { createContext, useContext, useMemo, useTransition, type ComponentPropsWithRef, type ReactNode } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";

type Router = ReturnType<typeof useRouter>;
const NavigationContext = createContext<{ router: Router; pending: boolean } | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const trackedRouter = useMemo<Router>(() => ({
    ...router,
    push: (...args) => startTransition(() => router.push(...args)),
    replace: (...args) => startTransition(() => router.replace(...args)),
    back: () => startTransition(() => router.back()),
    forward: () => startTransition(() => router.forward()),
  }), [router]);
  return <NavigationContext.Provider value={{ router: trackedRouter, pending }}>{children}</NavigationContext.Provider>;
}

function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) throw new Error("NavigationProvider отсутствует");
  return context;
}

export function useNavigationRouter() {
  return useNavigation().router;
}

export function useNavigationPending() {
  return useNavigation().pending;
}

export function NavigationLink({ href, onNavigate, replace, scroll, ...props }: Omit<ComponentPropsWithRef<typeof NextLink>, "href"> & { href: string }) {
  const router = useNavigationRouter();
  return <NextLink {...props} href={href} replace={replace} scroll={scroll} onNavigate={event => {
    let prevented = false;
    onNavigate?.({ preventDefault: () => { prevented = true; } });
    event.preventDefault();
    if (!prevented) router[replace ? "replace" : "push"](href, { scroll });
  }} />;
}
