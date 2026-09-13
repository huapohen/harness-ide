# Recent UI regression review

Reviewed the recent sidebar, settings, editor scrolling, tab handling, Git, HTML navigation, file/session persistence, and hot-update changes.

## Fixed

- Each sidebar render now owns a fresh DOM target. A delayed Git response cannot replace another panel, or restore its old context menu and styles.
- Git commit-message drafts survive refresh and staging during the current app run, with separate drafts for each repository. Successful commits clear the relevant draft; failed commits retain it. Completed actions no longer force the user back to Git after switching panels.
- Rapidly collapsing a directory while it is still loading discards that expansion's result. Reopening cannot append stale duplicate rows.
- Inline rename rejects duplicate submission while its filesystem request is pending and clears an old validation error when editing the name.
- Dragging a top-bar tab accounts for horizontal scrolling. An unrelated pointer release cannot complete an active drag.
- Batch close rechecks pins after save prompts and leaves newly pinned documents open.

## Validation

- All 115 automated tests passed, including added coverage for detached sidebar rendering, Git draft retention/repository isolation, and pointer ownership.
- The production build and hot publication passed.
- Native application checks: Explorer context menu, inline rename and Escape cancellation, Git draft retention after refresh, and switching to Settings during a Git refresh. The temporary test draft was cleared; no user file was renamed, staged, or committed.
- Existing automated coverage includes file/history/session storage, symlinks, settings, HTML path resolution, preview-tab protection, and update/terminal preservation.

The audit does not establish that all bugs are absent. Physical trackpad pressure, every remote SSH environment, and every external HTML page were not exhaustively exercised. The app was not killed or restarted, so active terminal tasks were preserved.
