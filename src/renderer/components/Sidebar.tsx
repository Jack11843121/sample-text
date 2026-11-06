import { useEffect, useState } from 'react'
import { store, useAppState } from '../store'
import { openFile, openFolder } from '../io'
import { isTextFile } from '../editor/languages'
import type { TreeNode } from '@shared/types'

const api = window.sampleText
const nameCache = new Map<string, string>()

function baseName(path: string): string {
  let c = nameCache.get(path)
  if (!c) {
    const i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
    c = i >= 0 ? path.slice(i + 1) : path
    nameCache.set(path, c)
  }
  return c
}

function pickFolder(): void {
  api
    .openFolderDialog()
    .then((r) => {
      if (r.paths[0]) void openFolder(r.paths[0])
    })
    .catch((e) => store.notify('打开文件夹失败：' + String(e?.message ?? e), 5000))
}

function pickFile(): void {
  api
    .openDialog()
    .then((r) => {
      if (r.paths[0]) void openFile(r.paths[0])
    })
    .catch((e) => store.notify('打开文件失败：' + String(e?.message ?? e), 5000))
}

function TreeRow({
  node,
  depth,
  gitStatus
}: {
  node: TreeNode
  depth: number
  gitStatus: Record<string, string>
}) {
  const [expanded, setExpanded] = useState(depth === 0)
  const [children, setChildren] = useState<TreeNode[] | null>(null)
  const treeVersion = useAppState().ui.treeVersion

  useEffect(() => {
    if (expanded && node.isDirectory) {
      void api.readDir(node.path).then(setChildren).catch(() => setChildren([]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, node.path, treeVersion])

  const isDir = node.isDirectory
  return (
    <>
      <div
        className="tree-row"
        style={{ paddingLeft: depth * 16 + 10 }}
        title={node.path}
        onClick={() => {
          if (isDir) {
            setExpanded((v) => !v)
          } else {
            void openFile(node.path)
          }
        }}
      >
        <span className={'tree-chevron' + (isDir ? '' : ' hidden')}>{expanded ? '▾' : '▸'}</span>
        <span className="tree-name">{node.name}</span>
        <span className={'git-badge g-' + gitStatus[node.path]}>{gitStatus[node.path] ?? ''}</span>
      </div>
      {expanded && isDir && children && (
        <div>
          {children
            .filter((c) => c.isDirectory || isTextFile(c.path))
            .map((c) => (
              <TreeRow key={c.path} node={c} depth={depth + 1} gitStatus={gitStatus} />
            ))}
        </div>
      )}
    </>
  )
}

export function Sidebar() {
  const state = useAppState()
  if (!state.ui.sidebarVisible) return null
  const folders = state.folderPaths
  const gitStatus = state.gitState?.status ?? {}

  return (
    <aside className="sidebar">
      <div className="sidebar-header titlebar-drag">
        <span className="sidebar-title">FOLDERS</span>
        <span className="sidebar-actions no-drag">
          <button title="Add Folder" onClick={pickFolder}>
            +
          </button>
        </span>
      </div>
      <div className="sidebar-body">
        {folders.length === 0 ? (
          <div className="sidebar-empty">
            <p>未打开任何文件夹</p>
            <button onClick={pickFolder}>
              Open Folder…
            </button>
            <button onClick={pickFile}>
              Open File…
            </button>
          </div>
        ) : (
          folders.map((f) => (
            <TreeRow
              key={f}
              node={{ name: baseName(f), path: f, kind: 'directory', isDirectory: true }}
              depth={0}
              gitStatus={gitStatus}
            />
          ))
        )}
      </div>
    </aside>
  )
}