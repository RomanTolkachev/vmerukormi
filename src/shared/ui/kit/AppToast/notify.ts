import {toast} from 'sonner'
import type {ReactNode} from 'react'

export type AppToastType = 'alert' | 'error' | 'success' | 'info'

export type AppToastOptions = {
  id?: string
}

function show(toastType: AppToastType, message: ReactNode, options: AppToastOptions = {}): void {
  const toastId = options.id ?? (
    typeof message === 'string' ? `${toastType}:${message}` : toastType
  )

  switch (toastType) {
    case 'error':
      toast.error(message, {id: toastId})
      break
    case 'success':
      toast.success(message, {id: toastId})
      break
    case 'alert':
      toast.warning(message, {id: toastId})
      break
    case 'info':
      toast.info(message, {id: toastId})
      break
  }
}

export const notify = {
  show,
  error: (message: ReactNode, options?: AppToastOptions) => show('error', message, options),
  success: (message: ReactNode, options?: AppToastOptions) => show('success', message, options),
  alert: (message: ReactNode, options?: AppToastOptions) => show('alert', message, options),
  info: (message: ReactNode, options?: AppToastOptions) => show('info', message, options),
}

