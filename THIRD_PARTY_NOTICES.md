# 第三方许可证清单（Third-Party Notices）

sample-text 项目本体以 **MIT License** 发布。下表列出本项目直接依赖的第三方软件及其许可证。
所有依赖均为宽松许可（permissive），不含 GPL/LGPL/AGPL 传染性条款。

| 依赖 | 用途 | 许可证 |
|---|---|---|
| Electron | 桌面应用运行时 | MIT（内嵌 Chromium BSD-3-Clause、Node.js MIT） |
| Monaco Editor | 编辑器内核 | MIT |
| vscode-textmate | TextMate 语法 (.tmLanguage) 解析 | MIT |
| vscode-oniguruma | Oniguruma 正则引擎 WASM 封装 | MIT 包装层 |
| Oniguruma（经 vscode-oniguruma 分发） | 正则引擎 | BSD-2-Clause |
| chokidar | 文件系统监听 | MIT |
| React / react-dom | UI 框架 | MIT |
| electron-vite / vite | 构建工具 | MIT |
| electron-builder | 打包/签名/公证 | MIT |
| TypeScript | 开发语言 | Apache-2.0 |
| @vitejs/plugin-react | Vite 插件 | MIT |

## 需保留的版权声明

- **Oniguruma**（BSD-2-Clause）：其版权声明随 `node_modules/vscode-oniguruma` 分发，
  二进制再分发时必须保留原版权页。项目构建时未移除该声明文件即可满足要求。

## 本清单维护

- 新增依赖前需核对许可证；若引入 copyleft（GPL 系）依赖，必须经项目维护者评估隔离方式。
- 发行安装包时，建议随包附带本文件与各依赖的 LICENSE 文件。