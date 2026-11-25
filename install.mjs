#!/usr/bin/env node
// ─────────────────────────────────────────
// Sección: claude-sounds installer
// ─────────────────────────────────────────
// Usage:
//   node install.mjs --finish <audio> --request <audio> [--settings <file>]
//   node install.mjs --uninstall [--settings <file>]
//
// Copies the two sounds into ~/.claude/claude-sounds/ and merges hooks into
// ~/.claude/settings.json. Idempotent: re-running replaces our own hooks and
// never touches hooks that belong to the user.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// ─────────────────────────────────────────
// Sección: Config
// ─────────────────────────────────────────

const MARKER = 'claude-sounds';
const SOURCE_DIR = dirname(fileURLToPath(import.meta.url));
const INSTALL_DIR = join(homedir(), '.claude', MARKER);

// Stop = Claude finished. The other two = Claude needs the user's attention.
const EVENT_TO_SOUND = {
  Stop: 'finish',
  Notification: 'request',
  PermissionRequest: 'request',
};

// ─────────────────────────────────────────
// Sección: Helpers
// ─────────────────────────────────────────

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { uninstall: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--uninstall') args.uninstall = true;
    else if (['--finish', '--request', '--settings'].includes(flag)) args[flag.slice(2)] = argv[++i];
    else fail(`Unknown argument: ${flag}`);
  }
  return args;
}

// Accepts "~/x", quoted paths and drag-and-drop style escaped spaces.
function cleanPath(raw) {
  const unquoted = raw.trim().replace(/^['"]|['"]$/g, '').replace(/\\ /g, ' ');
  const expanded = unquoted.startsWith('~') ? join(homedir(), unquoted.slice(1)) : unquoted;
  return resolve(expanded);
}

function readSettings(path) {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    // Refuse to overwrite a file we cannot parse (e.g. comments, typos).
    return fail(`${path} is not valid JSON. Fix it first, nothing was changed.`);
  }
}

function writeSettings(path, settings) {
  if (existsSync(path)) copyFileSync(path, `${path}.bak-${MARKER}`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(settings, null, 2)}\n`);
}

// Removes only the hook entries we created, keeping everything else.
function stripOurHooks(settings) {
  const hooks = settings.hooks ?? {};
  for (const event of Object.keys(hooks)) {
    hooks[event] = hooks[event]
      .map((group) => ({
        ...group,
        hooks: (group.hooks ?? []).filter((h) => !String(h.command ?? '').includes(MARKER)),
      }))
      .filter((group) => group.hooks.length > 0);
    if (hooks[event].length === 0) delete hooks[event];
  }
  if (Object.keys(hooks).length === 0) delete settings.hooks;
  else settings.hooks = hooks;
}

// Other sound hooks would play on top of ours; tell the user instead of
// silently editing their config.
function warnAboutForeignSoundHooks(settings) {
  const players = /afplay|paplay|aplay|mpg123|ffplay|SoundPlayer|MediaPlayer/;
  for (const [event, groups] of Object.entries(settings.hooks ?? {})) {
    for (const group of groups) {
      for (const hook of group.hooks ?? []) {
        const command = String(hook.command ?? '');
        if (!command.includes(MARKER) && players.test(command)) {
          console.warn(`! Existing ${event} hook also plays a sound and will overlap: ${command}`);
        }
      }
    }
  }
}

// ─────────────────────────────────────────
// Sección: Main
// ─────────────────────────────────────────

const args = parseArgs(process.argv.slice(2));
const settingsPath = args.settings ? cleanPath(args.settings) : join(homedir(), '.claude', 'settings.json');
const settings = readSettings(settingsPath);

if (args.uninstall) {
  stripOurHooks(settings);
  writeSettings(settingsPath, settings);
  console.log(`✓ Hooks removed from ${settingsPath} (sounds left in ${INSTALL_DIR}).`);
  process.exit(0);
}

if (!args.finish || !args.request) {
  fail('Both --finish <audio> and --request <audio> are required.');
}

const sources = { finish: cleanPath(args.finish), request: cleanPath(args.request) };
for (const [name, path] of Object.entries(sources)) {
  if (!existsSync(path)) fail(`The "${name}" sound does not exist: ${path}`);
}

// Copy sounds + player into a stable location so the hooks survive the
// user moving or deleting the originals (or this repo).
mkdirSync(INSTALL_DIR, { recursive: true });
copyFileSync(join(SOURCE_DIR, 'play.mjs'), join(INSTALL_DIR, 'play.mjs'));
const installed = {};
for (const [name, path] of Object.entries(sources)) {
  installed[name] = join(INSTALL_DIR, `${name}${extname(path) || extname(basename(path))}`);
  copyFileSync(path, installed[name]);
}

stripOurHooks(settings);
warnAboutForeignSoundHooks(settings);

const player = join(INSTALL_DIR, 'play.mjs');
settings.hooks ??= {};
for (const [event, sound] of Object.entries(EVENT_TO_SOUND)) {
  settings.hooks[event] ??= [];
  settings.hooks[event].push({
    hooks: [{ type: 'command', command: `node "${player}" "${installed[sound]}"`, async: true }],
  });
}
writeSettings(settingsPath, settings);

console.log(`✓ Sounds installed in ${INSTALL_DIR}`);
console.log(`✓ Hooks written to ${settingsPath} (backup: settings.json.bak-${MARKER})`);

// Plays both sounds once so the user hears the result immediately.
for (const sound of ['finish', 'request']) {
  console.log(`♪ Testing "${sound}" sound...`);
  spawnSync('node', [player, installed[sound]], { stdio: 'ignore' });
}
console.log('Restart Claude Code (or open /hooks once) so the new hooks load.');
