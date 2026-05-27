import { useCallback, useRef } from 'react'
import { useAppStore } from '@/stores'
import { debugLogger, type DebugEventType, type DebugLogLevel } from '@/lib/debugLogger'

/**
 * Hook for tracking user interactions in a component.
 * All logging is gated by the global `debugMode` flag.
 *
 * Usage:
 *   const { trackClick, track } = useDebugTrack('MyComponent')
 *   <button onClick={trackClick(handleClick, 'save')}>Save</button>
 */
export function useDebugTrack(componentName: string) {
  const debugMode = useAppStore((s) => s.debugMode)
  const sourceRef = useRef(componentName)
  sourceRef.current = componentName

  const track = useCallback(
    (type: DebugEventType, action: string, data?: unknown, level?: DebugLogLevel) => {
      if (!debugMode) return
      debugLogger.log(type, sourceRef.current, action, data, level)
    },
    [debugMode],
  )

  /**
   * Wraps an onClick handler to log a click event before executing it.
   * Returns a new function with the same signature.
   *
   * Usage:
   *   onClick={trackClick(() => doSomething(), 'action:label')}
   *   onClick={trackClick(handleSubmit, 'form:submit')}
   */
  const trackClick = useCallback(
    <T extends (...args: never[]) => unknown>(handler: T, action?: string) => {
      return ((...args: Parameters<T>) => {
        if (debugMode) {
          debugLogger.log('click', sourceRef.current, action ?? 'click')
        }
        return handler(...args)
      }) as T
    },
    [debugMode],
  )

  /**
   * Returns props to spread onto interactive elements for overlay hover detection.
   * Adds data-debug-source and data-debug-action attributes.
   */
  const debugProps = useCallback(
    (action: string) => ({
      'data-debug-source': componentName,
      'data-debug-action': action,
    }),
    [componentName],
  )

  return { track, trackClick, debugProps, debugMode } as const
}
