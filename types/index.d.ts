declare module 'claude-code' {
  interface PluginState {
    'snow-and-ember': {
      /** Context window used, 0 to 100 (whole numbers). */
      snow: Shaped<number>
      /** Plan usage left in the current window, 0 to 100; -1 when no limit is reported. */
      fire: Shaped<number>
      /** Weekly plan usage used, 0 to 100; -1 when no weekly limit is reported. */
      week: Shaped<number>
    }
  }
}
export {}
