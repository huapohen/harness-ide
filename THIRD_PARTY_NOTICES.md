# References and dependencies

Architecture inspiration: DeepSeek Harness (DeepSeek AI), https://github.com/deepseek-ai/deepseek-harness — MIT. No dsh source code or branding assets copied.

- ghostty-web 0.4.0 — Coder, MIT; https://github.com/coder/ghostty-web. Bundles a WebAssembly build of the Ghostty terminal core (MIT).
- node-pty 1.1.0 — Microsoft / contributors, MIT.
- ws 8.21.3 — MIT.
- marked 15.0.12 — MIT.
- DOMPurify 3.4.15 — Apache-2.0 OR MPL-2.0.
- Vite 6.4.3 — MIT.

Exact dependency graph and integrity hashes: package-lock.json. Full upstream license texts are included within installed node_modules packages. One Dark Pro-inspired colors are configured locally; no VS Code extension package is distributed.

The standalone macOS package includes Node.js v24.15.0 (MIT and bundled third-party licenses), with its license text in Contents/Resources/Licenses/Node.txt. The application icon is an exact copy of Code.icns from the locally installed Microsoft Visual Studio Code, selected explicitly for this user's local application. Visual Studio Code and its icon belong to Microsoft; this application is named Harness IDE and is not a Microsoft product.

## Codicons

Activity Bar icons use Microsoft VS Code Codicons (MIT), bundled from the locally installed Visual Studio Code. https://github.com/microsoft/vscode-codicons

## Editor syntax highlighting

Uses vscode-textmate and vscode-oniguruma (MIT), Markdown and embedded-language grammars and Light+ token colors from the locally installed Microsoft VS Code, and One Dark Pro token colors from zhuangtongfa.material-theme 3.20.2. License files are bundled in the application Licenses directory. Source themes and grammars are retained in public/syntax.

## Explorer file icons

VS Code Seti file icon font and associations are copied from the locally installed theme-seti extension. Its ThirdPartyNotices are included as Licenses/Seti.txt. Toolbar and tree chevrons use VS Code Codicons.

CodeMirror 6 and its Lezer, style-mod, w3c-keyname and crelt dependencies are MIT licensed; license copies are included in the application Licenses directory.
