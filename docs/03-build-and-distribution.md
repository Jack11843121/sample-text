# 构建与分发说明

## 前置条件

- Node.js ≥ 20，npm ≥ 10
- macOS：Xcode Command Line Tools（公证需要完整 Xcode）
- Windows：在 Windows 机器上执行 `npm run build:win`（electron-builder 交叉打包受限于签名/资源，建议原生构建）

## 本地构建产物（免安装验证）

```bash
npm run build:unpack
# 产物：release/mac{,-arm64}/sample-text.app（mac）或 release/win-unpacked/（win）
```

## macOS

```bash
npm run build:mac          # 同时产出 x64 与 arm64 的 .dmg 与 .zip
```

- **无签名运行**：首次打开被 Gatekeeper 拦截，用户需 `右键 → 打开`，
  或执行 `xattr -dr com.apple.quarantine /Applications/sample-text.app`。
- **正式分发**：配置开发者证书后，`electron-builder` 会走
  `Developer ID Application` 签名 + `notarytool` 公证 + `stapler staple`。
  需在环境变量 / `electron-builder.yml` 中填入证书信息（`CSC_LINK`、`CSC_KEY_PASSWORD`、
  `APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`APPLE_TEAM_ID`）。
- 已启用 Hardened Runtime，entitlements 见 `build/entitlements.mac.plist`
  （含 `allow-jit`，保证 V8 JIT 正常）。

## Windows

```bash
npm run build:win          # NSIS 安装器（需在 Windows 本机执行）
npm run build:win:zip      # 便携 zip（可跨平台生成，已验证于 macOS arm64）
```

> **实测结论（2026-11-06）**：
> - `zip` 便携包可在 macOS(aarch64) 交叉生成，产物 `release/sample-text-<版本>-win-x64.zip`，
>   解压后双击 `sample-text.exe` 即可运行。
> - `NSIS` 安装器无法在 macOS 交叉生成：`makensis` 预编译二进制为 x86_64，
>   arm64 Mac（无 Rosetta）报 `Bad CPU type`。**请在有 Rosetta 的 x64 Mac 或 Windows 本机生成 NSIS**。
> - 当前 `win.signAndEditExecutable: false`——跨平台 zip 构建跳过 exe 图标/版本资源编辑与签名，
>   产物使用 Electron 默认图标。正式分发时在 Windows 本机将该项改回 `true` 并提供 `win.icon` 与证书。

- **无签名**：SmartScreen 会警告，用户点「更多信息 → 仍要运行」。
- **正式分发**：配置 Authenticode 证书（OV/EV），在 `electron-builder.yml`
  的 `win.certificateFile` / `certificatePassword` 填入后即可自动签名。

## 自动化更新

当前为开源早期，暂未接入更新服务器。后续可基于 `electron-updater`（MIT）
+ 自有静态源实现 delta 更新，并对安装包做 SHA-256 校验与签名。

## 产物校验

```bash
# mac
codesign -dv --verbose=4 release/mac-arm64/sample-text.app
# win
signtool verify /pa release/sample-text-Setup-0.1.0.exe
```