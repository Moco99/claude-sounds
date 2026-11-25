# claude-sounds — instructions for Claude

The user pointed you at this repo because they want **sound notifications in Claude Code**: one sound when you finish a task, another when you need their attention (permission requests and notices). Set it up for them by following these steps. Talk to the user in their own language.

## Steps

1. **Ask for the two audio files** in a single message. Say you need the file path of each:
   - **Finish sound** — plays when Claude finishes a task.
   - **Request sound** — plays when Claude asks for permission or notifies something.

   Accepted: any `.mp3`, `.wav`, `.aiff`, `.m4a` the OS can play (Windows and Linux players handle `.wav`/`.mp3` best). Dragging the file into the terminal pastes its path. If the user has none, suggest macOS built-ins like `/System/Library/Sounds/Glass.aiff` and `/System/Library/Sounds/Ping.aiff`.

2. **Check Node.js is installed** (`node --version`, v18+). If not, tell the user to install it and stop.

3. **Run the installer** from this repo's root, with the paths the user gave:

   ```bash
   node install.mjs --finish "<finish-path>" --request "<request-path>"
   ```

   It copies the sounds to `~/.claude/claude-sounds/`, merges the hooks into `~/.claude/settings.json` (with a backup) and plays both sounds as a test.

4. **Confirm with the user** that they heard both sounds. If not, check the output for warnings (overlapping sound hooks, missing player on Linux: install `mpg123`, `ffmpeg` or `pulseaudio-utils`).

5. Tell them to **restart Claude Code** (or open `/hooks` once) for the hooks to load.

## Rules

- Do not edit `~/.claude/settings.json` by hand; always use `install.mjs` (idempotent, only touches its own hooks).
- If the installer warns about existing sound hooks, show the warning and ask whether to remove them. Do not remove them silently.
- To change a sound later, re-run the installer with the new paths.
- To remove everything: `node install.mjs --uninstall`.
