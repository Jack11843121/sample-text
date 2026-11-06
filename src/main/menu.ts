import { app, BrowserWindow, Menu, MenuItemConstructorOptions } from 'electron'
import { IPC } from '../shared/types'

function sendToFocused(command: string, args?: Record<string, unknown>): void {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  if (win) win.webContents.send(IPC.MENU_COMMAND, { command, args })
}

const isMac = process.platform === 'darwin'

function cmd(label: string, command: string, accelerator?: string, args?: Record<string, unknown>): MenuItemConstructorOptions {
  return { label, accelerator, click: () => sendToFocused(command, args) }
}

export function buildMenu(_win: BrowserWindow): Menu {
  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              cmd('Preferences…', 'open_user_settings', 'CmdOrCtrl+,'),
              cmd('Key Bindings…', 'open_user_keymap'),
              cmd('Settings Syntax Specific…', 'open_syntax_settings'),
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [
        cmd('New File', 'new_file', 'CmdOrCtrl+N'),
        cmd('Open File…', 'open_file_dialog', 'CmdOrCtrl+O'),
        cmd('Open Folder…', 'open_folder_dialog'),
        { type: 'separator' },
        cmd('Save', 'save', 'CmdOrCtrl+S'),
        cmd('Save As…', 'save_as', 'CmdOrCtrl+Shift+S'),
        cmd('Save All', 'save_all', 'CmdOrCtrl+Alt+S'),
        cmd('Close File', 'close_file', 'CmdOrCtrl+W'),
        { type: 'separator' },
        cmd('Reopen Closed File', 'reopen_last_file', 'CmdOrCtrl+Shift+T'),
        { type: 'separator' },
        cmd('New Window', 'new_window', 'CmdOrCtrl+Shift+N'),
        { type: 'separator' },
        ...(isMac ? [] : [cmd('Preferences…', 'open_user_settings', undefined), { type: 'separator' as const }]),
        ...(isMac ? [] : [{ role: 'quit' as const }])
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', label: 'Undo', accelerator: 'CmdOrCtrl+Z' },
        cmd('Soft Undo', 'soft_undo', 'CmdOrCtrl+U'),
        { role: 'redo', label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z' },
        cmd('Redo or Repeat', 'redo_or_repeat', 'CmdOrCtrl+Y'),
        { type: 'separator' },
        { role: 'cut', label: 'Cut', accelerator: 'CmdOrCtrl+X' },
        { role: 'copy', label: 'Copy', accelerator: 'CmdOrCtrl+C' },
        { role: 'paste', label: 'Paste', accelerator: 'CmdOrCtrl+V' },
        { role: 'selectAll', label: 'Select All', accelerator: 'CmdOrCtrl+A' },
        { type: 'separator' },
        cmd('Indent', 'indent', 'CmdOrCtrl+]'),
        cmd('Unindent', 'unindent', 'CmdOrCtrl+['),
        cmd('Toggle Comment', 'toggle_comment', 'CmdOrCtrl+/'),
        cmd('Toggle Block Comment', 'toggle_block_comment', 'CmdOrCtrl+Shift+/'),
        cmd('Duplicate Line', 'duplicate_line', 'CmdOrCtrl+Shift+D'),
        cmd('Delete Line', 'delete_line', 'Ctrl+Shift+K'),
        cmd('Join Lines', 'join_lines', 'CmdOrCtrl+J'),
        cmd('Move Line Up', 'move_line_up', 'CmdOrCtrl+Shift+Up'),
        cmd('Move Line Down', 'move_line_down', 'CmdOrCtrl+Shift+Down'),
        { type: 'separator' },
        cmd('Expand Selection to Tag', 'expand_selection_to_tag', 'CmdOrCtrl+Shift+A'),
        cmd('Expand Selection to Scope', 'expand_selection_to_scope'),
        { type: 'separator' },
        cmd('Sort Lines', 'sort_lines', 'F5'),
        cmd('Permute Lines: Reverse', 'reverse_lines')
      ]
    },
    {
      label: 'Selection',
      submenu: [
        cmd('Split into Lines', 'split_selection_into_lines', 'CmdOrCtrl+Shift+L'),
        cmd('Add Previous Line', 'insert_cursor_above', 'CmdOrCtrl+Alt+Up'),
        cmd('Add Next Line', 'insert_cursor_below', 'CmdOrCtrl+Alt+Down'),
        { type: 'separator' },
        cmd('Quick Add Next', 'quick_add_next', 'CmdOrCtrl+D'),
        cmd('Quick Skip Next', 'quick_skip_next'),
        cmd('Find All', 'find_all', 'CmdOrCtrl+Alt+G'),
        cmd('Undo Selection', 'undo_selection', 'CmdOrCtrl+U'),
        { type: 'separator' },
        cmd('Single Selection', 'single_selection', 'Escape'),
        { type: 'separator' },
        cmd('Extend to Bracket', 'jump_to_bracket', 'CmdOrCtrl+M')
      ]
    },
    {
      label: 'Find',
      submenu: [
        cmd('Find…', 'show_find', 'CmdOrCtrl+F'),
        cmd('Replace…', 'show_replace', 'CmdOrCtrl+H'),
        cmd('Find Next', 'find_next', 'CmdOrCtrl+G'),
        cmd('Find Previous', 'find_previous', 'CmdOrCtrl+Shift+G'),
        cmd('Find Under', 'find_under', 'CmdOrCtrl+E'),
        cmd('Find Under Previous', 'find_under_previous', 'CmdOrCtrl+Shift+E'),
        { type: 'separator' },
        cmd('Find in Files…', 'find_in_files', 'CmdOrCtrl+Shift+F'),
        cmd('Use Selection for Find', 'use_selection_for_find', 'CmdOrCtrl+E'),
        { type: 'separator' }
      ]
    },
    {
      label: 'View',
      submenu: [
        cmd('Toggle Side Bar', 'toggle_sidebar', 'CmdOrCtrl+K,CmdOrCtrl+B'),
        cmd('Toggle Minimap', 'toggle_minimap'),
        cmd('Toggle Status Bar', 'toggle_status_bar'),
        cmd('Toggle Tabs', 'toggle_tabs'),
        { type: 'separator' },
        cmd('Split View: 2 Columns', 'set_layout_2col', 'CmdOrCtrl+Alt+2'),
        cmd('Split View: 1 Column', 'set_layout_1col', 'CmdOrCtrl+Alt+1'),
        cmd('Split View: 2 Rows', 'set_layout_2row'),
        cmd('Split View: 3 Columns', 'set_layout_3col'),
        { type: 'separator' },
        cmd('Focus Left Pane', 'focus_left_pane', 'CmdOrCtrl+Shift+Left'),
        cmd('Focus Right Pane', 'focus_right_pane', 'CmdOrCtrl+Shift+Right'),
        cmd('Focus Previous Pane', 'focus_prev_pane', 'Ctrl+PageUp'),
        cmd('Focus Next Pane', 'focus_next_pane', 'Ctrl+PageDown'),
        { type: 'separator' },
        cmd('Distraction Free', 'toggle_distraction_free', 'CmdOrCtrl+Shift+F11'),
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Goto',
      submenu: [
        cmd('Goto Anything…', 'show_goto_anything', 'CmdOrCtrl+P'),
        cmd('Goto Symbol…', 'show_goto_symbol', 'CmdOrCtrl+R'),
        cmd('Goto Symbol in Project…', 'show_goto_symbol_project', 'CmdOrCtrl+Shift+R'),
        cmd('Goto Line…', 'show_goto_line', 'CmdOrCtrl+G'),
        cmd('Goto Definition…', 'goto_definition', 'F12'),
        { type: 'separator' },
        cmd('Next Edit Point', 'next_edit_point'),
        cmd('Previous Edit Point', 'prev_edit_point')
      ]
    },
    {
      label: 'Tools',
      submenu: [
        cmd('Command Palette…', 'show_command_palette', 'CmdOrCtrl+Shift+P'),
        cmd('Show Build Results', 'show_build_results'),
        cmd('Build', 'run_build', 'CmdOrCtrl+B'),
        cmd('Cancel Build', 'cancel_build', 'CmdOrCtrl+Escape'),
        { type: 'separator' },
        cmd('Record Macro', 'record_macro'),
        cmd('Run Macro', 'run_macro'),
        cmd('Save Macro…', 'save_macro'),
        { type: 'separator' },
        cmd('Snippet…', 'insert_snippet')
      ]
    },
    {
      label: 'Project',
      submenu: [
        cmd('Add Folder to Project…', 'add_folder_to_project'),
        cmd('Open Project…', 'open_project_dialog'),
        cmd('Save Project As…', 'save_project_as'),
        cmd('Switch Project…', 'show_project_switcher'),
        { type: 'separator' },
        cmd('Refresh Folders', 'refresh_project')
      ]
    },
    {
      label: 'Preferences',
      submenu: [
        cmd('Settings…', 'open_user_settings', 'CmdOrCtrl+,'),
        cmd('Key Bindings…', 'open_user_keymap'),
        cmd('Syntax Specific…', 'open_syntax_settings'),
        cmd('Project Settings…', 'open_project_settings'),
        { type: 'separator' },
        cmd('Color Scheme…', 'show_color_scheme_picker'),
        cmd('Theme…', 'show_theme_picker')
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      role: 'help',
      submenu: [
        { label: 'sample-text 文档', click: () => void require('electron').shell.openExternal('https://www.sublimetext.com/docs/') },
        { type: 'separator' },
        { role: 'toggleDevTools', label: 'Toggle Developer Tools' }
      ]
    }
  ]

  return Menu.buildFromTemplate(template)
}