# Docs to Video

Turn any documentation URL into a **30-60 second tutorial video** — using **your own React components** so the video looks like your actual product.

- One step per scene, short punchy narration
- Audio-visual sync powered by real ElevenLabs timestamps (not estimated)
- Content stays centered in a safe zone — no edge overflow

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI installed
- A React/Next.js project with reusable UI components

### API Keys

| Key | Required? | Free tier? | Get it at |
|-----|-----------|------------|-----------|
| Tabstack | Yes | 50k credits/month free | https://tabstack.ai/dashboard |
| ElevenLabs | Yes | Yes (TTS). Music needs paid plan. | https://elevenlabs.io |

---

## Quick Setup (npm)

Run this **from your project root** (where your `package.json` and `src/` live):

```bash
cd /path/to/my-react-app
npx docs-to-video setup
```

This will:
- Copy `docs-to-video/` into your project (MCP server, remotion template, skill)
- Install MCP server dependencies
- Prompt for your API keys
- Register the MCP server in Claude Code (pointing to your project)
- Install the skill

Your project will look like:

```
my-react-app/
├── src/                  ← your code
├── package.json
└── docs-to-video/        ← created by setup
    ├── mcp-server/       (MCP server + dependencies)
    ├── remotion-template/ (video scaffolding)
    └── skill/            (SKILL.md)
```

Then restart Claude Code and run:

```
/docs-to-video https://docs.stripe.com/payments/quickstart
```

> **Important:** Always start Claude Code from your project root so it can find your components and the `docs-to-video/` directory.

---

## Install via Skills.sh

