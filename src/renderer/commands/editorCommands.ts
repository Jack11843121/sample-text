import * as monaco from 'monaco-editor'
import { registerCommand, registerCommandMeta } from './registry'
import { getFocusedEditor, getFocusedModel } from '../editor/session'
import { store } from '../store'
import { nextBookmark, prevBookmark, toggleBookmark, selectAllBookmarks, clearBookmarks } from '../features/bookmarks'

function focused(): { editor: monaco.editor.IStandaloneCodeEditor; model: monaco.editor.ITextModel } | null {
  const editor = getFocusedEditor()
  const model = getFocusedModel()
  if (!editor || !model) return null
  return { editor, model }
}

function action(id: string): void {
  const ctx = focused()
  if (!ctx) return
  ctx.editor.trigger('keyboard', id, null)
}

type Cmd = { command: string; title: string; category?: string }

const meta: Cmd[] = []

function reg(command: string, handler: () => void, title: string, category?: string): void {
  registerCommand(command, handler)
  registerCommandMeta({ command, title, category })
  meta.push({ command, title, category })
}

// ---------------------------------------------------------------------------
// 选择（multi-cursor）
// ---------------------------------------------------------------------------
let selectionStack: monaco.Selection[][] = []

function pushSelections(editor: monaco.editor.IStandaloneCodeEditor): void {
  selectionStack.push(editor.getSelections() ?? [])
  if (selectionStack.length > 100) selectionStack.shift()
}

reg('quick_add_next', () => {
  const ctx = focused()
  if (!ctx) return
  pushSelections(ctx.editor)
  ctx.editor.trigger('keyboard', 'editor.action.addSelectionToNextFindMatch', null)
}, 'Quick Add Next', 'Selection')
reg('quick_skip_next', () => {
  const ctx = focused()
  if (!ctx) return
  ctx.editor.trigger('keyboard', 'editor.action.moveSelectionToNextFindMatch', null)
}, 'Quick Skip Next', 'Selection')
reg('quick_add_previous', () => {
  const ctx = focused()
  if (!ctx) return
  pushSelections(ctx.editor)
  ctx.editor.trigger('keyboard', 'editor.action.addSelectionToPreviousFindMatch', null)
}, 'Quick Add Previous', 'Selection')
reg('find_all', () => {
  const ctx = focused()
  if (!ctx) return
  ctx.editor.trigger('keyboard', 'editor.action.selectAllOccurrencesOfSelection', null)
}, 'Find All', 'Selection')
reg('undo_selection', () => {
  const ctx = focused()
  if (!ctx) return
  if (selectionStack.length > 0) {
    const sels = selectionStack.pop()!
    ctx.editor.setSelections(sels)
  } else {
    ctx.editor.trigger('keyboard', 'cancelSelection', null)
  }
}, 'Undo Selection', 'Selection')
reg('single_selection', () => {
  const ctx = focused()
  if (!ctx) return
  const sel = ctx.editor.getSelection()!
  ctx.editor.setSelections([sel])
}, 'Single Selection', 'Selection')
reg('insert_cursor_above', () => action('editor.action.insertCursorAbove'), 'Add Previous Line', 'Selection')
reg('insert_cursor_below', () => action('editor.action.insertCursorBelow'), 'Add Next Line', 'Selection')
reg('insert_cursor_to_end_of_each_line', () => action('editor.action.insertCursorAtEndOfEachLineSelected'), 'Split into Lines', 'Selection')
reg('split_selection_into_lines', () => action('editor.action.insertCursorAtEndOfEachLineSelected'), 'Split into Lines', 'Selection')
reg('select_all', () => action('editor.action.selectAll'), 'Select All', 'Selection')
reg('expand_selection_to_line', () => action('editor.action.expandToLine'), 'Expand Selection to Line', 'Selection')
reg('expand_selection_to_word', () => {
  const ctx = focused()
  if (!ctx) return
  ctx.editor.trigger('keyboard', 'editor.action.wordHighlight.trigger', null)
}, 'Expand Selection to Word', 'Selection')
reg('jump_to_bracket', () => action('editor.action.jumpToBracket'), 'Extend to Bracket', 'Selection')

