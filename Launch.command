#!/bin/bash
set -e
cd "$(dirname "$0")"
if [ -d '/Applications/Harness IDE.app' ]; then
  open '/Applications/Harness IDE.app'
  exit 0
fi
if [ ! -d node_modules ]; then npm ci; fi
if [ ! -x 'build/Harness IDE.app/Contents/MacOS/HarnessIDE' ]; then npm run app; fi
open 'build/Harness IDE.app'
