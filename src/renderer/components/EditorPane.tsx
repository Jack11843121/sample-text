import { useEffect, useRef } from 'react'
import { store, useAppState } from '../store'
import {
  applyEditorOptions,
  createEditor,
  disposeEditor,
  getEditor,
  setGroupModel
} from '../editor/session'
import { attachVimIfEnabled } from '../features/vim'

export function EditorPane({ groupId }: { groupId: string }) {
  const state = useAppState()
  const ref = useRef<HTMLDivElement>(null)
  const group = state.groups.find((g) => g.id === groupId)
  const activePath = group?.activePath ?? null
  const isActive = state.activeGroupId === groupId

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const editor = createEditor(groupId, el, () => store.setActiveGroup(groupId))
    if (editor) attachVimIfEnabled(editor)
    return () => {
      disposeEditor(groupId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  useEffect(() => {
    const editor = getEditor(groupId)
    if (!editor) return
    applyEditorOptions(editor)
    setGroupModel(groupId, activePath)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePath, state.settings, state.ui.showMinimap, state.themeBase, groupId])

  useEffect(() => {
    if (isActive) {
      getEditor(groupId)?.focus()
    }
  }, [isActive, groupId])

  return <div className="editor-pane" ref={ref} />
}