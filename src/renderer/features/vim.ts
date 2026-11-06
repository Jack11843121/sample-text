import * as monaco from 'monaco-editor'
import { initVimMode, type VimAdapterInstance } from 'monaco-vim'
import { forEachEditor } from '../editor/session'
import { store } from '../store'

/**
 * Vim/Vintage 模态编辑（基于 monaco-vim）。
 * 通过命令面板 / 菜单『Vim Mode』切换；作用于所有已打开编辑器。
 */

const instances = new Map<monaco.editor.IStandaloneCodeEditor, VimAdapterInstance>()
let vimEnabled = false

function ensureStatusNode(editor: monaco.editor.IStandaloneCodeEditor): HTMLElement {
  let node = editor.getDomNode()?.querySelector<HTMLElement>('.vim-status') ?? null
  if (!node) {
    node = document.createElement('div')
    node.className = 'vim-status'
    const parent = editor.getDomNode()?.parentElement
    parent?.appendChild(node)
  }
  return node
}

export function attachVimIfEnabled(editor: monaco.editor.IStandaloneCodeEditor): void {
  if (!vimEnabled) return
  if (instances.has(editor)) return
  try {
    const status = ensureStatusNode(editor)
    const inst = initVimMode(editor, status)
    instances.set(editor, inst)
  } catch (err) {
    console.warn('[vim] 无法对当前编辑器启用', err)
  }
}

function detach(editor: monaco.editor.IStandaloneCodeEditor): void {
  const inst = instances.get(editor)
  if (inst) {
    try {
      inst.dispose()
    } catch {
      /* ignore */
    }
    instances.delete(editor)
  }
  const node = editor.getDomNode()?.querySelector<HTMLElement>('.vim-status')
  node?.remove()
}

export function toggleVim(): void {
  vimEnabled = !vimEnabled
  forEachEditor((e) => (vimEnabled ? attachVimIfEnabled(e) : detach(e)))
  store.notify(vimEnabled ? 'Vim 模式已开启' : 'Vim 模式已关闭')
}

export function isVimEnabled(): boolean {
  return vimEnabled
}