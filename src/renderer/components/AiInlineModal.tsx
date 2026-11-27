import { useSyncExternalStore, useState } from 'react'
import {
  AI_ACTIONS,
  applyAiResult,
  closeAiInline,
  getAiInlineState,
  runAiAction,
  runAiCustomPrompt,
  setInlineCustomPrompt,
  subscribeInline
} from '../features/ai'

let tick = 0
function useTick(): number {
  return useSyncExternalStore(
    (l) =>
      subscribeInline(() => {
        tick += 1
        l()
      }),
    () => tick
  )
}

export function AiInlineModal() {
  useTick()
  const s = getAiInlineState()
  const [custom, setCustom] = useState('')
  if (!s.open) return null

  function runCustom(): void {
    setInlineCustomPrompt(custom)
    runAiCustomPrompt()
  }

  return (
    <div className="ai-mask" onMouseDown={(e) => {
      if (e.target === e.currentTarget && !s.busy) closeAiInline()
    }}>
      <div className="ai-modal">
        <div className="ai-modal-head">
          <span className="ai-modal-title">🤖 {s.title}</span>
          <button className="ai-close no-drag" onClick={closeAiInline}>×</button>
        </div>

        <div className="ai-actions">
          {AI_ACTIONS.map((a) => (
            <button key={a.key} className="ai-action" disabled={s.busy} onClick={() => runAiAction(a.key)}>
              {a.title}
            </button>
          ))}
        </div>

        <div className="ai-custom">
          <textarea
            className="ai-input"
            placeholder="或输入自定义指令（如：改成更有趣的语气、转成英文诗…）"
            value={custom}
            disabled={s.busy}
            onChange={(e) => setCustom(e.target.value)}
          />
          <button className="ai-run" disabled={s.busy || !custom.trim() || !s.selection.trim()} onClick={runCustom}>
            执行
          </button>
        </div>

        {s.busy && !s.result ? (
          <div className="ai-loading">
            <span className="ai-spinner" />
            <span>{s.thinking ? '思考中' : '正在生成'}</span>
            <span className="ai-dots"><i>·</i><i>·</i><i>·</i></span>
          </div>
        ) : null}
        {s.thinking && s.reasoning ? <div className="ai-reasoning">{s.reasoning}</div> : null}
        {s.error ? <div className="ai-error">⚠️ {s.error}</div> : null}
        {s.result || s.busy ? (
          <textarea className="ai-result" readOnly value={s.result} placeholder="结果将显示在这里…" />
        ) : null}

        <div className="ai-foot">
          <span className="ai-muted">选中 {s.selection.length} 字</span>
          <div className="ai-foot-btns">
            <button className="ai-apply" disabled={s.busy || !s.result.trim()} onClick={applyAiResult}>替换选区</button>
            <button className="ai-copy" disabled={!s.result.trim()} onClick={() => { void navigator.clipboard.writeText(s.result) }}>复制</button>
          </div>
        </div>
      </div>
    </div>
  )
}