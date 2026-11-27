import { useEffect, useState } from 'react'
import { store, useAppState } from '../store'
import { mergeSettings } from '@shared/settings'
import type { SettingsDict } from '@shared/types'

const api = window.sampleText

interface FormState {
  provider: string
  apiKey: string
  baseURL: string
  chatModel: string
  completionModel: string
  temperature: number
  maxTokens: number
  enabled: boolean
  fontSize: number
  wordWrap: boolean
  autoSave: string
  minimap: boolean
}

function currentForm(): FormState {
  const s = store.getState().settings
  const ai = (s.ai && typeof s.ai === 'object' ? s.ai : {}) as Record<string, unknown>
  return {
    provider: typeof ai.provider === 'string' ? ai.provider : 'openai-compatible',
    apiKey: typeof ai.apiKey === 'string' ? ai.apiKey : '',
    baseURL: typeof ai.baseURL === 'string' ? ai.baseURL : 'https://api.deepseek.com/v1',
    chatModel: typeof ai.chatModel === 'string' ? ai.chatModel : 'deepseek-chat',
    completionModel: typeof ai.completionModel === 'string' ? ai.completionModel : '',
    temperature: typeof ai.temperature === 'number' ? ai.temperature : 0.7,
    maxTokens: typeof ai.maxTokens === 'number' ? ai.maxTokens : 2048,
    enabled: (ai.enabled as boolean) !== false,
    fontSize: typeof s.font_size === 'number' ? s.font_size : 13,
    wordWrap: s.word_wrap === true,
    autoSave: typeof s.auto_save === 'string' ? s.auto_save : 'off',
    minimap: (s.minimap_enabled as boolean) !== false
  }
}

export function SettingsPanel() {
  const state = useAppState()
  const open = state.ui.settingsOpen
  const [form, setForm] = useState<FormState>(currentForm())

  useEffect(() => {
    if (open) setForm(currentForm())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const set = <K extends keyof FormState>(k: K, v: FormState[K]): void => setForm((f) => ({ ...f, [k]: v }))

  async function save(): Promise<void> {
    const patch: SettingsDict = {
      ai: {
        provider: form.provider,
        apiKey: form.apiKey,
        baseURL: form.baseURL,
        chatModel: form.chatModel,
        completionModel: form.completionModel || '',
        temperature: form.temperature,
        maxTokens: form.maxTokens,
        enabled: form.enabled
      },
      font_size: form.fontSize,
      word_wrap: form.wordWrap,
      auto_save: form.autoSave,
      minimap_enabled: form.minimap
    }
    try {
      const current = await api.settingsGet()
      const merged = mergeSettings(current, patch)
      await api.settingsSet(merged)
      store.setUserSettings(merged)
      store.setSettingsOpen(false)
      store.notify('设置已保存')
    } catch (e) {
      store.notify('保存失败：' + String((e as Error)?.message ?? e), 5000)
    }
  }

  const row = { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }
  const lbl = { width: 110, flex: 'none', fontSize: 12.5, color: 'var(--fg-dim)' }
  const inp: React.CSSProperties = {
    flex: 1, background: 'var(--bg-input)', color: 'var(--fg)', border: '1px solid var(--border)',
    borderRadius: 5, padding: '6px 9px', fontSize: 12.5, outline: 'none', fontFamily: 'inherit'
  }
  const sect = { fontSize: 12, fontWeight: 700, letterSpacing: 1, color: 'var(--accent)', margin: '2px 0 4px', textTransform: 'uppercase' as const }

  return (
    <div className="ai-mask" onMouseDown={(e) => { if (e.target === e.currentTarget) store.setSettingsOpen(false) }}>
      <div className="settings-panel">
        <div className="settings-head">
          <span>偏好设置</span>
          <button className="ai-close no-drag" onClick={() => store.setSettingsOpen(false)}>×</button>
        </div>

        <div className="settings-body">
          <div style={sect}>AI 设置</div>
          <div className="settings-group">
            <div style={row}>
              <label style={lbl}>提供商</label>
              <select style={inp} value={form.provider} onChange={(e) => set('provider', e.target.value)}>
                <option value="openai-compatible">OpenAI 兼容（DeepSeek/千问/Kimi…）</option>
                <option value="ollama">本地 Ollama</option>
              </select>
            </div>
            <div style={row}>
              <label style={lbl}>API Key</label>
              <input style={inp} type="password" placeholder="sk-…" value={form.apiKey} onChange={(e) => set('apiKey', e.target.value)} />
            </div>
            <div style={row}>
              <label style={lbl}>Base URL</label>
              <input style={inp} placeholder="https://api.deepseek.com/v1" value={form.baseURL} onChange={(e) => set('baseURL', e.target.value)} />
            </div>
            <div style={row}>
              <label style={lbl}>对话模型</label>
              <input style={inp} placeholder="deepseek-chat" value={form.chatModel} onChange={(e) => set('chatModel', e.target.value)} />
            </div>
            <div style={row}>
              <label style={lbl}>补全模型</label>
              <input style={inp} placeholder="留空 = 用对话模型" value={form.completionModel} onChange={(e) => set('completionModel', e.target.value)} />
            </div>
            <div style={row}>
              <label style={lbl}>温度</label>
              <input style={inp} type="number" min={0} max={2} step={0.1} value={form.temperature} onChange={(e) => set('temperature', parseFloat(e.target.value) || 0)} />
            </div>
            <div style={row}>
              <label style={lbl}>最大 token</label>
              <input style={inp} type="number" min={128} step={128} value={form.maxTokens} onChange={(e) => set('maxTokens', parseInt(e.target.value, 10) || 0)} />
            </div>
            <div style={row}>
              <label style={lbl}>启用 AI</label>
              <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} />
            </div>
          </div>

          <div style={sect}>编辑器</div>
          <div className="settings-group">
            <div style={row}>
              <label style={lbl}>字体大小</label>
              <input style={inp} type="number" min={8} max={48} value={form.fontSize} onChange={(e) => set('fontSize', parseInt(e.target.value, 10) || 13)} />
            </div>
            <div style={row}>
              <label style={lbl}>自动换行</label>
              <input type="checkbox" checked={form.wordWrap} onChange={(e) => set('wordWrap', e.target.checked)} />
            </div>
            <div style={row}>
              <label style={lbl}>自动保存</label>
              <select style={inp} value={form.autoSave} onChange={(e) => set('autoSave', e.target.value)}>
                <option value="off">关闭</option>
                <option value="onFocusChange">失焦时保存</option>
                <option value="afterDelay">延迟保存</option>
              </select>
            </div>
            <div style={row}>
              <label style={lbl}>Minimap</label>
              <input type="checkbox" checked={form.minimap} onChange={(e) => set('minimap', e.target.checked)} />
            </div>
          </div>
        </div>

        <div className="settings-foot">
          <button className="ai-copy" onClick={() => store.setSettingsOpen(false)}>取消</button>
          <button className="ai-apply" onClick={() => void save()}>保存</button>
        </div>
      </div>
    </div>
  )
}