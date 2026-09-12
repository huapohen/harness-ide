# Harness IDE

以 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 Everything is a Plugin 思想构建的轻量 IDE 首版。macOS AppKit 窗口 + 系统 WKWebView + Node.js 本地服务。没有 Electron、Monaco 或 VS Code 扩展宿主。

## 启动

已生成完整 macOS 应用，安装位置：`/Applications/Harness IDE.app`。可从 Finder 的「应用程序」或 Spotlight 搜索 Harness IDE 启动。从源码执行打包后生成 `build/Harness IDE.app`；构建产物不提交到 Git。

应用包已包含 Node、终端组件、前端和后端，可单独移动，无需安装 Node/npm，也不依赖源码目录。首次启动将示例复制到 `~/Library/Application Support/Harness IDE/example`，避免修改签名应用包；点击顶部文件夹名称切换到你的项目。应用图标使用本机 VS Code 的原始 Code.icns，应用名称仍为 Harness IDE。

```sh
# 从源代码重建：Node.js 22+，macOS Xcode Command Line Tools
npm ci
npm run app

# 浏览器模式：复制终端输出的完整本机 URL
npm run build
npm start

# 指定工作区启动浏览器模式
WORKSPACE=/absolute/path/to/project npm start

npm test
```

`npm run dev` 构建前端并监视后端文件。修改前端后另执行 `npm run build` 并刷新页面；不启动额外的 Vite 开发服务器。后端默认分配空闲端口，只监听 127.0.0.1。每次启动生成随机访问令牌。

## 功能

- 左侧 Explorer，中央文档区，可调高度的底部终端。
- 同一个标签栏混排文件与终端；拖动排序、单独关闭、多个独立 PTY 会话。切换标签不销毁会话。
- `Command+A` 显示或隐藏底部终端，`Command+Shift+Z` 最大化或恢复终端区域；会话保持运行。
- `Command+Shift+E` 显示或隐藏左侧栏。目录树右键提供新建文件、文件夹、刷新和 `Collapse Folders in Explorer`（折叠全部文件夹），顶部不再放置这四个按钮。
- Markdown 渲染与源码编辑、PDF 原生阅读器、隔离的 HTML 预览；其他文本直接编辑。保存时检查内容哈希，避免覆盖外部修改。
- One Dark Pro 配色与 Light。主题记住到下次启动；现有终端同步换色，无需重启 Shell。
- Git：状态、未暂存 / 已暂存 diff、指定路径暂存 / 取消暂存、commit。push、pull、分支等可在真实终端使用 Git CLI。
- SSH Remote：远程目录树、文本编辑、PDF/HTML/MD 读取、Git 操作、交互终端。复用系统 OpenSSH 配置与认证。
- 命令面板、插件清单、前后端可替换的插件配置。

快捷键可在设置面板（⌘,）查看、修改和录制，也可直接编辑 `~/.hot_plugging/user/keybindings.json`。支持上下文和组合键，保存后即时生效。**完整快捷键表、单独 Shift+字母操作、pin 标签保护和修改方法见 [快捷键说明](KEYBINDINGS.md)。**

关闭修改过的文件时可保存、不保存或取消；运行任务的终端拒绝关闭，终端实际退出后自动移除标签。

## SSH 使用

1. 在本机终端先执行 `ssh my-server`，验证主机指纹、配置密钥 / SSH Agent。
2. 远端需要可用的 `python3`，Git 功能另需 `git`。支持 Unix 类远端。
3. 在 Remote Explorer 点「连接 SSH」，输入 SSH config 别名（如 `my-server`）或 `user@host`，以及远端绝对目录或 `~/project`。
4. 文件操作使用 BatchMode，因此不弹密码框；非默认端口、IdentityFile、ProxyJump 在 `~/.ssh/config` 中配置。

