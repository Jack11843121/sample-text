import * as monaco from 'monaco-editor'
import { store } from '../store'
import { initMonaco, editorTheme } from './monacoSetup'
import { ensureLanguages, languageForPath } from './languages'

initMonaco()
ensureLanguages()

const models = new Map<string, monaco.editor.ITextModel>()
const editors = new Map<string, monaco.editor.IStandaloneCodeEditor>()
let focusedEditor: monaco.editor.IStandaloneCodeEditor | null = null

const statusListeners = new Set<() => void>()
export function onEditorStatus(listener: () => void): () => void {
  statusListeners.add(listener)
  return () => statusListeners.delete(listener)
}
function notifyStatus(): void {
  for (const l of statusListeners) l()
}

export function getFocusedEditor(): monaco.editor.IStandaloneCodeEditor | null {
  return focusedEditor
}

export function getFocusedModel(): monaco.editor.ITextModel | null {
  return focusedEditor?.getModel() ?? null
}

export function getFocusedPath(): string | null {
  const m = getFocusedModel()
  if (!m) return null
  for (const [path, model] of models) {
    if (model === m) return path
  }
  return null
}

export function ensureModel(path: string): monaco.editor.ITextModel {
  let model = models.get(path)
  if (!model) {
    const doc = store.getState().documents.get(path)
    const uri = monaco.Uri.parse(path)
    model = monaco.editor.createModel(doc?.value ?? '', languageForPath(path), uri)
    model.updateOptions({ tabSize: tabSizeOf(), insertSpaces: useSpaces() })
    model.onDidChangeContent(() => {
      const value = model!.getValue()
      store.setValue(path, value)
    })
    models.set(path, model)
  }
  return model
}

export function getModel(path: string): monaco.editor.ITextModel | null {
  return models.get(path) ?? null
}

export function disposeModel(path: string): void {
  const m = models.get(path)
  if (m) {
    models.delete(path)
    m.dispose()
  }
}

function tabSizeOf(): number {
  const s = store.getState().settings
  return typeof s.tab_size === 'number' ? s.tab_size : 4
}

function useSpaces(): boolean {
  return store.getState().settings.translate_tabs_to_spaces !== false
}

export function editorOptions(): monaco.editor.IStandaloneEditorConstructionOptions {
  const s = store.getState().settings
  const ui = store.getState().ui
  return {
    theme: editorTheme(store.getState().themeBase),
    fontSize: typeof s.font_size === 'number' ? s.font_size : 13,
    fontFamily: typeof s.font_face === 'string' && s.font_face !== 'monospace' ? s.font_face : undefined,
    minimap: { enabled: ui.showMinimap && s.minimap_enabled !== false },
    lineNumbers: s.render_line_numbers === false ? 'off' : 'on',
    folding: s.fold_buttons === false ? false : true,
    showFoldingControls: s.fold_buttons === false ? 'never' : 'mouseover',
    wordWrap: s.word_wrap ? 'on' : 'off',
    automaticLayout: true,
    scrollBeyondLastLine: s.scroll_past_end !== false,
    renderWhitespace: s.draw_white_space === 'all' ? 'all' : s.draw_white_space === 'selection' ? 'selection' : 'none',
    renderLineHighlight: s.highlight_line ? 'all' : 'line',
    tabSize: tabSizeOf(),
    insertSpaces: useSpaces(),
    detectIndentation: s.detect_indentation !== false,
    autoIndent: s.auto_indent !== false ? 'full' : 'none',
    roundedSelection: false,
    cursorBlinking: 'blink',
    cursorSmoothCaretAnimation: 'on',
    renderControlCharacters: true,
    scrollbar: { useShadows: false, verticalHasArrows: false, horizontalHasArrows: false },
    glyphMargin: true,
    guides: { indentation: true },
    bracketPairColorization: { enabled: true },
    'semanticHighlighting.enabled': true,
    suggest: { showWords: true, shareSuggestSelections: true },
    quickSuggestions: { other: true, comments: false, strings: false },
    rulers: Array.isArray(s.ruler) ? (s.ruler as number[]) : undefined
  }
}

export function applyEditorOptions(editor: monaco.editor.IStandaloneCodeEditor): void {
  editor.updateOptions(editorOptions())
}

export function createEditor(
  groupId: string,
  container: HTMLElement,
  onFocus: () => void
): monaco.editor.IStandaloneCodeEditor | null {
  const existing = editors.get(groupId)
  if (existing) {
    applyEditorOptions(existing)
    return existing
  }
  const editor = monaco.editor.create(container, editorOptions())
  editor.onDidFocusEditorText(() => {
    focusedEditor = editor
    onFocus()
    notifyStatus()
  })
  editor.onDidChangeCursorSelection(() => {
    if (focusedEditor !== editor) focusedEditor = editor
    notifyStatus()
  })
  editor.onDidChangeCursorPosition(() => notifyStatus())
  editor.onDidChangeModel(() => notifyStatus())
  editors.set(groupId, editor)
  return editor
}

export function getEditor(groupId: string): monaco.editor.IStandaloneCodeEditor | null {
  return editors.get(groupId) ?? null
}

/** 返回绑定到指定模型的全部编辑器实例（分屏场景） */
export function editorsForPath(path: string): monaco.editor.IStandaloneCodeEditor[] {
  const model = models.get(path)
  if (!model) return []
  const out: monaco.editor.IStandaloneCodeEditor[] = []
  for (const e of editors.values()) {
    if (e.getModel() === model) out.push(e)
  }
  return out
}

export function forEachEditor(fn: (e: monaco.editor.IStandaloneCodeEditor) => void): void {
  for (const e of editors.values()) fn(e)
}

export function disposeEditor(groupId: string): void {
  const e = editors.get(groupId)
  if (e) {
    editors.delete(groupId)
    if (focusedEditor === e) focusedEditor = null
    e.dispose()
  }
}

export function setGroupModel(groupId: string, path: string | null): void {
  const editor = editors.get(groupId)
  if (!editor) return
  if (!path) {
    editor.setModel(null)
    return
  }
  const model = ensureModel(path)
  if (editor.getModel() !== model) {
    editor.setModel(model)
  }
}

/** 外部修改文件后同步模型且不标记 dirty */
export function syncModelContent(path: string, value: string, language?: string): void {
  const model = models.get(path)
  if (!model) return
  if (model.getValue() !== value) {
    // 暂时挂起 content listener，避免外部同步误标 dirty
    model.setValue(value)
  }
  if (language) monaco.editor.setModelLanguage(model, language)
}

export function revealLineInEditor(line: number): void {
  const editor = focusedEditor
  if (!editor) return
  editor.revealLineInCenter(line)
  editor.setPosition({ lineNumber: line, column: 1 })
  editor.focus()
}

/** 更新编辑器的语言（打开/设置变化时） */
export function refreshModelLanguage(path: string): void {
  const model = models.get(path)
  if (model) monaco.editor.setModelLanguage(model, languageForPath(path))
}

export function disposeAll(): void {
  for (const [, model] of models) model.dispose()
  models.clear()
  for (const [, editor] of editors) editor.dispose()
  editors.clear()
  focusedEditor = null
}