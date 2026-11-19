import type { AiMessage } from '@shared/types'
import { readUserSettings } from './settings-store'
import { mergeSettings } from '@shared/settings'

export interface AiConfig {
  provider: 'openai-compatible' | 'ollama'
  baseURL: string
  apiKey: string
  chatModel: string
  completionModel: string
  temperature: number
  maxTokens: number
  enabled: boolean
}

const DEFAULT_AI: AiConfig = {
  provider: 'openai-compatible',
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: '',
  chatModel: 'deepseek-chat',
  completionModel: 'deepseek-chat',
  temperature: 0.7,
  maxTokens: 2048,
  enabled: true
}

export async function getAiConfig(): Promise<AiConfig> {
  const user = await readUserSettings()
  const merged = mergeSettings(
    DEFAULT_AI as unknown as Record<string, unknown>,
    (typeof user.ai === 'object' && user.ai !== null ? user.ai : {}) as Record<string, unknown>
  )
  return merged as unknown as AiConfig
}

export function isAiConfigured(cfg: AiConfig): boolean {
  return cfg.enabled !== false && !!cfg.apiKey && !!cfg.baseURL
}

const pending = new Map<string, AbortController>()

export function cancelChat(reqId: string): void {
  pending.get(reqId)?.abort()
  pending.delete(reqId)
}

async function fetchWithTimeout(input: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(input, { ...init, signal: ctrl.signal })
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw new Error('请求超时（' + Math.round(ms / 1000) + 's），请检查 ai.baseURL 与网络')
    throw e
  } finally {
    clearTimeout(t)
  }
}

/** OpenAI 兼容 /v1/chat/completions（DeepSeek 等） SSE 流式 */
async function streamOpenAI(
  cfg: AiConfig,
  messages: AiMessage[],
  onDelta: (d: string) => void,
  signal: AbortSignal
): Promise<string> {
  const base = cfg.baseURL.replace(/\/+$/, '')
  const res = await fetch(base + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.apiKey },
    body: JSON.stringify({
      model: cfg.chatModel,
      messages,
      temperature: cfg.temperature,
      max_tokens: cfg.maxTokens,
      stream: true
    }),
    signal
  })
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => '')
    throw new Error('HTTP ' + res.status + (t ? ': ' + t.slice(0, 200) : ''))
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  let buf = ''
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''
    for (const raw of lines) {
      const line = raw.trim()
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (!data || data === '[DONE]') continue
      try {
        const j = JSON.parse(data) as {
          choices?: { delta?: { content?: string }; message?: { content?: string } }[]
        }
        const delta = j.choices?.[0]?.delta?.content ?? j.choices?.[0]?.message?.content ?? ''
        if (delta) {
          full += delta
          onDelta(delta)
        }
      } catch {
        /* 忽略不完整行 */
      }
    }
  }
  return full
}

/** Ollama /api/chat（ndjson 流式） */
async function streamOllama(
  cfg: AiConfig,
  messages: AiMessage[],
  onDelta: (d: string) => void,
  signal: AbortSignal
): Promise<string> {
  const base = cfg.baseURL.replace(/\/+$/, '')
  const res = await fetch(base + '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: cfg.chatModel,
      messages,
      stream: true,
      options: { temperature: cfg.temperature, num_predict: cfg.maxTokens }
    }),
    signal
  })
  if (!res.ok || !res.body) throw new Error('Ollama HTTP ' + res.status)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ''
  let buf = ''
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''
    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const j = JSON.parse(line) as { message?: { content?: string } }
        const delta = j.message?.content ?? ''
        if (delta) {
          full += delta
          onDelta(delta)
        }
      } catch {
        /* ignore */
      }
    }
  }
  return full
}

export function startChat(
  reqId: string,
  messages: AiMessage[],
  onDelta: (d: string) => void,
  onDone: (text: string) => void,
  onError: (message: string) => void
): void {
  const ac = new AbortController()
  pending.set(reqId, ac)
  // 总超时 120s：第三方接口连不上/无响应时，给用户明确报错而非一直「正在生成」
  const guard = setTimeout(() => ac.abort(), 120_000)
  void (async () => {
    try {
      const cfg = await getAiConfig()
      if (!isAiConfigured(cfg)) throw new Error('未配置 AI：请在设置 settings.json 中填写 ai.apiKey（DeepSeek API Key）')
      const stream = cfg.provider === 'ollama' ? streamOllama : streamOpenAI
      const full = await stream(cfg, messages, onDelta, ac.signal)
      onDone(full)
    } catch (e) {
      const err = e as Error
      onError(err?.name === 'AbortError' ? 'AI 请求超时或无响应，请检查 ai.baseURL 与网络连接' : String(err?.message ?? e))
    } finally {
      clearTimeout(guard)
      pending.delete(reqId)
    }
  })()
}

/** 非流式单次完成（内联补全/单次生成） */
export async function complete(prompt: string, args?: { model?: string; temperature?: number; maxTokens?: number }): Promise<string> {
  const cfg = await getAiConfig()
  if (!isAiConfigured(cfg)) throw new Error('未配置 AI：请在设置 settings.json 中填写 ai.apiKey')
  const base = cfg.baseURL.replace(/\/+$/, '')
  const model = args?.model || cfg.completionModel
  if (cfg.provider === 'ollama') {
    const res = await fetchWithTimeout(
      base + '/api/generate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: { temperature: args?.temperature ?? cfg.temperature, num_predict: args?.maxTokens ?? cfg.maxTokens }
        })
      },
      60_000
    )
    if (!res.ok) throw new Error('Ollama HTTP ' + res.status)
    const j = (await res.json()) as { response?: string }
    return j.response ?? ''
  }
  const res = await fetchWithTimeout(
    base + '/chat/completions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + cfg.apiKey },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: args?.temperature ?? cfg.temperature,
        max_tokens: args?.maxTokens ?? cfg.maxTokens,
        stream: false
      })
    },
    60_000
  )
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error('HTTP ' + res.status + (t ? ': ' + t.slice(0, 200) : ''))
  }
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return j.choices?.[0]?.message?.content ?? ''
}