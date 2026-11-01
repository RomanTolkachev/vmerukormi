import type { UniversalTableResizeConfig } from "@/shared/ui/kit/universal-table/types";

export function resolveTableResize(config: UniversalTableResizeConfig | undefined, touchable: boolean) {
  const resolved = config ?? (touchable ? {mode: 'settings' as const} : true)
  if (typeof resolved === 'boolean') return {drag: resolved, columns: resolved}
  if (Array.isArray(resolved)) return {drag: resolved, columns: resolved}
  const options = resolved as {mode: 'both' | 'settings'; columns?: readonly string[]}
  return {drag: options.mode === 'settings' ? false : options.columns ?? true, columns: options.columns ?? true}
}
export function canResizeColumn(config: boolean | readonly string[], id: string) {
  return config === true || (Array.isArray(config) && config.includes(id))
}

