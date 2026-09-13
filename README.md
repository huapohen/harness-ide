# Harness IDE

轻量 macOS IDE：AppKit 原生窗口、系统 WKWebView、Node.js 本地服务，文本编辑器使用 CodeMirror 6。插件设计参考 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)。没有 Electron、Monaco 或 VS Code 扩展宿主。

## 启动与开发

本机应用安装在 `/Applications/Harness IDE.app`，可通过 Finder 或 Spotlight 启动。应用包包含 Node 和运行资源，不要求另外安装 Node/npm。首次启动会把示例复制到 `~/Library/Application Support/Harness IDE/example`。通过 File → Open Folder 或 Remote Explorer → Open Local Folder 切换工作区。

从源码开发需要 Node.js 22+；macOS 打包另需 Xcode Command Line Tools。

```sh
npm ci

# 构建独立 macOS 应用：build/Harness IDE.app
npm run app

# 为已安装且支持热更新的应用发布修改
npm run hot

# 持续监听源码并发布热更新
npm run hot:watch

# 浏览器模式：打开终端输出的完整本机 URL
npm run build
npm start

# 指定浏览器模式工作区
WORKSPACE=/absolute/path/to/project npm start

# 自动化测试
npm test
```

`npm run dev` 是构建前端后监视后端的开发模式，后端重启会影响该实例的终端任务。日常修改已运行应用的界面优先用 `npm run hot`。服务只监听 `127.0.0.1`，每次启动生成访问令牌。

## 界面与文件

- 左侧目录树保留层级缩进、不显示竖向引导线，支持文件夹滚动固定、文件操作和工作区搜索。右键菜单提供新建文件、文件夹、刷新及 **Collapse Folders in Explorer**；顶部四个操作按钮已移除。
- 最左侧功能栏支持排序；设置按钮固定在最下方，默认隐藏，悬停或键盘聚焦时显示。
- View 菜单控制功能栏、左侧栏、右侧栏、状态栏和标题栏。右侧栏及编辑器分屏边界可拖动调整；布局配置持久化。
- 文件与终端共享标签栏。固定标签用爱心替换关闭按钮，点击爱心取消固定。未保存文件用圆点替换关闭按钮，标签不会因此变宽。
- 从 Finder 拖文件到中央文件区会打开原文件；拖到目录树会复制进工作区。
- 文本使用 CodeMirror 6 和 TextMate 语法高亮，支持 SSH config、SQL 及常见代码。提供查找、替换、正则、保持大小写和全部匹配项选择。
- 所有文本编辑器均启用作用域吸顶（最多五行），保留源码颜色、缩进和行号，支持横向滚动同步、点击跳转和编辑后更新。Markdown 按标题层级识别；代码与配置文件按结构识别，详见下表。Markdown 预览支持标题目录和代码块语法高亮；表格采用统一雾灰底色及暗色网格。代码块和引用使用灰色背景。
- 支持图片查看与编辑、PDF 阅读、受限 HTML 预览；CSV 可编辑或按表格查看。
- Word、PowerPoint、Excel 等 Office 文件通过 LibreOffice 转换为 PDF 预览，不提供 Office 原生编辑。此功能需要可用的 LibreOffice，可通过 `HARNESS_SOFFICE` 指定程序路径。
- 设置中可分别配置编辑器、侧栏、底部终端字号，另有字体、目录树和 Markdown 文字颜色、主题等选项。
- 文件保存前检查版本，防止覆盖外部修改。未保存文件关闭时可选择保存、不保存或取消。运行任务的终端受到关闭保护。

## 编辑器吸顶范围

