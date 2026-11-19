import * as monaco from 'monaco-editor'
import { registerCommand, registerCommandMeta } from '../commands/registry'
import { getFocusedEditor, getFocusedModel, getFocusedPath } from '../editor/session'
import { store } from '../store'
import { IPC, type AiMessage } from '@shared/types'

const api = window.sampleText

// ---------------------------------------------------------------------------
// 聊天状态（模块级，AiChatPanel 订阅）
// ---------------------------------------------------------------------------
export interface ChatMsg {
  id: number
  role: 'user' | 'assistant'
  content: string
  busy?: boolean
  error?: boolean
}
let chatMessages: ChatMsg[] = []
let chatBusy = false
let msgSeq = 0
const chatListeners = new Set<() => void>()
function notifyChat(): void {
  for (const l of chatListeners) l()
}
export function subscribeChat(l: () => void): () => void {
  chatListeners.add(l)
  return () => {
    chatListeners.delete(l)
  }
}
export function getChatMessages(): ChatMsg[] {
  return chatMessages
}
export function isChatBusy(): boolean {
  return chatBusy
}
export function clearChat(): void {
  chatMessages = []
  chatBusy = false
  notifyChat()
}

// ---------------------------------------------------------------------------
// 内联选区状态（AiInlineModal 订阅）
// ---------------------------------------------------------------------------
export interface AiInlineState {
  open: boolean
  title: string
  selection: string
  lang: string
  customPrompt: string
  result: string
  busy: boolean
  thinking: boolean
  error: string
}
const aiInline: AiInlineState = {
  open: false,
  title: '',
  selection: '',
  lang: '',
  customPrompt: '',
  result: '',
  busy: false,
  thinking: false,
  error: ''
}
const inlineListeners = new Set<() => void>()
function notifyInline(): void {
  for (const l of inlineListeners) l()
}
export function subscribeInline(l: () => void): () => void {
  inlineListeners.add(l)
  return () => {
    inlineListeners.delete(l)
  }
}
export function getAiInlineState(): AiInlineState {
  return aiInline
}

export function setInlineCustomPrompt(text: string): void {
  aiInline.customPrompt = text
}

// ---------------------------------------------------------------------------
// 配置
// ---------------------------------------------------------------------------
function aiConf(): Record<string, unknown> {
  const ai = store.getState().settings.ai as Record<string, unknown> | undefined
  return (ai && typeof ai === 'object' ? ai : {}) as Record<string, unknown>
}
export function aiConfigured(): boolean {
  const c = aiConf()
  return c.enabled !== false && !!c.apiKey
}

// ---------------------------------------------------------------------------
// 流式聊天
// ---------------------------------------------------------------------------
let reqSeq = 0

function streamChat(
  messages: AiMessage[],
  onDelta: (full: string) => void,
  onDone: (full: string) => void,
  onError: (msg: string) => void,
  onThinking?: (delta: string) => void
): () => void {
  const reqId = 'ai-' + ++reqSeq + '-' + Date.now()
  let acc = ''
  let finished = false
  const offStream = api.on(IPC.AI_STREAM, (p) => {
    const e = p as { reqId: string; delta: string; thinking?: boolean }
    if (e.reqId !== reqId) return
    if (e.thinking) {
      onThinking?.(e.delta)
      return
    }
    acc += e.delta
    onDelta(acc)
  })
  const offDone = api.on(IPC.AI_DONE, (p) => {
    const e = p as { reqId: string; text: string }
    if (e.reqId !== reqId) return
    finished = true
    offStream()
    offDone()
    offErr()
    onDone(e.text ?? acc)
  })
  const offErr = api.on(IPC.AI_ERROR, (p) => {
    const e = p as { reqId: string; message: string }
    if (e.reqId !== reqId) return
    finished = true
    offStream()
    offDone()
    offErr()
    onError(e.message)
  })
  void api.aiChat(reqId, messages).catch((err) => {
    if (!finished) {
      offStream()
      offDone()
      offErr()
      onError(String((err as Error)?.message ?? err))
    }
  })
  return () => {
    if (!finished) void api.aiCancel(reqId)
  }
}

