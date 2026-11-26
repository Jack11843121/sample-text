import * as monaco from 'monaco-editor'

/** 对 JSON 文件做语法检查，输出红波浪线标记 */
export function lintJson(model: monaco.editor.ITextModel): void {
  const markers: monaco.editor.IMarkerData[] = []
  if (model.getLanguageId() === 'json') {
    try {
      JSON.parse(model.getValue())
    } catch (e) {
      const msg = String((e as Error)?.message ?? e)
      const m = /position\s+(\d+)/.exec(msg)
      const pos = m ? model.getPositionAt(Math.max(0, parseInt(m[1], 10) - 1)) : new monaco.Position(1, 1)
      const line = Math.max(1, pos.lineNumber)
      markers.push({
        severity: monaco.MarkerSeverity.Error,
        message: 'JSON 语法错误：' + msg,
        startLineNumber: line,
        startColumn: pos.column,
        endLineNumber: line,
        endColumn: 100000
      })
    }
  }
  monaco.editor.setModelMarkers(model, 'json-lint', markers)
}

function jsonFormatText(model: monaco.editor.ITextModel): string | null {
  try {
    const obj = JSON.parse(model.getValue())
    const indent = typeof model.getOptions().tabSize === 'number' ? model.getOptions().tabSize : 2
    return JSON.stringify(obj, null, indent)
  } catch {
    return null
  }
}

let initialized = false

export function initDiagnostics(): void {
  if (initialized) return
  initialized = true

  // JSON 文档格式化（配合 editor.action.formatDocument）
  monaco.languages.registerDocumentFormattingEditProvider('json', {
    provideDocumentFormattingEdits: (model) => {
      const text = jsonFormatText(model)
      return text == null ? [] : [{ range: model.getFullModelRange(), text }]
    }
  })

  // JSON 快速修复（⌘. 灯泡：格式化 JSON）
  monaco.languages.registerCodeActionProvider('json', {
    provideCodeActions: (model, _range, context) => {
      if (context.markers.length === 0) return { actions: [], dispose: () => {} }
      const text = jsonFormatText(model)
      if (text == null) return { actions: [], dispose: () => {} }
      return {
        actions: [
          {
            title: '格式化 JSON',
            kind: 'quickfix',
            isPreferred: true,
            edit: {
              edits: [
                {
                  resource: model.uri,
                  textEdit: { range: model.getFullModelRange(), text },
                  versionId: model.getVersionId()
                }
              ]
            }
          }
        ],
        dispose: () => {}
      }
    }
  })

  // 现有 model 兜底检查
  monaco.editor.getModels().forEach((m) => lintJson(m))
}