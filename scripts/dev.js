import { spawn } from 'node:child_process';
const children = [
  spawn(process.execPath, ['apps/api/server.js'], { stdio: 'inherit', env: process.env }),
  spawn('npm', ['run', 'dev', '--workspace', 'apps/web'], { stdio: 'inherit', env: process.env }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
for (const child of children) {
  child.on('error', (error) => {
    console.error(error);
    stop(1);
  });
  child.on('exit', (code) => stop(code || 0));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