If you use [skills.sh](https://skills.sh), you can install the skill with:

```bash
npx skills add Bhonar/docs-to-video
```

The first time you run `/docs-to-video`, Claude will automatically run `npx docs-to-video setup` to install the MCP server and dependencies.

---

## Manual Setup (git clone)

If you prefer to clone the repo directly:

### Step 1: Clone into your project root

Go to the folder that contains your `package.json` and `src/` — **not** inside `src/`:

```bash
cd /path/to/my-react-app          # where package.json and src/ live
git clone https://github.com/Bhonar/docs-to-video.git docs-to-video
```

Your project should now look like:

```
my-react-app/
├── src/                  ← your code
├── package.json
└── docs-to-video/        ← cloned here, next to src/
```

### Step 2: Build the MCP server

```bash
cd docs-to-video/mcp-server
npm install
npm run build
cd ../..
```

### Step 3: Add your API keys

Replace `YOUR_TABSTACK_KEY` and `YOUR_ELEVENLABS_KEY` with your actual keys:

```bash
cat > docs-to-video/mcp-server/.env << 'EOF'
TABSTACK_API_KEY=YOUR_TABSTACK_KEY
ELEVENLABS_API_KEY=YOUR_ELEVENLABS_KEY
EOF
```

> Make sure the file is saved with your actual keys before continuing.

### Step 4: Register the MCP server

Add the MCP server to your **global** Claude Code config (`~/.claude/config.json`).

If the file doesn't exist yet, create it. If it already has other servers, add `docs-to-video` to the existing `mcpServers` object.

```bash
# Run this from your project root (where docs-to-video/ lives)
node -e "
const path = require('path');
const fs = require('fs');
const serverPath = path.resolve('docs-to-video/mcp-server/dist/server.js');
const projectRoot = process.cwd();
if (!fs.existsSync(serverPath)) {
  console.error('ERROR: Server not found at ' + serverPath);
  console.error('Make sure you ran: cd docs-to-video/mcp-server && npm run build');
  console.error('And that you are running this from your project root');
  process.exit(1);
}
const configPath = path.join(require('os').homedir(), '.claude', 'config.json');
const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
config.mcpServers = config.mcpServers || {};
config.mcpServers['docs-to-video'] = {
  command: 'node',
  args: [serverPath],
  cwd: projectRoot
};
fs.mkdirSync(path.dirname(configPath), { recursive: true });
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('Written to', configPath);
console.log('Server:', serverPath);
console.log('Working directory:', projectRoot);
"
```

> If you see `ERROR: Server not found`, make sure you're in the right directory and that you ran `npm run build` in Step 2.

### Step 5: Install the skill

Claude Code expects each skill to be a **directory** containing a `SKILL.md` file:

```bash
mkdir -p ~/.claude/skills/docs-to-video
ln -s "$(pwd)/docs-to-video/skill/SKILL.md" ~/.claude/skills/docs-to-video/SKILL.md
```

### Step 6: Run it

> **Restart required** — Claude Code loads skills and MCP servers at startup. If Claude Code is already running, quit and restart it.

Start Claude Code **from your project root** (not from inside `docs-to-video/`):

```bash
claude
```

Claude Code will prompt you to **allow the MCP tools** on first run — type `y` to approve them.

Then type:

```
/docs-to-video https://docs.stripe.com/payments/quickstart
```

---

## Troubleshooting

### "Unknown skill"

1. **Wrong skill structure** — Claude Code expects a **directory** with `SKILL.md` inside, not a standalone file. Check with:
   ```bash
   ls -la ~/.claude/skills/docs-to-video/
   ```
   You should see `SKILL.md` (symlink). If the structure is wrong, fix it:
   ```bash
   rm -rf ~/.claude/skills/docs-to-video ~/.claude/skills/docs-to-video.md
   mkdir -p ~/.claude/skills/docs-to-video
   ln -s "$(pwd)/docs-to-video/skill/SKILL.md" ~/.claude/skills/docs-to-video/SKILL.md
   ```

2. **Symlink target doesn't resolve** — the symlink must use an absolute path. Re-run the `ln -s` command from Step 5 while in your project root.

3. **Didn't restart Claude Code** — skills are loaded at startup. Adding a skill mid-session won't work. Quit Claude Code and start it again.

4. **Wrong directory** — you must run `claude` from your project root, not from inside `docs-to-video/`.

### MCP server not connecting / tools not available

1. **Stale `.mcp.json`** — If a previous test created a `.mcp.json` in your project with relative paths, delete it. The global `~/.claude/config.json` (set by Step 4) uses absolute paths and is more reliable.
2. **Wrong working directory** — Start Claude Code from your **project root** (where `docs-to-video/` lives), not a parent directory.
3. **Config points to wrong path** — Re-run the Step 4 command from your project root to update with correct absolute paths. Check `~/.claude/config.json` to verify.
4. **Server not built** — Run `cd docs-to-video/mcp-server && npm run build`
5. **Didn't restart Claude Code** — MCP servers load at startup. Quit and restart after config changes.

### Audio not generating

- Check `ELEVENLABS_API_KEY` is set in `docs-to-video/mcp-server/.env` (git clone) or `~/.docs-to-video/.env` (npm)
- TTS (narration) works on the free tier
- Music requires a paid ElevenLabs plan — video renders with narration only if music fails

### Uninstall

If you installed via npm:

```bash
cd /path/to/my-react-app      # run from your project root
npx docs-to-video uninstall
rm -rf docs-to-video/          # remove the copied files
```

If you installed via git clone:

```bash
rm -rf docs-to-video/
rm -rf ~/.claude/skills/docs-to-video
# Then remove the "docs-to-video" entry from ~/.claude/config.json
```

---

## How It Works

The `/docs-to-video` skill tells Claude to follow a 6-step workflow:

1. **Scan your codebase** — finds your components (Button, Card, Badge, etc.), design tokens, and import paths
2. **Scaffold Remotion** — sets up a `remotion/` directory in your project if needed
3. **Extract documentation** — fetches the URL content, downloads logos, extracts branding colors
4. **Write narration & generate audio** — writes a short script (1-2 sentences per step), generates TTS audio with **real timestamps** from ElevenLabs for precise audio-visual sync
5. **Build the video composition** — writes `Generated.tsx` using your own components, with each step as its own scene inside a centered `SafeZone` layout
6. **Validate & render** — checks 29 quality rules (no crowded scenes, no numbered lists in a single scene, timecode sync, etc.) then renders to MP4
