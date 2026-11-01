import {useSyncExternalStore} from 'react'

function subscribe(onChange: () => void) {
  const media = window.matchMedia('(pointer: coarse)')
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

/** Uses the same touch capability and device-preview state as the Shared theme. */
export function useIsTouchable() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia('(pointer: coarse)').matches,
    () => false,
  )
}

