# claude-sounds

Sound notifications for [Claude Code](https://claude.com/claude-code). Know when Claude is done or needs you, without watching the terminal.

| Event | Hook | Sound |
| --- | --- | --- |
| Claude finished the task | `Stop` | **finish** |
| Claude asks for permission or notifies | `PermissionRequest`, `Notification` | **request** |

Works on macOS, Linux and Windows. Zero dependencies besides Node.js 18+.

## Install (let Claude do it)

Open Claude Code and say:

```
Set up https://github.com/Moco99/claude-sounds for me
```

or clone it and run `claude` inside the folder. Claude reads `CLAUDE.md`, asks you for two paths:

1. **Finish sound** — path to the audio played when a task ends.
2. **Request sound** — path to the audio played when Claude needs you.

and installs everything.

## Install (manual)

```bash
git clone https://github.com/Moco99/claude-sounds && cd claude-sounds
node install.mjs --finish ~/sounds/done.mp3 --request ~/sounds/ping.wav
```

## What it does

- Copies your two sounds and `play.mjs` to `~/.claude/claude-sounds/` (so moving the originals never breaks it).
- Adds three hooks to `~/.claude/settings.json`, keeping a backup at `settings.json.bak-claude-sounds`.
- Only manages its own hooks: re-running replaces them, your other hooks are untouched. Warns if another hook already plays a sound.

## Change or remove

```bash
# change sounds: just run the installer again with new paths
node install.mjs --finish new-done.mp3 --request new-ping.mp3

# remove the hooks
node install.mjs --uninstall
```

## Linux players

Tried in order: `paplay`, `ffplay`, `mpg123`, `play` (sox), `aplay`. Install any one of them.

## License

MIT
