export type CommandHandler = (args?: Record<string, unknown>) => void | boolean

const registry = new Map<string, CommandHandler>()

export function registerCommand(name: string, handler: CommandHandler): void {
  registry.set(name, handler)
}

export function getCommand(name: string): CommandHandler | undefined {
  return registry.get(name)
}

export function runCommand(name: string, args?: Record<string, unknown>): boolean {
  const handler = registry.get(name)
  if (!handler) {
    console.warn(`[commands] 未注册的命令: ${name}`)
    return false
  }
  try {
    const result = handler(args)
    if (recordSink && !MACRO_CTL.has(name)) recordSink({ command: name, args })
    return result !== false
  } catch (err) {
    console.error(`[commands] 执行失败: ${name}`, err)
    return false
  }
}

export function commandNames(): string[] {
  return [...registry.keys()]
}

// ---- 宏录制钩子 ----
export interface MacroEntry {
  command: string
  args?: Record<string, unknown>
}

const MACRO_CTL = new Set(['record_macro', 'run_macro', 'save_macro', 'redo_or_repeat'])

let recordSink: ((e: MacroEntry) => void) | null = null
export function setMacroRecordSink(sink: ((e: MacroEntry) => void) | null): void {
  recordSink = sink
}

/** 命令元数据（用于 Command Palette 显示分组与描述） */
export interface CommandMeta {
  command: string
  title: string
  category?: string
  description?: string
}

const commandMeta: CommandMeta[] = []

export function registerCommandMeta(meta: CommandMeta): void {
  commandMeta.push(meta)
}

export function getCommandMetas(): CommandMeta[] {
  return commandMeta
}