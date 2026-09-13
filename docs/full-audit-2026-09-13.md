# Full repository check — 2026-09-13

## Results

| Check | Result |
| --- | --- |
| JavaScript / MJS syntax | 128 files passed |
| Automated suite | 120 tests passed, 0 failures (baseline: 115) |
| Production build | Passed; existing large-chunk warning remains |
| Native host source | `xcrun swiftc -typecheck native/App.swift` passed |
| Installed app verification | Relocated copy: signature, bundled Node, HTTP, real PTY, icon all passed |
| Dependency advisories | `npm audit`: 0 known vulnerabilities at check time |
| Live hot update | `6be8c59c005e6ee96f9b`; Plugins reported “Up to date” |
| Formatting / whitespace | `git diff --check` passed |

## Issues fixed

1. **Concurrent save conflict protection.** Two writes using the same prior version could both pass validation and overwrite each other. Version validation and writing now share a per-file queue. Inode identity also covers symbolic and hard-link aliases. A reproduced two-success case now permits one success and rejects stale writes. This coordinates this app's requests; unrelated external programs do not participate in its queue.
2. **History restore race.** Restoring an older revision now rechecks the current version immediately before writing, after its backup step. It preserves a new save that occurs during backup. External history reads use one byte snapshot for both content and version.
3. **Repeated opens.** Concurrent opens of the same file share the in-progress load, avoiding duplicate editor initialization and leaked listeners. Explicit split and untitled-document creation remain independent; failed loads can be retried.
4. **Closed Office previews.** A conversion completing after its tab is closed no longer creates a retained object URL for a detached preview.
5. **Preview plugin protection.** Uppercase and mixed-case file extensions now receive the same protection against disabling an in-use HTML, Markdown or PDF plugin.
6. **Rename versus update.** Hot update waits for the Explorer's inline rename input, just as it waits for dialogs. Native UI verification kept the old frontend and input intact during publication, then completed the update after Escape cancellation.
7. **HTML navigation errors.** A failed older navigation request can no longer place an error over a newer successful page or append an error after the preview is detached.
8. **Markdown Save As.** The `.markdown` suffix retains the preview shortcut when used as a Save As destination.

## Coverage and limits

Reviewed the frontend document/editor/tab flows, settings and plugin lifecycle, local file/version/history/session storage, search and HTML navigation, update paths and app packaging. The existing automated suite additionally covers terminal input/fit/mouse behavior, symlinks, clipboard/import paths, retention, sticky scopes and preview protection.

The app-package test ran an isolated copy with a temporary home directory and a separate test PTY. The user's running app and terminal processes were not restarted or terminated. Concurrent-save and history-restore reproduction used temporary files that were removed afterward. The live rename check was cancelled without renaming the file; temporary Plugins button visibility was restored.

This is a broad regression check, not a proof that every possible bug is absent. Real remote SSH servers, physical trackpad pressure, every Office format/converter combination, disk-full/power-loss behavior and arbitrary third-party HTML were not exhaustively exercised. The installed native base was verified separately from the latest hot-loaded frontend/backend.
