# Docs to Tutorial Video

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

## Setup

This tool runs **inside your existing project**. You must follow these steps from your project root.

### Step 1: Clone into your project root

Go to the folder that contains your `package.json` and `src/` — **not** inside `src/`:

```bash
cd /path/to/my-react-app          # where package.json and src/ live
git clone https://github.com/Bhonar/docs-to-tutorial.git docs-to-tutorial
```

Your project should now look like:

```
my-react-app/
├── src/                  ← your code
├── package.json
└── docs-to-tutorial/     ← cloned here, next to src/
```

### Step 2: Build the MCP server

```bash
cd docs-to-tutorial/mcp-server
npm install
npm run build
cd ../..
```

### Step 3: Add your API keys

Replace `YOUR_TABSTACK_KEY` and `YOUR_ELEVENLABS_KEY` with your actual keys:

```bash
cat > docs-to-tutorial/mcp-server/.env << 'EOF'
TABSTACK_API_KEY=YOUR_TABSTACK_KEY
ELEVENLABS_API_KEY=YOUR_ELEVENLABS_KEY
EOF
```

> Make sure the file is saved with your actual keys before continuing.

### Step 4: Register the MCP server

Add the MCP server to your **global** Claude Code config (`~/.claude/config.json`).

If the file doesn't exist yet, create it. If it already has other servers, add `docs-to-tutorial` to the existing `mcpServers` object.

```bash
# This command writes the correct config with absolute paths
node -e "
const path = require('path');
const fs = require('fs');
const configPath = path.join(require('os').homedir(), '.claude', 'config.json');
const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
config.mcpServers = config.mcpServers || {};
config.mcpServers['docs-to-tutorial'] = {
  command: 'node',
  args: [path.resolve('docs-to-tutorial/mcp-server/dist/server.js')],
  cwd: path.resolve('docs-to-tutorial/mcp-server')
};
fs.mkdirSync(path.dirname(configPath), { recursive: true });
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('Written to', configPath);
"
```

### Step 5: Install the skill

Claude Code expects each skill to be a **directory** containing a `SKILL.md` file:

```bash
mkdir -p ~/.claude/skills/docs-to-tutorial
ln -s "$(pwd)/docs-to-tutorial/skill/SKILL.md" ~/.claude/skills/docs-to-tutorial/SKILL.md
```

### Step 6: Run it

> **Restart required** — Claude Code loads skills and MCP servers at startup. If Claude Code is already running, quit and restart it.

Start Claude Code **from your project root** (not from inside `docs-to-tutorial/`):

```bash
claude
```

Claude Code will prompt you to **allow the MCP tools** on first run — type `y` to approve them.

Then type:

```
/docs-to-tutorial https://docs.stripe.com/payments/quickstart
```

---

## Troubleshooting

### "Unknown skill"

1. **Wrong skill structure** — Claude Code expects a **directory** with `SKILL.md` inside, not a standalone file. Check with:
   ```bash
   ls -la ~/.claude/skills/docs-to-tutorial/
   ```
   You should see `SKILL.md` (symlink). If the structure is wrong, fix it:
   ```bash
   rm -rf ~/.claude/skills/docs-to-tutorial ~/.claude/skills/docs-to-tutorial.md
   mkdir -p ~/.claude/skills/docs-to-tutorial
   ln -s "$(pwd)/docs-to-tutorial/skill/SKILL.md" ~/.claude/skills/docs-to-tutorial/SKILL.md
   ```

2. **Symlink target doesn't resolve** — the symlink must use an absolute path. Re-run the `ln -s` command from Step 5 while in your project root.

3. **Didn't restart Claude Code** — skills are loaded at startup. Adding a skill mid-session won't work. Quit Claude Code and start it again.

4. **Wrong directory** — you must run `claude` from your project root, not from inside `docs-to-tutorial/`.

### MCP server not connecting

1. Make sure you built it: `cd docs-to-tutorial/mcp-server && npm run build`
2. Check `~/.claude/config.json` has `docs-to-tutorial` in `mcpServers` with correct absolute paths. Re-run the Step 4 command from your project root.
3. Restart Claude Code after changing settings

### Audio not generating

- Check `ELEVENLABS_API_KEY` is set in `docs-to-tutorial/mcp-server/.env`
- TTS (narration) works on the free tier
- Music requires a paid ElevenLabs plan — video renders with narration only if music fails

---

## How It Works

The `/docs-to-tutorial` skill tells Claude to follow a 6-step workflow:

1. **Scan your codebase** — finds your components (Button, Card, Badge, etc.), design tokens, and import paths
2. **Scaffold Remotion** — sets up a `remotion/` directory in your project if needed
3. **Extract documentation** — fetches the URL content, downloads logos, extracts branding colors
4. **Write narration & generate audio** — writes a short script (1-2 sentences per step), generates TTS audio with **real timestamps** from ElevenLabs for precise audio-visual sync
5. **Build the video composition** — writes `Generated.tsx` using your own components, with each step as its own scene inside a centered `SafeZone` layout
6. **Validate & render** — checks 27 quality rules (no crowded scenes, no numbered lists in a single scene, timecode sync, etc.) then renders to MP4
