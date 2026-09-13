# Harness IDE live update workflow

For frontend styles and plugin changes, use `npm run hot` (or the installed `hot:watch` watcher). Do not routinely rebuild/replace `/Applications/Harness IDE.app` or ask the user to restart for UI changes. Check Plugins → hot update status or the authenticated `/api/hot/status` endpoint before reporting an update as live.

A new host process is required only for changes classified as runtime by `scripts/hot-manifest.mjs` (Swift/Node/transport/PTY owner/kernel/dependencies). Never kill user terminal tasks to apply an update. Report deferred states truthfully. Changes to CSS use in-place replacement; frontend code uses a stateful view handoff preserving PTYs; supported backend plugins replace in-process.

Build and verify the standalone app for initial installation and runtime upgrades. Do not create extra installation backups unless the user requests one. Preserve the installed application and all resources still referenced by running processes. Do not claim a bundle replacement changed the running window.

After every requested change, verify the live hot update, remove obsolete installation/build artifacts and safe-to-delete release caches from `~/.hot_plugging`, then commit and push to the personal Git remote. Preserve user settings, history, session backups, installed base resources, and any release still referenced by the running frontend, backend, or plugin packages. Do not stop active terminal jobs to reclaim a cache.

Before each commit and push, update README.md and any outdated documentation or configuration examples to match the shipped behavior.
