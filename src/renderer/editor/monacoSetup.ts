import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

let initialized = false

export function initMonaco(): void {
  if (initialized) return
  initialized = true

  ;(self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
    getWorker(_workerId: string, label: string): Worker {
      if (label === 'json') return new jsonWorker()
      if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
      if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
      if (label === 'typescript' || label === 'javascript') return new tsWorker()
      return new editorWorker()
    }
  }

  monaco.editor.defineTheme('sample-text-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '75715E', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'F92672' },
      { token: 'keyword.flow', foreground: 'F92672' },
      { token: 'string', foreground: 'E6DB74' },
      { token: 'string.escape', foreground: 'AE81FF' },
      { token: 'number', foreground: 'AE81FF' },
      { token: 'constant', foreground: 'AE81FF' },
      { token: 'type', foreground: '66D9EF' },
      { token: 'type.identifier', foreground: '66D9EF' },
      { token: 'identifier', foreground: 'F8F8F2' },
      { token: 'function', foreground: 'A6E22E' },
      { token: 'delimiter', foreground: 'F8F8F2' },
      { token: 'tag', foreground: 'F92672' },
      { token: 'attribute.name', foreground: 'A6E22E' },
      { token: 'attribute.value', foreground: 'E6DB74' },
      { token: 'annotation', foreground: '75715E' },
      { token: 'operator', foreground: 'F92672' },
      { token: 'regexp', foreground: 'AE81FF' }
    ],
    colors: {
      'editor.background': '#272822',
      'editor.foreground': '#F8F8F2',
      'editorLineNumber.foreground': '#90908A',
      'editorLineNumber.activeForeground': '#F8F8F2',
      'editorCursor.foreground': '#F8F8F0',
      'editor.selectionBackground': '#49483E',
      'editor.inactiveSelectionBackground': '#3E3D32',
      'editor.lineHighlightBackground': '#3E3D32',
      'editorIndentGuide.background': '#3B3A32',
      'editorIndentGuide.activeBackground': '#75715E',
      'editorWidget.background': '#272822',
      'editorWidget.border': '#3E3D32',
      'editorSuggestWidget.background': '#272822',
      'editorSuggestWidget.selectedBackground': '#49483E',
      'scrollbarSlider.background': '#49483E55',
      'scrollbarSlider.hoverBackground': '#75715E88',
      'scrollbarSlider.activeBackground': '#75715E',
      'minimap.background': '#23241F',
      'editorGutter.background': '#272822'
    }
  })

  monaco.editor.defineTheme('sample-text-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '9E9E9E', fontStyle: 'italic' },
      { token: 'keyword', foreground: '8959A8' },
      { token: 'keyword.flow', foreground: '8959A8' },
      { token: 'string', foreground: '50A14F' },
      { token: 'string.escape', foreground: 'B78400' },
      { token: 'number', foreground: 'B78400' },
      { token: 'constant', foreground: 'B78400' },
      { token: 'type', foreground: '4078F2' },
      { token: 'type.identifier', foreground: '4078F2' },
      { token: 'identifier', foreground: '383A42' },
      { token: 'function', foreground: '4078F2' },
      { token: 'delimiter', foreground: '383A42' },
      { token: 'tag', foreground: 'E45649' },
      { token: 'attribute.name', foreground: '986801' },
      { token: 'attribute.value', foreground: '50A14F' },
      { token: 'annotation', foreground: '9E9E9E' },
      { token: 'operator', foreground: '8959A8' },
      { token: 'regexp', foreground: 'B78400' },
      { token: 'variable', foreground: 'E45649' }
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#383A42',
      'editorLineNumber.foreground': '#9D9D9F',
      'editorLineNumber.activeForeground': '#383A42',
      'editorCursor.foreground': '#383A42',
      'editor.selectionBackground': '#B4D5FE',
      'editor.lineHighlightBackground': '#F2F2F2',
      'editorIndentGuide.background': '#ECECEC',
      'editorIndentGuide.activeBackground': '#C8C8C8'
    }
  })
}

export function editorTheme(base: 'dark' | 'light'): string {
  return base === 'dark' ? 'sample-text-dark' : 'sample-text-light'
}