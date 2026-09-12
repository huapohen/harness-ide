# Harness IDE 快捷键

本表对应仓库 `shared/keybindings.js` 的默认配置；发布前已与本机生效配置核对一致。它包含按用户习惯定制的绑定，并非 VS Code 原始默认快捷键。`Command` = `⌘`，`Control` = `⌃`，`Option` = `Alt` = `⌥`，`Shift` = `⇧`。

## 文件与标签

| 快捷键 | 功能 |
| --- | --- |
| Command+N | 新建文本文件 |
| Command+O | 打开文件 |
| Command+S / Control+S | 保存当前文件 |
| Command+Shift+S | 保存所有文件 |
| Command+W | 关闭当前未固定标签；当前标签已 pin 时不关闭 |
| Shift+Option+W / Command+Shift+W | 关闭所有未固定标签，保留 pin 标签 |
| Command+3 | 固定 / 取消固定当前标签 |
| Command+1 / Command+2 | 循环切换前一个 / 后一个标签 |
| Command+D | Markdown 源码 / 预览切换 |
| Command+Backspace | 删除目录树中选中的项目（目录树获得焦点时） |

关闭未保存文件时提供保存、不保存、取消；有运行任务的终端受到关闭保护。pin 的保护针对上述快捷键；固定后关闭按钮的位置显示爱心，点击爱心取消固定；右键显式关闭操作仍可关闭固定标签。

## 布局与设置

| 快捷键 | 功能 |
| --- | --- |
| Command+B | 显示 / 隐藏左侧内容栏；点击最左边的功能图标可恢复内容栏 |
| Option+Command+B | 显示 / 隐藏右侧栏 |
| Command+A | 显示 / 隐藏底部终端，没有终端时创建会话 |
| Command+Shift+Z | 底部终端最大化 / 恢复 |
| Command+Shift+P | 命令面板 |
| Command+, | 键盘快捷键设置 |
| Command+K，然后 Command+S | 键盘快捷键设置（连续两段） |
| Command+- | 缩小界面 |
| Command+= / Command+Shift+= | 放大界面 |
| Command+0 | 重置界面缩放 |

此配置中 **Command+A 是底部终端开关，Control+A 才是全选；Command+Shift+Z 是终端最大化，Control+Shift+Z 才是重做**。

## 编辑与查找

| 快捷键 | 功能 / 范围 |
| --- | --- |
| Command+Z / Control+Z | 撤销，文本输入或图片编辑获得焦点时 |
| Control+Shift+Z / Command+Y | 重做，文本输入或图片编辑获得焦点时 |
| Command+C / Control+C | 复制；文本编辑器无选区时复制当前行 |
| Command+X / Control+X | 剪切；文本编辑器无选区时剪切当前行 |
| Command+V / Control+V | 粘贴 |
| Control+A | 全选 |
| Command+F | 当前文件查找 |
| Command+Option+F | 当前文件替换 |
| Command+Shift+F | 工作区搜索 |
| Option+Enter | 编辑器或查找框中选中全部匹配项 |
| Command+Shift+L | 编辑器中选中全部匹配项 |
| Command+L | 选中当前行 |
| Command+/ | 切换行注释 |
| Control+D / Shift+Option+↓ | 复制当前行 |
| Command+Shift+K / Shift+D | 删除当前行 |
| Option+↑ / Option+↓ | 上移 / 下移当前行 |
| Command+Enter / Command+Shift+Enter | 在下方 / 上方插入空行 |

行操作只在文本编辑器获得焦点时生效。

## 单独 Shift+字母

以下是专门配置的编辑器快捷键，**不需要 Command 或 Control**。仅在文本编辑器获得焦点时生效；按这些组合会执行命令，不能用它们输入相应的大写字母。可在快捷键设置中移除或改绑。

