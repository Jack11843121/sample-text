import { useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { store, useAppState } from '../store'
import { clearChat, getChatMessages, isChatBusy, sendChat, subscribeChat } from '../features/ai'

let tick = 0
function useChat(): number {
  return useSyncExternalStore(
    (l) =>
      subscribeChat(() => {
        tick += 1
        l()
      }),
    () => tick
  )
}

export function AiChatPanel() {
  const state = useAppState()
  useChat()
  const [input, setInput] = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)

  const messages = getChatMessages()
  const busy = isChatBusy()

  useMemo(() => {
    // 自动滚动到底部
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
    return undefined
  }, [messages])

  if (!state.ui.aiChatOpen) return null

  function send(): void {
    if (!input.trim() || busy) return
    sendChat(input)
    setInput('')
  }

  return (
    <div className="ai-chat">
      <div className="ai-chat-head">
        <span className="ai-chat-title">🤖 AI 助手</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="ai-chat-clear" onClick={() => clearChat()}>清空</button>
          <button className="ai-close" onClick={() => store.setAiChatOpen(false)}>×</button>
        </div>
      </div>
      <div className="ai-chat-body" ref={bodyRef}>
        {messages.length === 0 ? (
          <div className="ai-chat-empty">
            <p>向 AI 助手提问，例如：</p>
            <p className="ai-chat-hint">「解释当前项目的作用」</p>
            <p className="ai-chat-hint">「帮我把这段代码改成 Python」</p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={'ai-msg ' + m.role + (m.error ? ' error' : '')}>
              <div className="ai-msg-role">{m.role === 'user' ? '你' : 'AI'}</div>
              <div className="ai-msg-text">
            {m.busy && m.reasoning ? <div className="ai-reasoning">{m.reasoning}</div> : null}
            {m.content || (m.busy ? <span className="ai-thinking-hint">思考中<span className="ai-dots"><i>·</i><i>·</i><i>·</i></span></span> : '')}
          </div>
            </div>
          ))
        )}
      </div>
      <div className="ai-chat-inputrow">
        <textarea
          className="ai-chat-input"
          placeholder="输入问题，Enter 发送，Shift+Enter 换行"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <button className="ai-chat-send" disabled={busy || !input.trim()} onClick={send}>
          {busy ? '…' : '发送'}
        </button>
      </div>
    </div>
  )
}