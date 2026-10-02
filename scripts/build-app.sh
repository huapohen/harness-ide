#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
node scripts/prepare-pty.mjs
app="build/Harness IDE.app"
mkdir -p build
staging="$(mktemp -d "$PWD/build/.package.XXXXXX")"
trap 'rm -rf "$staging"' EXIT
bundle="$staging/Harness IDE.app"
resources="$bundle/Contents/Resources"
mkdir -p "$bundle/Contents/MacOS" "$resources/app/src" "$resources/app/node_modules" "$resources/runtime"
cp -R dist server example shared "$resources/app/"
cp package.json THIRD_PARTY_NOTICES.md "$resources/app/"
cp src/kernel.js "$resources/app/src/"
# Only the backend's runtime dependencies; frontend dependencies are bundled by Vite.
cp -R node_modules/ws node_modules/prettier node_modules/yaml "$resources/app/node_modules/"
mkdir -p "$resources/app/node_modules/node-pty/prebuilds"
cp -R node_modules/node-pty/lib "$resources/app/node_modules/node-pty/"
cp node_modules/node-pty/package.json node_modules/node-pty/LICENSE "$resources/app/node_modules/node-pty/"
arch="$(uname -m)"
pty_arch="$arch"
if [ "$arch" = x86_64 ]; then pty_arch=x64; fi
cp -R "node_modules/node-pty/prebuilds/darwin-$pty_arch" "$resources/app/node_modules/node-pty/prebuilds/"
chmod +x "$resources/app/node_modules/node-pty/prebuilds/darwin-$pty_arch/spawn-helper"
node_path="$(command -v node)"
if lipo -info "$node_path" | grep -q 'Architectures in'; then
  lipo "$node_path" -thin "$arch" -output "$resources/runtime/node"
else
  cp -L "$node_path" "$resources/runtime/node"
fi
strip -x "$resources/runtime/node"
chmod +x "$resources/runtime/node"
# Reject a Homebrew-linked Node rather than create a misleading standalone app.
if otool -L "$resources/runtime/node" | tail -n +2 | awk '{print $1}' | grep -Ev '^(/usr/lib/|/System/Library/)' | grep -q .; then
  echo 'Node has non-system library dependencies. Build with a self-contained official Node binary.' >&2
  exit 1
fi
"$node_path" --help >/dev/null
"$node_path" -p 'process.release.name + " " + process.version' > "$resources/runtime/VERSION.txt"
cp native/assets/AppIcon.icns "$resources/AppIcon.icns"
mkdir -p "$resources/Licenses"
cp native/licenses/Node-LICENSE "$resources/Licenses/Node.txt"
cp native/licenses/*.txt "$resources/Licenses/"
cp node_modules/ghostty-web/LICENSE "$resources/Licenses/ghostty-web.txt"
cp node_modules/marked/LICENSE.md "$resources/Licenses/marked.txt"
cp node_modules/dompurify/LICENSE "$resources/Licenses/DOMPurify.txt"
cp node_modules/dompurify/LICENSE-MPL "$resources/Licenses/DOMPurify-MPL.txt"
cat > "$bundle/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleExecutable</key><string>HarnessIDE</string>
<key>CFBundleIdentifier</key><string>local.harness.ide</string>
<key>CFBundleName</key><string>Harness IDE</string>
<key>CFBundleDisplayName</key><string>Harness IDE</string>
<key>CFBundleShortVersionString</key><string>0.3.0</string>
<key>CFBundleVersion</key><string>4</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleIconFile</key><string>AppIcon</string>
<key>CFBundleDocumentTypes</key><array>
<dict><key>CFBundleTypeName</key><string>Markdown</string><key>CFBundleTypeRole</key><string>Editor</string><key>LSHandlerRank</key><string>Alternate</string><key>LSItemContentTypes</key><array><string>net.daringfireball.markdown</string></array><key>CFBundleTypeExtensions</key><array><string>md</string><string>markdown</string><string>mdown</string></array></dict>
<dict><key>CFBundleTypeName</key><string>Text and Source Files</string><key>CFBundleTypeRole</key><string>Editor</string><key>LSHandlerRank</key><string>Alternate</string><key>LSItemContentTypes</key><array><string>public.text</string><string>public.source-code</string><string>public.json</string><string>public.xml</string></array></dict>
<dict><key>CFBundleTypeName</key><string>Preview Documents</string><key>CFBundleTypeRole</key><string>Viewer</string><key>LSHandlerRank</key><string>Alternate</string><key>LSItemContentTypes</key><array><string>com.adobe.pdf</string><string>public.image</string></array></dict>
<dict><key>CFBundleTypeName</key><string>Folders</string><key>CFBundleTypeRole</key><string>Viewer</string><key>LSHandlerRank</key><string>Alternate</string><key>LSItemContentTypes</key><array><string>public.folder</string></array></dict>
</array>
<key>UTImportedTypeDeclarations</key><array><dict><key>UTTypeIdentifier</key><string>net.daringfireball.markdown</string><key>UTTypeDescription</key><string>Markdown</string><key>UTTypeConformsTo</key><array><string>public.plain-text</string></array><key>UTTypeTagSpecification</key><dict><key>public.filename-extension</key><array><string>md</string><string>markdown</string><string>mdown</string></array><key>public.mime-type</key><string>text/markdown</string></dict></dict></array>
<key>LSMinimumSystemVersion</key><string>13.0</string>
<key>NSHighResolutionCapable</key><true/>
<key>NSPrincipalClass</key><string>HarnessApplication</string>
<key>NSAppTransportSecurity</key><dict><key>NSAllowsLocalNetworking</key><true/></dict>
</dict></plist>
PLIST
swiftc -target "$arch-apple-macosx13.0" native/App.swift -o "$bundle/Contents/MacOS/HarnessIDE" -framework Cocoa -framework WebKit
codesign --force --sign - "$resources/runtime/node"
codesign --force --sign - "$resources/app/node_modules/node-pty/prebuilds/darwin-$pty_arch/pty.node"
codesign --force --sign - "$resources/app/node_modules/node-pty/prebuilds/darwin-$pty_arch/spawn-helper"
codesign --force --sign - "$bundle"
codesign --verify --deep --strict "$bundle"
# Keep the previous build until the new package has passed signing validation.
if [ -d "$app" ]; then mv "$app" "$staging/previous.app"; fi
mv "$bundle" "$app"
printf 'Built standalone app: %s\n' "$PWD/$app"
