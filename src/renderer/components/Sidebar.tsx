import { useEffect, useState } from 'react'
import { store, useAppState } from '../store'
import { openFile, openFolder, closePath } from '../io'
import { isTextFile } from '../editor/languages'
import { TreeNodeIcon } from './TreeNodeIcon'
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

function joinPath(dir: string, name: string): string {
  return dir.replace(/[\\/]+$/, '') + '/' + name
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

async function createEntry(dir: string, isFolder: boolean): Promise<void> {
  const name = window.prompt(isFolder ? '新建文件夹，名称：' : '新建文件，名称：')
  if (!name || !name.trim()) return
  const p = joinPath(dir, name.trim())
  try {
    if (isFolder) {
      await api.makeDirectory(p)
    } else {
      await api.writeFile(p, '')
    }
    store.bumpTreeVersion()
    store.notify((isFolder ? '已创建文件夹 ' : '已创建文件 ') + name.trim())
    if (!isFolder) void openFile(p)
  } catch (e) {
    store.notify('创建失败：' + String((e as Error)?.message ?? e), 5000)
  }
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
  const app = useAppState()
  const treeVersion = app.ui.treeVersion
  const activePath = app.activePath

  useEffect(() => {
    if (expanded && node.isDirectory) {
      void api.readDir(node.path).then(setChildren).catch(() => setChildren([]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, node.path, treeVersion])

  const isDir = node.isDirectory
  const active = !isDir && activePath === node.path

  const onContextMenu = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    const entries: { id: string; label: string; danger?: boolean }[] = [
      { id: 'copy_path', label: '复制路径' },
      { id: 'reveal', label: '在文件管理器中显示' }
    ]
    if (isDir) {
      entries.push({ id: 'new_file', label: '新建文件…' })
      entries.push({ id: 'new_folder', label: '新建文件夹…' })
    }
    entries.push({ id: 'delete', label: '删除', danger: true })

    const action = await api.showContextMenu(entries)
    if (action === 'reveal') {
      void api.showItemInFolder(node.path)
    } else if (action === 'copy_path') {
      void api.copyPath(node.path)
      store.notify('已复制路径')
    } else if (action === 'new_file') {
      void createEntry(node.path, false)
    } else if (action === 'new_folder') {
      void createEntry(node.path, true)
    } else if (action === 'delete') {
      const kind = isDir ? '文件夹' : '文件'
      if (!window.confirm(`确定删除${kind}「${node.name}」` + (isDir ? '及其内容' : '') + '吗？此操作不可恢复。')) return
      try {
        await api.deletePath(node.path)
        if (store.getState().documents.has(node.path)) closePath(node.path)
        store.bumpTreeVersion()
        store.notify(`已删除 ${node.name}`)
      } catch (err) {
        store.notify('删除失败：' + String((err as Error)?.message ?? err), 5000)
      }
    }
  }

  return (
    <div className="tree-branch">
      <div
        className={'tree-row' + (active ? ' active' : '')}
        title={node.path}
        onClick={() => {
          if (isDir) {
            setExpanded((v) => !v)
          } else {
            void openFile(node.path)
          }
        }}
        onContextMenu={(e) => void onContextMenu(e)}
      >
        <span className="tree-chevron">{isDir ? (expanded ? '▾' : '▸') : ''}</span>
        <TreeNodeIcon path={node.path} isDirectory={isDir} expanded={expanded} />
        <span className="tree-name">{node.name}</span>
        <span className={'git-badge g-' + gitStatus[node.path]}>{gitStatus[node.path] ?? ''}</span>
      </div>
      {expanded && isDir && children && (
        <div className="tree-children">
          {children
            .filter((c) => c.isDirectory || isTextFile(c.path))
            .map((c) => (
              <TreeRow key={c.path} node={c} depth={depth + 1} gitStatus={gitStatus} />
            ))}
        </div>
      )}
    </div>
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
            <button onClick={pickFolder}>打开文件夹…</button>
            <button onClick={pickFile}>打开文件…</button>
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