| 快捷键 | 功能 |
| --- | --- |
| Shift+Z / Shift+V | 光标向上 / 向下移动一页 |
| Shift+X / Shift+C | 光标上移 / 下移一行 |
| Shift+N / Shift+M | 光标左移 / 右移一个字符 |
| Shift+Y / Shift+U | 向左 / 向右扩展选区至词组边界 |
| Shift+H / Shift+L | 光标移到行首 / 行尾 |
| Shift+J / Shift+K | 光标移到左侧 / 右侧词组边界 |
| Shift+I / Shift+P | 向后删除 / 向前删除一个字符 |
| Shift+O | 换行并自动缩进 |
| Shift+F | 在下方插入空行 |
| Shift+D | 删除当前行 |

词组移动使用当前编辑器的边界规则，未承诺与 VS Code 所有语言的词尾判断完全一致。

## 终端

| 快捷键 | 功能 |
| --- | --- |
| Command+E | 新建终端 |
| Command+A | 底部终端显示 / 隐藏，保留会话 |
| Command+Shift+Z | 底部终端最大化 / 恢复 |
| Command+C | 复制选中的输出 |
| Control+C | 有选区时复制；无选区时发送中断信号 |
| Command+V / Control+V | 粘贴 |
| Control+D | 发送 EOF；Shell 实际退出后移除标签 |

Control+D 遵循前台程序的 EOF 行为，例如先结束 `cat` 再回到 Shell，不会直接强杀任意程序。终端输出只读，剪切输出等同于复制。运行中、后台或暂停任务的终端受到关闭保护；不能确认状态时保留会话，可在 Shell 中正常退出。

## 修改与保存绑定

在设置 → 键盘快捷键中搜索命令、录制按键、修改条件、删除绑定或恢复默认。「打开 JSON」可编辑 `~/.hot_plugging/user/keybindings.json`，保存后应用会重新读取，无需重启。无效 JSON 或条件会保留上次有效配置。

个人配置保存在被 Git 忽略的 `user/` 内，不上传到仓库。新安装使用源码默认绑定；已有个人配置是完整数组，不会因源码增加默认绑定而自动合并。需要同步时可在设置中恢复默认（会替换个人绑定）。

## JSON 格式

这是一个完整绑定数组（不是与默认配置合并的覆盖片段）：

```json
[
  { "key": "cmd+e", "command": "terminal.new", "when": "!dialogFocus" },
  { "key": "cmd+w", "command": "tabs.close", "when": "!dialogFocus" },
  { "key": "ctrl+d", "command": "editor.duplicateLine", "when": "editorTextFocus" },
  { "key": "ctrl+d", "command": "terminal.eof", "when": "terminalFocus" }
]
```

上述是格式示例，覆盖整个文件会仅保留这 4 条规则。日常改键只修改对应的一条即可。

`cmd` / `command` / `meta` 等价；`ctrl` / `control` 等价；`alt` / `option` 等价。修饰键可以组合，连续两段按键用空格分隔，例如 `cmd+k cmd+s`。组合键等待时间为 1.8 秒，Escape 取消。

`when` 支持这些布尔上下文及 `!`、`&&`、`||`、括号：

- `editorTextFocus`：文本 / JSON 源码编辑器获得焦点。
- `imageFocus`：图片编辑器获得焦点。
- `explorerFocus`：目录树获得焦点。
- `findInputFocus`：查找输入框获得焦点。
- `terminalFocus`：终端获得焦点。
- `terminalHasSelection`：终端选中了输出。
- `textInputFocus`：任意输入框或文本编辑器获得焦点。
- `fileTabActive`：当前标签为文件。
- `tabActive`：存在当前标签。
- `dialogFocus`：有对话框打开。
- `true` / `false`：恒真 / 恒假。

同键且条件均匹配时，数组最后一条获胜。JSON 采用严格 JSON，不支持注释或尾随逗号。命令 ID 可在设置中悬停行查看；这是本应用的命令与条件集合，不是完整的 VS Code 命令、when 语法或扩展宿主。
