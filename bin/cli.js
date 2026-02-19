#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');

// ─── Colors ───────────────────────────────────────────────────────────
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

// ─── Helpers ──────────────────────────────────────────────────────────
function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function check(label, ok) {
  console.log(`  ${ok ? green('✓') : red('✗')} ${label}`);
  return ok;
}

// ─── Paths ────────────────────────────────────────────────────────────
const configDir = path.join(os.homedir(), '.docs-to-video');
const envPath = path.join(configDir, '.env');
const claudeConfigPath = path.join(os.homedir(), '.claude', 'config.json');
const skillDir = path.join(os.homedir(), '.claude', 'skills', 'docs-to-video');
const skillSource = path.join(packageRoot, 'skill', 'SKILL.md');
const serverJs = path.join(packageRoot, 'mcp-server', 'dist', 'server.js');

// ═══════════════════════════════════════════════════════════════════════
//  SETUP
// ═══════════════════════════════════════════════════════════════════════
async function setup() {
  console.log('');
  console.log(bold('  docs-to-video setup'));
  console.log(dim('  Turn documentation URLs into tutorial videos'));
  console.log('');

  // 1. Check Node version
  const nodeVersion = parseInt(process.versions.node.split('.')[0]);
  if (!check('Node.js v18+', nodeVersion >= 18)) {
    console.log(red('\n  Please upgrade Node.js to v18 or later.'));
    process.exit(1);
  }

  // 2. Check server exists
  if (!check('MCP server found', fs.existsSync(serverJs))) {
    console.log(red(`\n  Server not found at: ${serverJs}`));
    console.log(red('  The package may be corrupted. Try reinstalling:'));
    console.log(`  ${cyan('npm install -g docs-to-video')}`);
    process.exit(1);
  }

  // 3. Check skill file exists
  if (!check('Skill file found', fs.existsSync(skillSource))) {
    console.log(red(`\n  SKILL.md not found at: ${skillSource}`));
    process.exit(1);
  }

  console.log('');

  // 4. API keys
  console.log(bold('  API Keys'));
  console.log(dim('  Press Enter to skip optional keys\n'));

  let tabstackKey = '';
  let elevenLabsKey = '';
  let elevenLabsVoiceId = '';

  // Check if .env already exists
  if (fs.existsSync(envPath)) {
    const existing = fs.readFileSync(envPath, 'utf8');
    const existingKeys = {};
    existing.split('\n').forEach((line) => {
      const match = line.match(/^([A-Z_]+)=(.+)$/);
      if (match) existingKeys[match[1]] = match[2];
    });

    if (existingKeys.TABSTACK_API_KEY || existingKeys.ELEVENLABS_API_KEY) {
      console.log(dim('  Found existing API keys in ~/.docs-to-video/.env'));
      const reuse = await prompt(`  ${cyan('?')} Keep existing keys? ${dim('(Y/n)')} `);
      if (reuse.toLowerCase() !== 'n') {
        tabstackKey = existingKeys.TABSTACK_API_KEY || '';
        elevenLabsKey = existingKeys.ELEVENLABS_API_KEY || '';
        elevenLabsVoiceId = existingKeys.ELEVENLABS_VOICE_ID || '';
        console.log(green('  Using existing keys.\n'));
      }
    }
  }

  if (!tabstackKey) {
    tabstackKey = await prompt(`  ${cyan('?')} Tabstack API key ${dim('(https://tabstack.ai/dashboard)')}: `);
    if (!tabstackKey) {
      console.log(yellow('  Skipped — you can add it later to ~/.docs-to-video/.env'));
    }
  }

  if (!elevenLabsKey) {
    elevenLabsKey = await prompt(`  ${cyan('?')} ElevenLabs API key ${dim('(https://elevenlabs.io)')}: `);
    if (!elevenLabsKey) {
      console.log(yellow('  Skipped — you can add it later to ~/.docs-to-video/.env'));
    }
  }

  if (!elevenLabsVoiceId) {
    elevenLabsVoiceId = await prompt(`  ${cyan('?')} ElevenLabs Voice ID ${dim('(optional, press Enter for default)')}: `);
  }

  // 5. Write .env
  console.log('');
  fs.mkdirSync(configDir, { recursive: true });
  let envContent = '';
  envContent += `# docs-to-video configuration\n`;
  envContent += `# Edit this file to update your API keys\n\n`;
  envContent += `TABSTACK_API_KEY=${tabstackKey || 'your_tabstack_api_key_here'}\n`;
  envContent += `ELEVENLABS_API_KEY=${elevenLabsKey || 'your_elevenlabs_api_key_here'}\n`;
  if (elevenLabsVoiceId) {
    envContent += `ELEVENLABS_VOICE_ID=${elevenLabsVoiceId}\n`;
  }
  fs.writeFileSync(envPath, envContent);
  check(`API keys saved to ${dim('~/.docs-to-video/.env')}`, true);

  // 6. Register MCP server
  const claudeDir = path.join(os.homedir(), '.claude');
  fs.mkdirSync(claudeDir, { recursive: true });

  let config = {};
  if (fs.existsSync(claudeConfigPath)) {
    try {
      config = JSON.parse(fs.readFileSync(claudeConfigPath, 'utf8'));
    } catch {
      config = {};
    }
  }

  config.mcpServers = config.mcpServers || {};
  config.mcpServers['docs-to-video'] = {
    command: 'node',
    args: [serverJs],
    cwd: path.dirname(serverJs),
  };
  fs.writeFileSync(claudeConfigPath, JSON.stringify(config, null, 2));
  check(`MCP server registered in ${dim('~/.claude/config.json')}`, true);

  // 7. Install skill symlink
  fs.mkdirSync(skillDir, { recursive: true });
  const skillLink = path.join(skillDir, 'SKILL.md');

  // Remove old symlink/file if exists
  if (fs.existsSync(skillLink)) {
    fs.unlinkSync(skillLink);
  }
  fs.symlinkSync(skillSource, skillLink);
  check(`Skill installed at ${dim('~/.claude/skills/docs-to-video/')}`, true);

  // 8. Clean up old docs-to-tutorial registrations
  if (config.mcpServers['docs-to-tutorial']) {
    delete config.mcpServers['docs-to-tutorial'];
    fs.writeFileSync(claudeConfigPath, JSON.stringify(config, null, 2));
    check('Removed old docs-to-tutorial MCP registration', true);
  }
  const oldSkillDir = path.join(os.homedir(), '.claude', 'skills', 'docs-to-tutorial');
  if (fs.existsSync(oldSkillDir)) {
    fs.rmSync(oldSkillDir, { recursive: true });
    check('Removed old docs-to-tutorial skill', true);
  }

  // Done
  console.log('');
  console.log(green(bold('  Setup complete!')));
  console.log('');
  console.log(`  ${bold('Next steps:')}`);
  console.log(`  1. ${bold('Restart Claude Code')} (quit and reopen)`);
  console.log(`  2. Run: ${cyan('/docs-to-video <documentation-url>')}`);
  console.log('');
  console.log(dim('  Example:'));
  console.log(dim('  /docs-to-video https://docs.stripe.com/payments/quickstart'));
  console.log('');
  console.log(dim(`  Config: ~/.docs-to-video/.env`));
  console.log(dim(`  To uninstall: npx docs-to-video uninstall`));
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════
//  UNINSTALL
// ═══════════════════════════════════════════════════════════════════════
async function uninstall() {
  console.log('');
  console.log(bold('  docs-to-video uninstall'));
  console.log('');

  // Remove MCP registration
  if (fs.existsSync(claudeConfigPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(claudeConfigPath, 'utf8'));
      if (config.mcpServers?.['docs-to-video']) {
        delete config.mcpServers['docs-to-video'];
        fs.writeFileSync(claudeConfigPath, JSON.stringify(config, null, 2));
        check('Removed MCP server registration', true);
      } else {
        check('MCP server registration (already removed)', true);
      }
    } catch {
      console.log(yellow('  Could not parse ~/.claude/config.json'));
    }
  }

  // Remove skill
  if (fs.existsSync(skillDir)) {
    fs.rmSync(skillDir, { recursive: true });
    check('Removed skill symlink', true);
  } else {
    check('Skill symlink (already removed)', true);
  }

  // Keep .env (user's API keys)
  if (fs.existsSync(envPath)) {
    console.log(dim(`\n  Note: API keys preserved at ~/.docs-to-video/.env`));
    console.log(dim(`  Delete manually if you want to remove them:`));
    console.log(dim(`  rm -rf ~/.docs-to-video`));
  }

  console.log('');
  console.log(green('  Uninstalled. Restart Claude Code to apply changes.'));
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════
const command = process.argv[2];

switch (command) {
  case 'setup':
  case undefined:
    await setup();
    break;
  case 'uninstall':
    await uninstall();
    break;
  case '--help':
  case '-h':
    console.log('');
    console.log(bold('  docs-to-video') + ' — Turn docs into tutorial videos');
    console.log('');
    console.log('  Usage:');
    console.log(`    ${cyan('npx docs-to-video setup')}       Set up MCP server, skill, and API keys`);
    console.log(`    ${cyan('npx docs-to-video uninstall')}   Remove MCP registration and skill`);
    console.log(`    ${cyan('npx docs-to-video --help')}      Show this help`);
    console.log('');
    break;
  default:
    console.log(red(`  Unknown command: ${command}`));
    console.log(`  Run ${cyan('npx docs-to-video --help')} for usage.`);
    process.exit(1);
}