// ---------------------------------------------------------------------------
// 选中 → AI
// ---------------------------------------------------------------------------
const PROMPTS: Record<string, { title: string; sys: string; user: (sel: string, lang: string) => string }> = {
  rewrite: {
    title: '改写',
    sys: '你是专业的文本编辑助手，只输出改写后的结果，不要解释。',
    user: (s) => '请改写下面的文本，保持原意，让表达更流畅、更专业：\n\n' + s
  },
  translate: {
    title: '翻译',
    sys: '你是专业的翻译助手，只输出译文，不要解释。',
    user: (s) => '请将下面的文本翻译为英文；若原文已是英文则翻译为中文：\n\n' + s
  },
  explain: {
    title: '解释',
    sys: '你是资深工程师，解释清晰简洁。',
    user: (s) => '请解释下面的文本（代码请说明作用与关键逻辑）：\n\n' + s
  },
  summarize: {
    title: '总结',
    sys: '你是专业的总结助手，只输出要点。',
    user: (s) => '请用简洁的要点总结下面的文本：\n\n' + s
  },
  fix: {
    title: '修复',
    sys: '你是资深工程师，修复问题并简要说明改动。',
    user: (s) => '请修复下面文本/代码中的问题，直接给出修复后的完整内容，并简要说明改动点：\n\n' + s
  },
  test: {
    title: '生成测试',
    sys: '你是资深工程师，编写实用、可运行的单元测试。',
    user: (s) => '请为下面的代码编写单元测试：\n\n' + s
  }
}

export const AI_ACTIONS = Object.keys(PROMPTS).map((k) => ({ key: k, title: PROMPTS[k].title }))

function currentSelection(): { text: string; lang: string } {
  const editor = getFocusedEditor()
  const model = getFocusedModel()
  if (!editor || !model) return { text: '', lang: '' }
  const sel = editor.getSelection()
  const text = sel && !sel.isEmpty() ? model.getValueInRange(sel) : model.getValue()
  return { text, lang: model.getLanguageId() ?? '' }
}

export function openAiInline(actionKey?: string): void {
  const { text, lang } = currentSelection()
  if (!getFocusedEditor()) {
    store.notify('请先打开一个文件')
    return
  }
  if (!aiConfigured()) {
    store.notify('未配置 AI：请在设置 settings.json 填写 ai.apiKey', 6000)
    return
  }
  aiInline.open = true
  aiInline.title = actionKey && PROMPTS[actionKey] ? PROMPTS[actionKey].title : 'AI 文本助手'
  aiInline.selection = text
  aiInline.lang = lang
  aiInline.customPrompt = ''
  aiInline.result = ''
  aiInline.busy = false
  aiInline.thinking = false
  aiInline.error = ''
  notifyInline()
  if (actionKey) runAiAction(actionKey)
}

export function closeAiInline(): void {
  aiInline.open = false
  aiInline.result = ''
  aiInline.busy = false
  aiInline.thinking = false
  aiInline.error = ''
  notifyInline()
}

function replaceSelection(result: string): void {
  const editor = getFocusedEditor()
  const model = getFocusedModel()
  if (!editor || !model) return
  const sel = editor.getSelection()
  const range = sel && !sel.isEmpty() ? sel : model.getFullModelRange()
  editor.executeEdits('ai-inline', [{ range, text: result }])
  editor.focus()
}

export function runAiAction(actionKey: string): void {
  const p = PROMPTS[actionKey]
  if (!p) return
  const { text, lang } = aiInline.open ? { text: aiInline.selection, lang: aiInline.lang } : currentSelection()
  if (!text.trim()) {
    aiInline.error = '没有可处理的内容（请先选中文本）'
    notifyInline()
    return
  }
  aiInline.result = ''
  aiInline.error = ''
  aiInline.busy = true
  aiInline.thinking = false
  notifyInline()
  streamChat(
    [
      { role: 'system', content: p.sys },
      { role: 'user', content: p.user(text, lang) }
    ],
    (full) => {
      aiInline.thinking = false
      aiInline.result = full
      notifyInline()
    },
    (full) => {
      aiInline.thinking = false
      aiInline.result = full
      aiInline.busy = false
      notifyInline()
    },
    (msg) => {
      aiInline.thinking = false
      aiInline.error = msg
      aiInline.busy = false
      notifyInline()
    },
    () => {
      aiInline.thinking = true
      notifyInline()
    }
  )
}

export function runAiCustomPrompt(): void {
  const { text, lang } = aiInline.open ? { text: aiInline.selection, lang: aiInline.lang } : currentSelection()
  const prompt = aiInline.customPrompt.trim()
  if (!text.trim() || !prompt) {
    aiInline.error = '请填写指令，并确保有选中的内容'
    notifyInline()
    return
  }
  aiInline.result = ''
  aiInline.error = ''
  aiInline.busy = true
  aiInline.thinking = false
  notifyInline()
  streamChat(
    [
      { role: 'system', content: '你是一个专业的文本/代码助手，按用户指令处理给定的文本，直接输出结果，不要多余解释。' },
      { role: 'user', content: `指令：${prompt}\n\n文本：\n\`\`\`${lang}\n${text}\n\`\`\`` }
    ],
    (full) => {
      aiInline.thinking = false
      aiInline.result = full
      notifyInline()
    },
    (full) => {
      aiInline.thinking = false
      aiInline.result = full
      aiInline.busy = false
      notifyInline()
    },
    (msg) => {
      aiInline.thinking = false
      aiInline.error = msg
      aiInline.busy = false
      notifyInline()
    },
    () => {
      aiInline.thinking = true
      notifyInline()
    }
  )
}

