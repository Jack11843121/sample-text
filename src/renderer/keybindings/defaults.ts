import type { KeyBindingRule } from '@shared/types'

/**
 * 内建默认键位（Sublime 风格子集）。
 * 修饰键约定：primary = mac⌘ / win&linux Ctrl；super/command = ⌘。
 * 两条规则同名命令时，靠后一条在匹配时优先（此处顺序即优先级低→高）。
 */
export const DEFAULT_KEYBINDINGS: KeyBindingRule[] = [
  // 导航面板
  { keys: ['primary+p'], command: 'show_goto_anything' },
  { keys: ['primary+shift+p'], command: 'show_command_palette' },
  { keys: ['primary+r'], command: 'show_goto_symbol' },
  { keys: ['primary+shift+r'], command: 'show_goto_symbol_project' },
  { keys: ['primary+g'], command: 'show_goto_line' },
  { keys: ['primary+o'], command: 'open_file_dialog' },
  { keys: ['primary+n'], command: 'new_file' },
  { keys: ['primary+shift+n'], command: 'new_window' },

  // 文件
  { keys: ['primary+s'], command: 'save' },
  { keys: ['primary+shift+s'], command: 'save_as' },
  { keys: ['primary+alt+s'], command: 'save_all' },
  { keys: ['primary+w'], command: 'close_file' },
  { keys: ['primary+shift+t'], command: 'reopen_last_file' },

  // 查找
  { keys: ['primary+f'], command: 'show_find' },
  { keys: ['primary+alt+f'], command: 'show_replace' },
  { keys: ['primary+shift+f'], command: 'find_in_files' },
  { keys: ['f3'], command: 'find_next' },
  { keys: ['shift+f3'], command: 'find_previous' },
  { keys: ['primary+alt+g'], command: 'find_all' },
  { keys: ['alt+f3'], command: 'find_all' },

  // 多光标 / 选择
  { keys: ['primary+d'], command: 'quick_add_next' },
  { keys: ['primary+k', 'primary+d'], command: 'quick_skip_next' },
  { keys: ['primary+u'], command: 'undo_selection' },
  { keys: ['escape'], command: 'single_selection' },
  { keys: ['primary+l'], command: 'expand_selection_to_line' },
  { keys: ['primary+shift+l'], command: 'split_selection_into_lines' },
  { keys: ['primary+alt+up'], command: 'insert_cursor_above' },
  { keys: ['primary+ctrl+up'], command: 'insert_cursor_above' },
  { keys: ['primary+alt+down'], command: 'insert_cursor_below' },
  { keys: ['primary+ctrl+down'], command: 'insert_cursor_below' },
  { keys: ['primary+m'], command: 'jump_to_bracket' },
  { keys: ['primary+shift+a'], command: 'expand_selection_to_tag' },

  // 竖向（列）选择
  { keys: ['shift+alt+up'], command: 'column_select_up' },
  { keys: ['shift+alt+down'], command: 'column_select_down' },
  { keys: ['shift+alt+left'], command: 'column_select_left' },
  { keys: ['shift+alt+right'], command: 'column_select_right' },

  // 编辑
  { keys: ['primary+z'], command: 'undo' },
  { keys: ['primary+shift+z'], command: 'redo' },
  { keys: ['primary+y'], command: 'redo_or_repeat' },
  { keys: ['primary+x'], command: 'cut' },
  { keys: ['primary+c'], command: 'copy' },
  { keys: ['primary+v'], command: 'paste' },
  { keys: ['primary+a'], command: 'select_all' },
  { keys: ['primary+shift+d'], command: 'duplicate_line' },
  { keys: ['primary+shift+up'], command: 'move_line_up' },
  { keys: ['primary+shift+down'], command: 'move_line_down' },
  { keys: ['primary+j'], command: 'join_lines' },
  { keys: ['primary+]'], command: 'indent' },
  { keys: ['primary+['], command: 'unindent' },
  { keys: ['primary+/'], command: 'toggle_comment' },
  { keys: ['primary+shift+/'], command: 'toggle_block_comment' },
  { keys: ['ctrl+shift+k'], command: 'delete_line' },
  { keys: ['f9'], command: 'sort_lines' },

  // 折叠
  { keys: ['ctrl+shift+['], command: 'fold' },
  { keys: ['ctrl+shift+]'], command: 'unfold' },
  { keys: ['primary+k', 'primary+0'], command: 'unfold_all' },
  { keys: ['primary+k', 'primary+1'], command: 'fold_all' },

  // 大小写
  { keys: ['primary+k', 'primary+u'], command: 'convert_to_uppercase' },
  { keys: ['primary+k', 'primary+l'], command: 'convert_to_lowercase' },

  // 书签
  { keys: ['primary+f2'], command: 'toggle_bookmark' },
  { keys: ['f2'], command: 'next_bookmark' },
  { keys: ['shift+f2'], command: 'prev_bookmark' },
  { keys: ['primary+shift+f2'], command: 'clear_bookmarks' },

  // 布局
  { keys: ['primary+alt+1'], command: 'set_layout_1col' },
  { keys: ['primary+alt+2'], command: 'set_layout_2col' },
  { keys: ['primary+alt+3'], command: 'set_layout_3col' },
  { keys: ['primary+k', 'primary+b'], command: 'toggle_sidebar' },
  { keys: ['ctrl+shift+left'], command: 'focus_left_pane' },
  { keys: ['ctrl+shift+right'], command: 'focus_right_pane' },
  { keys: ['ctrl+pageup'], command: 'focus_prev_pane' },
  { keys: ['ctrl+pagedown'], command: 'focus_next_pane' },
  { keys: ['primary+shift+f11'], command: 'toggle_distraction_free' },

  // 视图设置
  { keys: ['alt+z'], command: 'toggle_word_wrap' },
  { keys: ['primary+='], command: 'increase_font_size' },
  { keys: ['primary+-'], command: 'decrease_font_size' },

  // 构建 / 工具
  { keys: ['primary+b'], command: 'run_build' },
  { keys: ['primary+shift+b'], command: 'show_build_results' },

  // 定义
  { keys: ['f12'], command: 'goto_definition' },
  { keys: ['shift+f12'], command: 'goto_reference' },
  { keys: ['primary+f12'], command: 'goto_definition_fast' }
]