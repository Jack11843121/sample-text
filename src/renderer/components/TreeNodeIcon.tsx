// VS Code 风格文件/文件夹图标（内置 SVG，无外部图标库）
const EXT_COLORS: Record<string, string> = {
  js: '#e8d44d', jsx: '#e8d44d', mjs: '#e8d44d', cjs: '#e8d44d',
  ts: '#519aba', tsx: '#519aba', mts: '#519aba', cts: '#519aba',
  json: '#e8d44d',
  py: '#519aba',
  html: '#e44d26', htm: '#e44d26',
  css: '#519aba', scss: '#d585e6', less: '#519aba', sass: '#d585e6',
  md: '#519aba', markdown: '#519aba',
  go: '#00add8',
  rs: '#d1948b',
  java: '#d97757',
  c: '#5998c0', h: '#5998c0', cpp: '#5998c0', cc: '#5998c0', hpp: '#5998c0',
  sh: '#98c379', bash: '#98c379',
  yml: '#d97757', yaml: '#d97757',
  sql: '#e44d26',
  svg: '#e44d26',
  vue: '#42b883',
  rb: '#cc342d',
  php: '#777bb3',
  swift: '#f05138',
  kt: '#7f52ff',
  dart: '#00b4ab',
  lua: '#000080',
  toml: '#6d8086',
  ini: '#6d8086',
  csv: '#e8d44d',
  xml: '#e44d26',
  txt: '#9aa0a6',
  log: '#9aa0a6'
}

function colorFor(path: string): string {
  const base = path.split(/[/\\]/).pop()?.toLowerCase() ?? ''
  if (base === 'package.json' || base === 'package-lock.json') return '#cb3837'
  if (base === 'tsconfig.json') return '#3178c6'
  if (base === 'dockerfile') return '#2496ed'
  if (base === 'docker-compose.yml' || base === 'docker-compose.yaml') return '#2496ed'
  if (base === '.gitignore' || base.startsWith('.env') || base === '.npmrc') return '#e8d44d'
  if (base === 'readme.md' || base === 'readme.markdown') return '#519aba'
  const ext = base.split('.').pop() ?? ''
  return EXT_COLORS[ext] ?? '#9aa0a6'
}

function FolderIcon({ open }: { open?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
      <path
        d="M1.5 2.5h4.8l1.4 1.4h5.8a1 1 0 0 1 1 1v6.8a1 1 0 0 1-1 1h-2.5v-7a1.6 1.6 0 0 0-1.6-1.6H1.5z"
        fill={open ? '#8f9ec9' : '#8098c8'}
        opacity="0.95"
      />
    </svg>
  )
}

function FileIcon({ path }: { path: string }) {
  const c = colorFor(path)
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden>
      <path
        d="M3 1.5h6.5L13 5v8.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2.5a1 1 0 0 1 1-1z"
        fill={c}
        opacity="0.9"
      />
      <path d="M9.5 1.5L13 5v.5H9.5V1.5z" fill="rgba(0,0,0,0.22)" />
    </svg>
  )
}

export function TreeNodeIcon({ path, isDirectory, expanded }: { path: string; isDirectory: boolean; expanded: boolean }) {
  return (
    <span className="tree-icon">{isDirectory ? <FolderIcon open={expanded} /> : <FileIcon path={path} />}</span>
  )
}