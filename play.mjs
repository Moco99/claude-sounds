#!/usr/bin/env node
// ─────────────────────────────────────────
// Sección: Cross-platform sound player
// ─────────────────────────────────────────
// Zero dependencies. Used by the Claude Code hooks so the same hook command
// works on macOS, Linux and Windows. Always exits 0: a missing player or file
// must never break or slow down a Claude Code session.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const file = process.argv[2];
if (!file || !existsSync(file)) process.exit(0);

// Windows: MediaPlayer handles mp3/wav/m4a. The path travels through an env
// var to avoid PowerShell quoting issues.
const WINDOWS_SCRIPT = [
  'Add-Type -AssemblyName presentationCore;',
  '$p = New-Object System.Windows.Media.MediaPlayer;',
  '$p.Open([uri]$env:CLAUDE_SOUND_FILE);',
  '$p.Play();',
  'for ($i = 0; $i -lt 50 -and -not $p.NaturalDuration.HasTimeSpan; $i++) { Start-Sleep -Milliseconds 100 }',
  'if ($p.NaturalDuration.HasTimeSpan) { Start-Sleep -Seconds ([math]::Ceiling($p.NaturalDuration.TimeSpan.TotalSeconds)) }',
].join(' ');

// Candidates are tried in order; the first one that spawns wins.
const CANDIDATES = {
  darwin: [['afplay', [file]]],
  linux: [
    ['paplay', [file]],
    ['ffplay', ['-nodisp', '-autoexit', '-loglevel', 'quiet', file]],
    ['mpg123', ['-q', file]],
    ['play', ['-q', file]],
    ['aplay', ['-q', file]],
  ],
  win32: [['powershell', ['-NoProfile', '-NonInteractive', '-Command', WINDOWS_SCRIPT]]],
};

function run([cmd, args]) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: 'ignore',
      windowsHide: true,
      env: { ...process.env, CLAUDE_SOUND_FILE: file },
    });
    child.on('error', () => resolve(false));
    child.on('exit', (code) => resolve(code === 0));
  });
}

for (const candidate of CANDIDATES[process.platform] ?? []) {
  if (await run(candidate)) break;
}