连接失败会保留当前工作区。连接成功后关闭旧终端和标签，再打开远端 Shell。远程文件桥通过 SSH 标准输入传 JSON，无需部署常驻代理。当前实现每个文件操作建立一次 SSH 连接；可在自己的 SSH 配置里设置 ControlMaster 提高效率。

## 插件架构

参考 [Harness 架构文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md) 的共享上下文、服务依赖、事件、可撤销副作用和配置组合。此项目是思想实现，未复制整个 dsh，也不兼容 dsh/Cordis 或 VS Code 的插件包。

```text
native/App.swift               原生窗口及进程生命周期
src/kernel.js                  共享插件内核（前后端共用）
plugins.config.js              前端启动组合
src/plugins/                   工作台、文档、主题、Git、SSH 等插件
server/plugins.config.mjs      后端启动组合
server/plugins/                工作区、文件系统、Git、PTY 插件
server/index.mjs               HTTP / WebSocket 传输与认证
server/workspace.mjs           本地 / SSH 工作区实现
src/ghostty-theme.js           Ghostty 0.4 主题适配
```

内核负责 `mount / unmount`、依赖校验、服务注册、事件和副作用回收。激活失败时回滚；被其他插件依赖的服务不能直接卸载。功能由配置列表中的模块注入，不在内核写业务逻辑。插件与宿主同权限运行，仅加载自己信任的本地代码。

新增前端插件 `src/plugins/clock.js`：

```js
export default {
  id: 'clock',
  requires: ['workbench'],
  activate(ctx) {
    const wb = ctx.get('workbench');
    ctx.effect(wb.command('clock.now', '工具 · 当前时间', () => {
      alert(new Date().toLocaleString());
    }));
    const timer = setInterval(() => ctx.emit('clock.tick', Date.now()), 1000);
    ctx.effect(() => clearInterval(timer));
  }
};
```

把 `{ id: 'clock' }` 加到 `plugins.config.js` 末尾，重新构建。`enabled: false` 可关闭条目；关闭服务提供者时也需关闭依赖它的插件。更换插件实现可直接改模块；新增模块由 Vite 自动发现。插件面板支持分类、搜索、启用、禁用和卸载；核心插件受依赖保护。不提供 VS Code 扩展市场兼容。

后端插件可以通过 `ctx.get('routes').register(name, handler)` 添加认证 API，通过 `ctx.get('transport').upgrade(path, handler)` 添加认证 WebSocket。所有注册器返回清理函数，使用 `ctx.effect()` 绑定到插件生命周期。

## 实现边界

