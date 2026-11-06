import { spawn, ChildProcess } from 'child_process'
import { dirname, basename, extname, join, isAbsolute, resolve } from 'path'
import type { BuildResult, BuildResultMatch, BuildSystem } from '@shared/types'
import { mergeBuildSystemForPlatform } from './project'

export interface BuildScope {
  file?: string
  projectPath?: string
  folders?: string[]
}

let activeBuild: ChildProcess | null = null

export function cancelActiveBuild(): void {
  if (activeBuild) {
    activeBuild.kill('SIGTERM')
    activeBuild = null
  }
}

export function expandVariables(input: string, scope: BuildScope): string {
  const file = scope.file ?? ''
  const fileDir = file ? dirname(file) : ''
  const fileBase = file ? basename(file) : ''
  const ext = file ? extname(file) : ''
  const fileBaseNoExt = fileBase ? (ext ? fileBase.slice(0, -ext.length) : fileBase) : ''
  const projectPath = scope.projectPath ?? scope.folders?.[0] ?? ''
  const projectName = projectPath ? basename(projectPath) : ''
  const platform = process.platform === 'darwin' ? 'osx' : process.platform === 'win32' ? 'windows' : 'linux'

  const vars: Record<string, string> = {
    file,
    file_path: fileDir,
    file_name: fileBase,
    file_base_name: fileBaseNoExt,
    file_extension: ext.replace(/^\./, ''),
    project_path: projectPath,
    project_name: projectName,
    folder: projectPath,
    packages: '',
    platform
  }
  return input.replace(/\$\{?([a-zA-Z_][a-zA-Z0-9_]*)\}?/g, (m, name: string) => {
    return name in vars ? vars[name] : m
  })
}

function shellCommandLine(cmd: string): { shell: string; args: string[] } {
  if (process.platform === 'win32') {
    return { shell: process.env.ComSpec || 'cmd.exe', args: ['/d', '/s', '/c', cmd] }
  }
  return { shell: process.env.SHELL || '/bin/sh', args: ['-c', cmd] }
}

function tryParseFileRegex(line: string, fileRegex: RegExp | null, workingDir: string): BuildResultMatch | null {
  if (!fileRegex) return null
  // 重置 lastIndex 避免全局标志干扰
  const re = new RegExp(fileRegex.source, fileRegex.flags.replace(/g/g, ''))
  const m = re.exec(line)
  if (!m) return null
  // Sublime 惯例：$1=file, $2=line, $3=column, $4=message
  const file = m[1]
  const lineNum = m[2] ? parseInt(m[2], 10) : undefined
  const colNum = m[3] ? parseInt(m[3], 10) : undefined
  const message = m[4] ?? m[0]
  if (!file) return null
  const resolvedFile = isAbsolute(file) ? file : resolve(workingDir, file)
  return {
    file: resolvedFile,
    line: lineNum,
    column: colNum,
    message
  }
}

export async function runBuild(
  spec: BuildSystem,
  scope: BuildScope,
  onOutput: (chunk: string) => void
): Promise<BuildResult> {
  const platformSpec = mergeBuildSystemForPlatform(spec, process.platform)
  const workingDir = expandVariables(
    platformSpec.working_dir ?? scope.projectPath ?? scope.folders?.[0] ?? process.cwd(),
    scope
  )

  let proc: ChildProcess
  if (platformSpec.shell_cmd) {
    const cmdLine = expandVariables(platformSpec.shell_cmd, scope)
    const { shell, args } = shellCommandLine(cmdLine)
    proc = spawn(shell, args, { cwd: workingDir, env: { ...process.env, ...(platformSpec.env ?? {}) } })
  } else if (platformSpec.cmd) {
    const cmdArr = (Array.isArray(platformSpec.cmd) ? platformSpec.cmd : [platformSpec.cmd]).map((c) =>
      expandVariables(c, scope)
    )
    const [program, ...args] = cmdArr
    proc = spawn(program, args, { cwd: workingDir, env: { ...process.env, ...(platformSpec.env ?? {}) } })
  } else {
    return { exitCode: -1, output: 'No build command (cmd or shell_cmd) configured.', matches: [], canceled: false }
  }

  activeBuild = proc
  let output = ''
  let fileRegex: RegExp | null = null
  if (platformSpec.file_regex) {
    try {
      fileRegex = new RegExp(platformSpec.file_regex)
    } catch {
      fileRegex = null
    }
  }
  const matches: BuildResultMatch[] = []

  proc.stdout?.on('data', (d: Buffer) => {
    const s = d.toString()
    output += s
    onOutput(s)
    for (const line of s.split(/\r?\n/)) {
      if (!line.trim()) continue
      const match = tryParseFileRegex(line, fileRegex, workingDir)
      if (match) matches.push(match)
    }
  })
  proc.stderr?.on('data', (d: Buffer) => {
    const s = d.toString()
    output += s
    onOutput(s)
  })

  return await new Promise<BuildResult>((resolveResult) => {
    proc.on('close', (code) => {
      const canceled = activeBuild !== proc
      if (activeBuild === proc) activeBuild = null
      resolveResult({ exitCode: code, output, matches, canceled })
    })
    proc.on('error', (err) => {
      output += `\nBuild error: ${err.message}\n`
      if (activeBuild === proc) activeBuild = null
      resolveResult({ exitCode: -1, output, matches, canceled: false })
    })
  })
}