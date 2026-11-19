#!/bin/sh
set -eu
# Project-local fallback only; no system packages or global configuration changes.
if node -e 'const [major,minor]=process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 12) ? 0 : 1)' 2>/dev/null; then exit 0; fi
if [ -x .data/runtime/bin/node ]; then exit 0; fi
mkdir -p .data/runtime
case "$(uname -m)" in x86_64) arch=x64 ;; aarch64) arch=arm64 ;; *) exit 1 ;; esac
curl -fsSL "https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt" -o .data/runtime/SHASUMS256.txt
file=$(python3 -c "from pathlib import Path; print(next(line.split()[1] for line in Path('.data/runtime/SHASUMS256.txt').read_text().splitlines() if line.endswith('-linux-$arch.tar.xz')))")
curl -fsSL "https://nodejs.org/dist/latest-v22.x/$file" -o ".data/runtime/$file"
python3 -c "import hashlib; from pathlib import Path; p=Path('.data/runtime/$file'); expected=next(line.split()[0] for line in Path('.data/runtime/SHASUMS256.txt').read_text().splitlines() if line.endswith('$file')); assert hashlib.sha256(p.read_bytes()).hexdigest()==expected"
tar -xJf ".data/runtime/$file" -C .data/runtime --strip-components=1
rm ".data/runtime/$file"