[VS Code Sticky Scroll](https://code.visualstudio.com/docs/editing/getting-started/userinterface#sticky-scroll) 使用大纲、折叠范围和缩进模型逐级回退，并非只支持 Markdown、Python。Harness 的每个文本编辑器（含分屏）都挂载吸顶功能；没有可识别的嵌套结构时不显示空栏。

| 文件类型 | 识别结构 |
| --- | --- |
| Markdown | ATX / Setext 标题层级，排除围栏代码块中的标题 |
| Python / PYw | 类、同步或异步函数、条件、循环等缩进块；支持跨行参数，跳过多行字符串和注释 |
| JS / TS / JSX / TSX、C / C++ / C#、Java、Go、Rust、Swift、Kotlin、PHP 等 | 花括号、数组和缩进块；独占一行的花括号尽量关联前一行声明 |
| JSON / JSONC / JSONL、CSS / SCSS / Less | 对象、数组、样式块和缩进结构 |
| HTML / XML / SVG / Vue / Svelte、JSX / TSX | 嵌套标签，排除注释和自闭合标签 |
| Shell / Bash / Zsh、Ruby、SQL、Lua | 关键字块以及缩进结构 |
| YAML、INI、TOML、SSH config | 缩进、节标题或 Host / Match 分组 |
| 其他文本文件 | 通用缩进回退，支持显式 region / endregion 区域 |

吸顶从原文复用语法高亮，未引入另一套颜色。示例见 [sticky-scroll-demo.py](example/sticky-scroll-demo.py)。结构识别是轻量规则，不是完整语言服务器；复杂嵌入语言、模板和特殊语法可能与 VS Code 扩展的大纲结果不同。当前没有 VS Code 扩展宿主，因此不宣称兼容所有第三方大纲提供者。

## 快捷键与本地配置

**仓库直接跟踪 [user/keybindings.json](user/keybindings.json)**，这是本机使用的快捷键配置，包含定制的单独 Shift+字母绑定。完整按键表及适用范围见 [KEYBINDINGS.md](KEYBINDINGS.md)。

| 快捷键 | 功能 |
| --- | --- |
| Command+Shift+E / Command+B | 显示 / 隐藏左侧栏 |
| Option+Command+B | 显示 / 隐藏右侧栏 |
| Command+A | 显示 / 隐藏底部终端 |
| Command+Shift+Z | 终端最大化 / 恢复 |
| Command+E | 新建终端 |
| Command+S / Control+S | 保存当前文件 |
| Command+W | 关闭当前未固定标签 |
| Shift+Option+W / Command+Shift+W | 关闭所有未固定标签 |
| Command+3 | 固定 / 取消固定标签 |
| Command+D / Command+Shift+2 | Markdown 源码 / 预览切换 |
| Command+Shift+P | 命令面板 |
| Command+, | 键盘快捷键设置 |

`Command+A` 和 `Command+Shift+Z` 是本项目的定制绑定，分别用于终端显示和最大化；全选用 `Control+A`，重做用 `Control+Shift+Z` 或 `Command+Y`。单独 Shift+字母会在文本编辑器中执行对应命令，占用这些大写字母的输入组合，可在设置中改绑。

默认读取 `~/.hot_plugging/user/keybindings.json`，可用 `HARNESS_SETTINGS_DIR` 指定其他配置目录。若将仓库克隆到 `~/.hot_plugging`，仓库文件就是实际配置；克隆到其他位置时，应把该 JSON 放到实际配置目录才会生效，注意保留已有个人修改。

设置 → 键盘快捷键支持搜索、录制、修改和打开 JSON。磁盘配置每两秒重新读取，无需重启。JSON 是完整绑定数组，不与默认值自动合并；校验失败会保留上一次有效配置。配置不存在时由 [shared/keybindings.js](shared/keybindings.js) 创建默认值。“恢复默认”也使用这份源码默认配置。

此文件纳入 Git 后，修改快捷键会产生 Git 差异，拉取更新时需要处理可能的冲突。`user/` 中的布局、插件状态等其他配置仍不上传；根目录的 `keybindings.json` 副本也仍被忽略。

## Git、SSH 与插件

Git 面板支持仓库状态、初始化、diff、暂存、取消暂存和提交。push、pull、分支管理可使用终端 Git CLI。

Remote Explorer 从 `~/.ssh/config` 读取主机，点击主机或加号连接，配置按钮直接打开 SSH config 编辑。远端需要 Python 3，Git 操作还需 Git；文件访问采用 OpenSSH BatchMode，应先在系统终端验证主机指纹和密钥认证。工作区切换会经过标签和终端关闭保护。**目前实现 SSH，尚未实现 Remote Tunnels。**

插件面板支持分类、搜索、启用、禁用、卸载与重新安装；核心插件受依赖保护。禁用保留安装文件，卸载删除独立安装副本；共享依赖和内置发行资源可能保留。本 IDE 不直接加载 VS Code 或 Microsoft Remote 扩展。

## 热更新与资源回收

`npm run hot` 发布到 `~/.hot_plugging/hot-updates` 的独立版本目录，并原子切换当前版本指针。应用每两秒检查更新；在插件页面查看更新状态。

- CSS 原地替换；前端代码更新通过状态迁移恢复标签、未保存内容、选区、编辑历史和分屏，重连原有 PTY。
- 文件系统、Git 和设置后端插件可在现有服务内替换。更新失败时保留或回退原版本。
- 对话框、未完成重命名或状态超过保存上限时延后更新。
- Swift、Node、依赖和核心服务变更属于宿主升级，需要新进程；不能通过替换应用包改变仍在运行的旧进程。
- 语法缓存有大小上限，并清理闲置缓存。旧热更新版本会按年龄和保留规则回收，保护当前、已报告仍在使用的版本及依赖。不会自动删除用户文件或本地历史。
- JavaScript / WebKit 负责垃圾回收；缓存释放不保证系统显示的内存占用立即下降。

可通过 `HARNESS_UPDATES_DIR` 隔离测试发布目录。完整应用退出与热更新不同，不保证退出后终端任务继续运行。

## 架构与验证

主要目录：`native/` 原生窗口，`src/plugins/` 前端插件，`server/` 本地服务和后端插件，`shared/` 共用逻辑，`tests/` 自动化测试。前后端组合分别由 `plugins.config.js` 和 `server/plugins.config.mjs` 管理。插件注册的事件、服务和定时器应在卸载时释放。

`npm test` 覆盖插件生命周期、文件保存冲突、搜索、快捷键、PTY、热更新、缓存回收等；测试数量以当前输出为准。真实 SSH 主机连通性仍需在目标环境验证。

```sh
# 打包后验证迁移运行、服务和终端
node scripts/verify-app.mjs
codesign --verify --deep --strict "build/Harness IDE.app"
```

应用使用系统 WebKit 和 ghostty-web WASM 终端，不是 Ghostty.app 原生 Metal 渲染器；目前未提供完整 LSP、VS Code 扩展宿主或多文件夹工作区。HTML 预览受安全限制，Office 预览依赖外部转换器。本机 macOS 包采用 ad-hoc 签名，未做 Developer ID 公证。第三方资源及许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 和 `native/licenses/`。

## Git 提交范围

提交源码、依赖锁文件、必要静态资源、测试、文档以及明确共享的 `user/keybindings.json`。忽略其余个人配置、`history/`、`hot-updates/`、`output/`、依赖安装目录、构建产物、应用包、日志、`.env` 和密钥文件；实际用户工作区不随源码上传。

Markdown 文件默认以编辑模式打开。标签右键可选择`Edit Mode` 或 `Preview Mode`；右上角不再显示模式切换图标。切换使用当前内容，保留未保存修改。

目录树单击文件会复用一个临时标签，避免标签持续增长。单击顶部文件标签或按 `Command+3` 可固定；双击顶部文件名仍可重命名。固定、未保存、分屏中的文件不会被临时标签替换。标签右键的 `Edit Mode` / `Preview Mode` 用于切换编辑和预览。

### 退出与恢复文件会话

固定标签不能通过任何 Close 操作关闭，必须先 Unpin；批量关闭只处理未固定标签。正常退出应用不会清空文件标签。重新启动会恢复上次工作区的文件、顺序、固定状态、当前标签、编辑/预览模式及文件分屏；未保存文本和新建文本也会备份，已保存文件重新读取磁盘最新内容。

会话自动写入 `~/.hot_plugging/user/sessions/`（本地私有文件，Git 忽略），变更约 750 毫秒后落盘，正常退出会等待最后一次写入。强制结束或突然断电只能恢复最近已写入的状态，不应作为清空标签的方法。要下次空白，先取消固定并关闭所有文件，再退出。备份超过 23 MB 或写入失败时不会允许正常退出，以免丢失修改。

终端进程不属于文件恢复：运行中任务继续受到退出保护；完整退出后不会自动重跑终端命令。热更新仍保留正在运行的 PTY。

本地瘦身：macOS 安装依赖时会移除 node-pty 的 Windows 预编译组件；会话备份只保存恢复所需的内容与选区，不重复序列化撤销历史。暂时无法读取的文件保留恢复记录，后续启动可重试。旧构建可在独立安装包验证后删除，热更新清理保留运行版本、安装包基础版本、插件引用及最近回退版本；用户配置不清理；文件历史和会话记录按下述保留规则自动管理。

### 备份自动保留规则

- 文件历史：保留 30 天，每个文件最多 50 个版本；所有工作区合计最多 200 MiB（索引及去重后的内容），超限时先删最旧记录，再删无人引用的内容。每次创建历史后检查，并在启动和每小时巡检。
- 会话：每个工作区仍覆盖保存一份；90 天未读写的非当前工作区记录自动清理。当前工作区、含未保存内容的备份不会自动过期，损坏或无法识别的记录也会保留，避免误删。
- 用户配置不受上述清理影响。包含未保存内容的备份需要先恢复并保存或明确丢弃，才会成为可过期记录。

### Auto Save

File → Auto Save 可勾选或取消，默认关闭。开启后，停止编辑约 1 秒自动保存已命名文件（包括固定标签），关闭后仍可手动保存。开关保存在 `~/.hot_plugging/user/layout.json` 的 `autoSave` 字段，重启后保留。未命名文件需先手动 Save As；需要转换格式的图片不会自动弹出另存为。磁盘内容冲突或写入失败会保留未保存状态，不覆盖外部修改。

图片编辑的「文字」工具直接在图片上显示输入框，拖动「拖动文字」改变位置；下方字号、颜色设置条也可独立拖动。点击「应用」合入图片，可撤销；保存会应用当前文字草稿，未应用草稿也会随会话恢复。尺寸调整位于工具栏内，不遮挡图片。目录树图标再次点击可隐藏/显示当前侧栏。

隐藏标题栏后，顶部留白及标签栏空白区域仍可拖动窗口，双击可缩放窗口；标签与按钮保留各自操作。

设置中的「终端光标颜色」提供粉色（默认）、灰色、蓝色、绿色、黄色、白色预置，也可输入自定义 `#RRGGBB`。立即应用于已打开的终端，保存在 `user/layout.json` 的 `font.cursorColor`，重启和主题切换后保留。光标保持不闪烁、上下居中。

- 文件树和标签栏：Shift 点击连续范围多选，Command 点击逐项多选，Command+Shift 点击追加范围。
- 编辑器 Tab 缩进为 4 个空格（约两个中文字符宽），Shift+Tab 反向缩进。Command+↑/↓ 与 Option+↑/↓ 均移动当前行或选中的多行；仅在文本编辑器聚焦时生效。

- 本地 Explorer 支持 `ln -s` 创建的文件及文件夹链接，包括指向工作区外的目录；右侧以9px、低对比度的 `↪` 标记链接，悬停可查看失效链接提示。目录按需展开，链接内文件可编辑保存；删除或重命名链接本身不会删除或重命名目标。

- 文件树始终预留滚动条位置，展开文件夹时不会因滚动条出现而改变内容宽度；关闭浏览器自动滚动锚定，避免展开时位置跳动。

- HTML 静态预览支持点击本地子 HTML 链接，按当前页面所在目录解析相对路径，并支持页面锚点；读取失败会显示错误。预览继续禁用页面脚本，不等同于完整浏览器运行环境。