- Ghostty 使用 [coder/ghostty-web](https://github.com/coder/ghostty-web) 的 WASM 终端核心 + Canvas 渲染，并非嵌入 Ghostty.app 的原生 Metal 渲染器。PTY 是真实 Shell，可运行 CLI / TUI。
- One Dark Pro 是配色实现，不是直接加载 VS Code 的 One Dark Pro 扩展。Git、Remote 也是本 IDE 的插件实现，不加载 Microsoft 扩展。
- Ghostty 0.4 的动态主题设置不完整，适配器在公开渲染接口转换调色板 RGB；显式 true-color 若恰好等于原调色板色也会跟随切换。保留 WASM 状态、滚动历史与 PTY。
- 文本编辑器使用 CodeMirror 6 与 TextMate 语法高亮，支持工作区搜索、文件创建和重命名；尚未提供完整 LSP 与 VS Code 扩展宿主。
- HTML 显示静态内联样式与 data 图片，不执行脚本或加载外部资源；Markdown 链接暂不导航，暂不解析本地相对图片。PDF 阅读能力由浏览器 / WebKit 内建查看器提供。
- 文件上限 16 MB；单实例最多 16 个终端；一个服务实例维护一个活动工作区。只建议每实例打开一个客户端。
- 保存冲突检测为写入前内容校验，不是跨进程事务锁。正在被其他程序高频改写的文件应避免同时保存。
- 热更新恢复编辑状态并重连原 PTY；这不等于退出整个应用后继续运行终端任务。主题、快捷键和布局配置持久化。
- 此构建针对本机 Apple Silicon Mac，已内置 Node 并进行本地 ad-hoc 签名；未做 Apple Developer ID 签名、公证，不是 App Store 或跨平台发行版。

## 验证

`npm test` 的 10 项测试通过：插件回滚与释放、文件边界与保存冲突 / Git、SSH 协议（本地模拟传输、含引号与中文路径）、API 认证 / Origin 校验 / 实际 PTY / 工作区切换、主题适配器。

Playwright 已实际验证 Markdown 渲染、编辑保存、Ghostty 命令输出、混合标签、Light / Dark、HTML 与 PDF 预览。截图位于 `output/playwright/`。已启动安装在 /Applications 的原生应用，并在窗口内运行 printf，确认出现 MAC_APP_OK；界面与真实 PTY 均正常。没有提供远程主机，尚未进行真实 SSH 端到端连接测试。

完整应用包包含当前架构的 Node、macOS PTY、ws 和约 1.2 MB 前端。前端开发依赖及其他平台二进制不装入应用；WebKit 使用系统组件。`node scripts/verify-app.mjs` 会把应用搬到随机目录，以不含系统 Node 的 PATH 验证签名、HTTP 服务、真实终端和图标一致性。

## macOS 打包验证

`npm run app` 生成可移动应用。`node scripts/verify-app.mjs` 验证迁移后的独立运行；`codesign --verify --deep --strict "build/Harness IDE.app"` 验证完整包签名。修改前端、后端或图标后重新构建，不能直接编辑已签名应用内的资源。

## 编辑区和 File 菜单

源码编辑器显示行号，复用 VS Code TextMate 语法与本机 One Dark Pro / Light+ 配色。支持 Markdown 中的 HTML 和常见代码块。

macOS File 菜单包含 New Text File、New File、Open、Open Folder、Open Recent、Save、Save As、Save All；没有新窗口和多文件夹工作区菜单。Open 与 Save As 使用原生选择框，最近打开列表保存在应用偏好中。Command+N 新建未命名文本，Command+O 打开文件，Command+Shift+S 仍然是全部保存。

## Live plugin updates

Run `npm run hot:watch` during local development, or `npm run hot` to build and publish once. A successful build is copied to an immutable release under `~/.hot_plugging/hot-updates`; the current pointer changes atomically. Failed builds never replace the running release. The app checks for updates every two seconds. Plugins → Check for Updates shows the current state.

- CSS is replaced in place, without reloading the page.
- Frontend plugin code uses a stateful page handoff. Open text/image documents, unsaved contents, image undo history, CodeMirror selections/history, tab names/pins/order and split layouts are restored. The server retains the same PTY and running process; reconnect replays its buffered output.
- Filesystem, Git and settings backend plugins are replaced in the existing server, with rollback if activation fails.
- Failed frontend startup automatically returns to the previous UI. Releases remain available for rollback.
- Updates defer while a dialog is open, during inline rename, when a serialized image/undo history exceeds browser checkpoint storage, or when the terminal replay exceeds 16 MB. Nothing is silently discarded or saved. Disabling a plugin with open dependent content is deferred.
- Native Swift, Node/dependency changes, the server transport/PTY owner and kernel changes are host-runtime upgrades and require a new host process. Existing jobs are left running. An older app without this update receiver needs a one-time restart to load it; installing a new bundle cannot inject code into the old process.

`HARNESS_UPDATES_DIR` isolates release storage for tests. Do not change the release pointer to untrusted files. The hot update API uses the same local bearer authentication as other APIs.

## Git 提交范围

仓库保留源码、依赖锁文件、必要静态资源、测试和文档。`.gitignore` 排除 `user/` 个人设置、`history/` 历史、`hot-updates/` 运行发布缓存、`output/` 本机测试输出、`node_modules/`、`build/`、`dist/`、应用包、日志以及 `.env` 和密钥文件。实际用户工作区不随源码上传。
