import { createRoot } from 'react-dom/client'
import './style.css'
import './components.css'
// 注册命令（副作用导入）
import './commands/editorCommands'
import './commands/appCommands'
import { initKeyboard } from './keybindings/loader'
import { loadPackageResources } from './features/resources'
import { loadPlugins } from './plugins/host'
import App from './App'

initKeyboard()
void loadPackageResources()
void loadPlugins()

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(<App />)
}