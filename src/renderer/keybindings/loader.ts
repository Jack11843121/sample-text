import { store } from '../store'
import { runCommand } from '../commands/registry'
import { getFocusedEditor, getFocusedModel } from '../editor/session'
import {
  parseKeys,
  chordId,
  keyChordOfKeyboardEvent,
  evalContext,
  type KeybindContextState
} from '@shared/keybinding'
import type { KeyBindingRule, KeyChord, Platform } from '@shared/types'

interface IndexedBinding {
  rule: KeyBindingRule
  chords: KeyChord[]
}

let bindings: IndexedBinding[] = []
let byFirstChord = new Map<string, IndexedBinding[]>()
const platform = window.sampleText.platform as Platform
let lastChords: { time: number; chords: KeyChord[] } | null = null
let involved = false

function indexBindings(): void {
  byFirstChord = new Map()
  for (const b of bindings) {
    const first = chordId(b.chords[0])
    const list = byFirstChord.get(first) ?? []
    list.push(b)
    byFirstChord.set(first, list)
  }
}

export function setKeybindings(rules: KeyBindingRule[]): void {
  bindings = []
  for (const rule of rules) {
    try {
      const chords = parseKeys(rule.keys, platform)
      if (chords.length === 0) continue
      bindings.push({ rule, chords })
    } catch {
      // 忽略非法键位
    }
  }
  indexBindings()
}

function buildContextState(): KeybindContextState {
  const editor = getFocusedEditor()
  const model = getFocusedModel()
  const selections = editor?.getSelections() ?? []
  const hasSelection = selections.some((s) => !s.isEmpty())
  const s = store.getState()
  return {
    numSelections: selections.length,
    hasSelection,
    selectionIsEmpty: !hasSelection,
    panel: s.ui.palette.open
      ? s.ui.palette.mode === 'command'
        ? 'command_palette'
        : 'goto'
      : s.ui.buildPanel.open
        ? 'output'
        : null,
    isReadOnly: false,
    scopeName: model ? 'source.' + (model.getLanguageId() ?? '') : '',
    settings: s.settings
  }
}

function matchesRule(b: IndexedBinding, state: KeybindContextState): boolean {
  return evalContext(b.rule.context, state)
}

function execute(b: IndexedBinding): void {
  runCommand(b.rule.command, b.rule.args)
}

function handleKeydown(e: KeyboardEvent): void {
  // 忽略来自我们 UI <input> 的事件（命令面板/查找输入框自行处理）
  if (e.isComposing) return
  const target = e.target as HTMLElement | null
  if (target) {
    const tag = target.tagName
    if (tag === 'INPUT' || tag === 'SELECT') return
  }

  const chord = keyChordOfKeyboardEvent(e, platform)
  if (chord.key === '') return // 纯修饰键

  const state = buildContextState()
  const now = performance.now()

  // 处理二段和弦（如 ctrl+k, ctrl+b）
  if (lastChords && now - lastChords.time < 1200) {
    const firstId = chordId(lastChords.chords[0])
    const secondId = chordId(chord)
    const seqCandidates = (byFirstChord.get(firstId) ?? []).filter((b) => b.chords.length > 1)
    for (const b of seqCandidates) {
      if (b.chords.length === 2 && chordId(b.chords[1]) === secondId && matchesRule(b, state)) {
        e.preventDefault()
        e.stopPropagation()
        lastChords = null
        execute(b)
        return
      }
    }
  }

  // 单段匹配（包含被 interposed 的情况）
  const candidates = byFirstChord.get(chordId(chord)) ?? []
  // 更长的序列：若按下的是某序列的首键，记为 pending 而不立即触发单段
  for (const b of candidates) {
    if (b.chords.length === 1 && matchesRule(b, state)) {
      e.preventDefault()
      e.stopPropagation()
      execute(b)
      lastChords = null
      return
    }
  }
  if (candidates.some((b) => b.chords.length > 1)) {
    lastChords = { time: now, chords: [chord] }
    e.preventDefault()
    return
  }
  lastChords = null
}

let attached = false
export function initKeyboard(): void {
  if (attached) return
  attached = true
  window.addEventListener('keydown', handleKeydown, true)
  involved = true
}

export { involved }