// ---------------------------------------------------------------------------
// 编辑
// ---------------------------------------------------------------------------
reg('undo', () => action('undo'), 'Undo', 'Edit')
reg('redo', () => action('redo'), 'Redo', 'Edit')
reg('soft_undo', () => action('undo'), 'Soft Undo', 'Edit')
reg('redo_or_repeat', () => action('redo'), 'Redo or Repeat', 'Edit')
reg('cut', () => action('editor.action.clipboardCutAction'), 'Cut', 'Edit')
reg('copy', () => action('editor.action.clipboardCopyAction'), 'Copy', 'Edit')
reg('paste', () => action('editor.action.clipboardPasteAction'), 'Paste', 'Edit')
reg('indent', () => action('editor.action.indentLines'), 'Indent', 'Edit')
reg('unindent', () => action('editor.action.outdentLines'), 'Unindent', 'Edit')
reg('convert_indentation_to_spaces', () => action('editor.action.indentationToSpaces'), 'Convert Indentation to Spaces', 'Edit')
reg('convert_indentation_to_tabs', () => action('editor.action.indentationToTabs'), 'Convert Indentation to Tabs', 'Edit')
reg('toggle_comment', () => action('editor.action.commentLine'), 'Toggle Comment', 'Edit')
reg('toggle_block_comment', () => action('editor.action.blockComment'), 'Toggle Block Comment', 'Edit')
reg('duplicate_line', () => action('editor.action.copyLinesDownAction'), 'Duplicate Line', 'Edit')
reg('move_line_up', () => action('editor.action.moveLinesUpAction'), 'Move Line Up', 'Edit')
reg('move_line_down', () => action('editor.action.moveLinesDownAction'), 'Move Line Down', 'Edit')
reg('join_lines', () => action('editor.action.joinLines'), 'Join Lines', 'Edit')
reg('delete_line', () => {
  const ctx = focused()
  if (!ctx) return
  ctx.editor.trigger('keyboard', 'editor.action.deleteLines', null)
}, 'Delete Line', 'Edit')
reg('transpose', () => action('editor.action.transpose'), 'Transpose', 'Edit')
reg('remove_line', () => action('editor.action.deleteLines'), 'Delete Line', 'Edit')
reg('select_line', () => action('editor.action.expandToLine'), 'Select Line', 'Select')
reg('sort_lines', () => sortLines(false), 'Sort Lines', 'Selection')
reg('reverse_lines', () => sortLines(true), 'Permute Lines: Reverse', 'Selection')
reg('sort_lines_unique', () => sortLinesUnique(), 'Sort Lines (Unique)', 'Selection')
reg('reindent', () => action('editor.action.reindentselectedlines'), 'Reindent', 'Edit')
reg('reformat', () => action('editor.action.formatDocument'), 'Reformat Document', 'Edit')

// ---- 书签 ----
reg('toggle_bookmark', () => toggleBookmark(), 'Toggle Bookmark', 'Navigation')
reg('next_bookmark', () => nextBookmark(), 'Next Bookmark', 'Navigation')
reg('prev_bookmark', () => prevBookmark(), 'Previous Bookmark', 'Navigation')
reg('select_all_bookmarks', () => selectAllBookmarks(), 'Select All Bookmarks', 'Navigation')
reg('clear_bookmarks', () => clearBookmarks(), 'Clear Bookmarks', 'Navigation')
reg('toggle_case_sensitive', () => action('editor.action.transformToUppercase'), 'Convert Case: Upper', 'Edit')
reg('convert_to_uppercase', () => action('editor.action.transformToUppercase'), 'Convert Case: Uppercase', 'Edit')
reg('convert_to_lowercase', () => action('editor.action.transformToLowercase'), 'Convert Case: Lowercase', 'Edit')
reg('convert_to_title_case', () => action('editor.action.transformToTitlecase'), 'Convert Case: Title Case', 'Edit')
reg('expand_selection_to_tag', () => action('editor.action.selectToBracket'), 'Expand Selection to Tag', 'Selection')
reg('toggle_hash_comment', () => action('editor.action.commentLine'), 'Toggle Comment', 'Edit')