export function applyAiResult(): void {
  if (!aiInline.result.trim()) return
  replaceSelection(aiInline.result)
  closeAiInline()
}

// ---------------------------------------------------------------------------
// 聊天面板消息
// ---------------------------------------------------------------------------
export function sendChat(text: string): void {
  const t = text.trim()
  if (!t || chatBusy) return
  const userMsg: ChatMsg = { id: ++msgSeq, role: 'user', content: t }
  const asstMsg: ChatMsg = { id: ++msgSeq, role: 'assistant', content: '', busy: true }
  chatMessages = [...chatMessages, userMsg, asstMsg]
  chatBusy = true
  notifyChat()

  const path = getFocusedPath()
  const editor = getFocusedEditor()
  const model = getFocusedModel()
  let ctx = ''
  if (path) ctx += '\n当前文件：' + path
  if (model) ctx += '\n语言：' + (model.getLanguageId() || 'plaintext')
  if (editor && model) {
    const sel = editor.getSelection()
    if (sel && !sel.isEmpty()) {
      ctx += '\n当前选中内容：\n```\n' + model.getValueInRange(sel).slice(0, 3000) + '\n```'
    }
  }
  const sys = '你是运行在本地编辑器里的 AI 文本/代码助手，回答简洁、准确、有条理。' + ctx
  streamChat(
    [
      { role: 'system', content: sys },
      ...chatMessages
        .filter((m) => !m.busy && m.content && !m.error)
        .map((m) => ({ role: m.role, content: m.content }))
    ],
    (full) => {
      chatMessages = chatMessages.map((m) => (m.id === asstMsg.id ? { ...m, content: full } : m))
      notifyChat()
    },
    (full) => {
      chatMessages = chatMessages.map((m) => (m.id === asstMsg.id ? { ...m, content: full, busy: false } : m))
      chatBusy = false
      notifyChat()
    },
    (msg) => {
      chatMessages = chatMessages.map((m) => (m.id === asstMsg.id ? { ...m, content: '⚠️ ' + msg, busy: false, error: true } : m))
      chatBusy = false
      notifyChat()
    }
  )
}

// ---------------------------------------------------------------------------
// 内联补全（ghost text）
// ---------------------------------------------------------------------------
let completionProviderRegistered = false
export function registerAiCompletion(): void {
  if (completionProviderRegistered) return
  completionProviderRegistered = true
  monaco.languages.registerInlineCompletionsProvider('*', {
    provideInlineCompletions: async (model, position, _context, token) => {
      if (!aiConfigured() || token.isCancellationRequested) return { items: [] }
      const begin = new monaco.Position(Math.max(1, position.lineNumber - 200), 1)
      const start = model.getOffsetAt(begin)
      const end = model.getOffsetAt(position)
      const prefix = model.getValue().slice(start, end).slice(-4000)
      if (prefix.trim().length < 3) return { items: [] }
      let text = ''
      try {
        const r = await api.aiComplete({
          prompt:
            '请续写下面的文本（只输出续写内容，不要重复已有内容，不要解释）：\n\n```\n' + prefix + '\n```\n续写：'
        })
        text = (r.text || '').trim()
      } catch {
        return { items: [] }
      }
      if (!text || token.isCancellationRequested) return { items: [] }
      const word = model.getWordUntilPosition(position)
      const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn)
      return { items: [{ insertText: text, range }] }
    },
    freeInlineCompletions: () => {
      /* 无需回收逻辑 */
    }
  })
}

// ---------------------------------------------------------------------------
// 命令注册（副作用）
// ---------------------------------------------------------------------------
registerCommand('show_ai_chat', () => store.toggleAiChat())
registerCommandMeta({ command: 'show_ai_chat', title: 'AI 助手（聊天）', category: 'AI' })
registerCommand('ai_inline', () => openAiInline())
registerCommandMeta({ command: 'ai_inline', title: 'AI 处理选中文本…', category: 'AI' })
for (const [key, p] of Object.entries(PROMPTS)) {
  registerCommand('ai_' + key, () => openAiInline(key))
  registerCommandMeta({ command: 'ai_' + key, title: 'AI：' + p.title + '所选', category: 'AI' })
}

registerAiCompletion()