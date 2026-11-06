import * as monaco from 'monaco-editor'

const EXT_TO_LANG: Record<string, string> = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  json: 'json',
  jsonc: 'json',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  htm: 'html',
  xhtml: 'html',
  md: 'markdown',
  markdown: 'markdown',
  py: 'python',
  pyw: 'python',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hh: 'cpp',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  php: 'php',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  bat: 'bat',
  cmd: 'bat',
  ps1: 'powershell',
  yml: 'yaml',
  yaml: 'yaml',
  xml: 'xml',
  svg: 'xml',
  plist: 'xml',
  sql: 'sql',
  swift: 'swift',
  kt: 'kotlin',
  kts: 'kotlin',
  vue: 'html',
  graphql: 'graphql',
  gql: 'graphql',
  ini: 'ini',
  toml: 'ini',
  dockerfile: 'dockerfile',
  lua: 'lua',
  r: 'r',
  scala: 'scala',
  dart: 'dart',
  coffee: 'coffee',
  jl: 'julia',
  ex: 'elixir',
  exs: 'elixir',
  clj: 'clojure',
  cljs: 'clojure',
  hs: 'haskell',
  m: 'objective-c',
  mm: 'objective-c',
  f90: 'fortran',
  f95: 'fortran',
  pas: 'pascal',
  vb: 'vb',
  vbs: 'vb',
  tex: 'latex',
  txt: 'plaintext',
  log: 'plaintext'
}

const FILENAME_TO_LANG: Record<string, string> = {
  Dockerfile: 'dockerfile',
  Makefile: 'makefile',
  CMakeLists: 'cmake',
  '.gitignore': 'plaintext',
  '.gitconfig': 'ini'
}

export function languageForPath(path: string): string {
  const slash = path.lastIndexOf('/')
  const base = path.slice(slash + 1)
  if (base === '' || base.startsWith('Untitled-')) return 'plaintext'
  if (FILENAME_TO_LANG[base]) return FILENAME_TO_LANG[base]
  const dot = base.lastIndexOf('.')
  if (dot < 0) return 'plaintext'
  const ext = base.slice(dot + 1).toLowerCase()
  return EXT_TO_LANG[ext] ?? 'plaintext'
}

/** 由扩展名（可带点）得到语言 id，供 TextMate fileTypes 映射 */
export function languageForExtension(ext: string): string {
  const clean = ext.toLowerCase().replace(/^\./, '')
  return EXT_TO_LANG[clean] ?? 'plaintext'
}

/** 判断是否可当作文本打开的文件（用于目录树过滤：隐藏图片/二进制等） */
export function isTextFile(path: string): boolean {
  const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  const base = path.slice(slash + 1)
  const dot = base.lastIndexOf('.')
  if (dot < 0) return true // 无扩展名（Makefile/README/LICENSE 等）按文本处理
  const ext = base.slice(dot + 1).toLowerCase()
  return EXT_TO_LANG[ext] !== undefined
}

let registered = false
export function ensureLanguages(): void {
  if (registered) return
  registered = true
  // 补充 Monaco 基础语言缺失的若干（注册后走内建 monarch）
  const known = new Set(monaco.languages.getLanguages().map((l) => l.id))
  const extra: { id: string; ext: string[] }[] = [
    { id: 'cmake', ext: ['cmake'] },
    { id: 'makefile', ext: ['mk'] },
    { id: 'haskell', ext: ['hs'] },
    { id: 'fortran', ext: ['f', 'f90'] },
    { id: 'latex', ext: ['tex'] }
  ]
  for (const e of extra) {
    if (!known.has(e.id)) {
      monaco.languages.register({ id: e.id, extensions: e.ext })
    }
  }
}