// ---------------------------------------------------------------------------
// 折叠
// ---------------------------------------------------------------------------
reg('fold', () => action('editor.fold'), 'Fold', 'Fold')
reg('unfold', () => action('editor.unfold'), 'Unfold', 'Fold')
reg('fold_all', () => action('editor.foldAll'), 'Fold All', 'Fold')
reg('unfold_all', () => action('editor.unfoldAll'), 'Unfold All', 'Fold')
reg('fold_tag_attributes', () => action('editor.foldAll'), 'Fold Tag Attributes', 'Fold')

// ---------------------------------------------------------------------------
// 查找（底层走 Monaco action，UI 由 appCommands 承接）
// ---------------------------------------------------------------------------
reg('find_next', () => action('editor.action.nextMatchFindAction'), 'Find Next', 'Find')
reg('find_previous', () => action('editor.action.previousMatchFindAction'), 'Find Previous', 'Find')
reg('open_find', () => action('actions.find'), 'Find…', 'Find')
reg('open_replace', () => action('editor.action.startFindReplaceAction'), 'Replace…', 'Find')
reg('close_find', () => action('closeFindWidget'), 'Close Find', 'Find')

// ---------------------------------------------------------------------------
// 导航
// ---------------------------------------------------------------------------
reg('goto_definition', () => action('editor.action.revealDefinition'), 'Goto Definition', 'Navigation')
reg('peek_definition', () => action('editor.action.peekDefinition'), 'Peek Definition', 'Navigation')
reg('goto_definition_fast', () => action('editor.action.revealDefinition'), 'Goto Definition', 'Navigation')
reg('goto_reference', () => action('editor.action.goToReferences'), 'Goto Reference', 'Navigation')
reg('format_document', () => action('editor.action.formatDocument'), 'Format Document', 'Edit')
reg('format_selection', () => action('editor.action.formatSelection'), 'Format Selection', 'Edit')
reg('rename_symbol', () => action('editor.action.rename'), 'Rename Symbol', 'Edit')

function sortLines(reverse: boolean): void {
  const ctx = focused()
  if (!ctx) return
  const sel = ctx.editor.getSelection()!
  const start = sel.startLineNumber
  const end = sel.endLineNumber
  const lines: string[] = []
  for (let i = start; i <= end; i++) {
    lines.push(ctx.model.getLineContent(i))
  }
  lines.sort((a, b) => (reverse ? b.localeCompare(a) : a.localeCompare(b)))
  const range = new monaco.Range(start, 1, end, ctx.model.getLineMaxColumn(end))
  ctx.editor.executeEdits('sort-lines', [{ range, text: lines.join(ctx.model.getEOL()) }])
}

function sortLinesUnique(): void {
  const ctx = focused()
  if (!ctx) return
  const sel = ctx.editor.getSelection()!
  const start = sel.startLineNumber
  const end = sel.endLineNumber
  const seen = new Set<string>()
  const lines: string[] = []
  for (let i = start; i <= end; i++) {
    const l = ctx.model.getLineContent(i)
    if (!seen.has(l)) {
      seen.add(l)
      lines.push(l)
    }
  }
  lines.sort()
  const range = new monaco.Range(start, 1, end, ctx.model.getLineMaxColumn(end))
  ctx.editor.executeEdits('sort-lines-unique', [{ range, text: lines.join(ctx.model.getEOL()) }])
}