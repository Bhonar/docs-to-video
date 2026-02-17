---
name: docs-to-tutorial
description: Create tutorial/how-to videos from documentation URLs using the user's own React components and Remotion
---

# Docs to Tutorial Video

Generate tutorial and how-to videos from documentation URLs. The video uses the user's **own React components** (buttons, cards, layouts) so the tutorial looks like their actual product. Produces an MP4 with AI narration, background music, and animated scenes.

**Prerequisite skill:** Install `remotion-best-practices` for Remotion animation rules.

**Target file:** `remotion/src/compositions/Generated.tsx` (inside user's project, overwritten each run)

---

## 7-Step Workflow

### Step 1: Scan User's Codebase

Before anything else, understand the user's project:

1. **Find components** — scan `src/components/`, `src/ui/`, `components/`, `app/components/` or wherever components live
2. **Identify the design system** — look for:
   - UI primitives: Button, Card, Input, Badge, Alert, Modal
   - Layout components: Container, Grid, Stack, Flex, Sidebar
   - Typography: Heading, Text, Label, Code
   - Navigation: Tabs, Breadcrumb, Menu
3. **Read the styling approach** — Tailwind? CSS Modules? Styled Components? Inline styles?
4. **Note import paths** — e.g., `@/components/ui/button` or `../../components/Button`
5. **Check for a tailwind.config** or theme file — extract their color palette, fonts, spacing scale
6. **Record the project root** — the absolute path to the user's project root (where `package.json` is). This is needed for `remotionProjectPath` in all tool calls.

**What to save from this step:**
- List of reusable components with their import paths and key props
- The project's color palette / design tokens
- Font family names
- The absolute path to the project root
- The relative path from `remotion/src/compositions/Generated.tsx` to the user's components

---

### Step 2: Scaffold Remotion (if needed)

**IMPORTANT: This step MUST happen before Steps 3-4.** The extraction and audio tools save files to `remotion/public/`. If `remotion/` doesn't exist yet, those files would be lost.

Check if `remotion/` directory exists in the user's project root. If not:

1. Copy the template files from the MCP server's `remotion-template/` directory:
   ```
   remotion/
   ├── src/
   │   ├── Root.tsx
   │   ├── index.ts
   │   ├── style.css          (Tailwind entry — required)
   │   └── compositions/
   │       └── Generated.tsx
   ├── public/
   │   ├── audio/    (generated audio goes here)
   │   └── images/   (downloaded logos go here)
   ├── package.json
   ├── tsconfig.json
   └── tailwind.config.js
   ```

2. **Update Tailwind content paths** if the user's components aren't in `../src/`:
   - Default: `'../src/**/*.{ts,tsx}'`
   - If user has `app/` structure: add `'../app/**/*.{ts,tsx}'`
   - If monorepo with `packages/`: add `'../packages/ui/**/*.{ts,tsx}'`
   - Check where the user's components live and ensure `remotion/tailwind.config.js` includes them

3. Run `cd remotion && npm install`

4. Verify: `remotion/src/index.ts` exists and imports Root and `style.css`

**If remotion/ already exists**, just verify the structure is intact and that `tailwind.config.js` content paths include the user's component directories.

---

### Step 3: Extract Documentation

**Call `extract_docs_content`** with:
- `url` — the documentation URL
- `remotionProjectPath` — absolute path to the `remotion/` directory (e.g., `/Users/me/my-app/remotion`)

Returns:
- `markdown` — full page content as clean markdown (code blocks, headings, lists preserved)
- `metadata` — title, technology, docType, difficulty, prerequisites, sections
- `branding` — logo (url + staticPath), colors, font, theme
- `domain` — documentation domain
- `warnings` — any extraction issues

**Then analyze the documentation:**

1. **Content Type** — from `metadata.docType` (one scene per step means more scenes):
   - `quickstart` → 3-5 steps = 5-7 scenes (intro + steps + summary), ~45-60s video
   - `tutorial` → 5-8 steps = 7-10 scenes, ~60-90s video
   - `api-reference` → endpoint showcases, 4-6 scenes, ~45-60s
   - `guide` → concept explanations + code, 6-10 scenes, ~60-90s
   - `how-to` → problem/solution format, 5-8 scenes, ~45-60s

2. **Parse the markdown** to identify:
   - Code blocks (language from fence markers)
   - Numbered lists (step sequences)
   - Headings hierarchy (scene structure)
   - Blockquotes (tips, warnings)

3. **Music Style** — tutorials need calming, non-distracting music:
   - All doc types: `ambient` or `lo-fi`

---

### Step 4: Write Narration Script & Generate Audio

Write a narration script following the **tutorial arc**. Each paragraph becomes one scene — **one step per paragraph, one paragraph per scene**:

- **Intro** (4-6s) — "Let's learn how to [topic] with [technology]"
- **Overview** (5-8s) — What this covers, prerequisites
- **Step 1** — First step only. "First, let's install..."
- **Step 2** — Second step only. "Next, we'll configure..."
- **Step 3** — Third step only. "Now let's create..."
- ... (one paragraph per step, as many as the docs require)
- **Key Takeaways** (5-8s) — Recap the important points
- **Next Steps** (3-5s) — What to explore next, reference to docs

**⚠️ CRITICAL:** Do NOT combine multiple steps into a single paragraph. Each step gets its own narration paragraph and its own visual scene. If the docs have 5 steps, the narration must have 5 separate step paragraphs.

**⚠️ Pacing Variation — Match Duration to Complexity:**

Not all steps are equal. Simple steps get short narration; complex steps get long narration. The narration length drives the scene duration (via `calculateMetadata`), so pacing is controlled here:

| Step complexity | Narration length | Scene duration | Example |
|----------------|-----------------|----------------|---------|
| Simple command | 1-2 sentences (~15 words) | 4-5s | `npm install stripe` |
| Config/setup | 2-3 sentences (~30 words) | 6-8s | Setting env variables |
| Code with explanation | 3-5 sentences (~50 words) | 8-12s | Writing an API route |
| Multi-part concept | 4-6 sentences (~60 words) | 10-14s | Explaining auth flow |

Write shorter paragraphs for "do this" steps, longer paragraphs for "understand this" steps. The pacing variation makes the video feel natural — fast through the easy parts, slow through the hard parts.

Guidelines:
- Instructional tone, use "we" and "let's" (collaborative, not lecturing)
- ~150 words/min for complex steps, ~180 words/min for simple steps
- Mention specific function/class names from the code
- Pause between major sections (separate paragraphs)
- Every step paragraph should describe exactly what the viewer will see on screen
- Simple steps: be concise, don't pad with filler
- Complex steps: explain WHY, not just WHAT — the extra context justifies the longer scene

**Call `generate_audio`** with:
- `musicStyle` — `ambient` or `lo-fi`
- `narrationScript` — your script
- `duration` — estimated total video length in seconds
- `remotionProjectPath` — absolute path to the `remotion/` directory

**Note:** Music generation requires a paid ElevenLabs plan. If music fails, the video will have narration only — this is fine. TTS narration works on the free tier.

**Save returned values:**
- `audio.music.staticPath`
- `audio.narration.staticPath`
- `audio.beats`

---

### Step 5: Design Tutorial Scenes

Plan scenes using the user's components discovered in Step 1.

#### ⚠️ CRITICAL RULE: One Step Per Scene

**Every scene must explain exactly ONE step, ONE concept, or ONE action.** Never combine two steps side-by-side or stack multiple explanations in a single scene — this makes the video hard to follow.

- ✅ Scene 1: "Install the package" → shows `npm install` command
- ✅ Scene 2: "Set up your environment" → shows `.env` file
- ✅ Scene 3: "Create the API route" → shows the code
- ❌ Scene that shows install AND setup AND config together

**If the docs have 6 steps, you need at least 8 scenes** (intro + 6 step scenes + summary). More steps = more scenes, never fewer.

#### Progress Indicator (Required on Every Step Scene)

Every step scene MUST include a persistent progress indicator so the viewer always knows where they are. Use a step counter ("Step 2 of 6") or a progress bar — it stays visible throughout all step scenes (not intro or summary).

**Progress indicator pattern (include in every step scene component):**
```typescript
const StepIndicator: React.FC<{
  current: number;
  total: number;
  colors: { primary: string; accent: string };
}> = ({ current, total, colors }) => {
  const frame = useCurrentFrame();
  const slideIn = interpolate(frame, [0, 12], [-40, 0], { extrapolateRight: 'clamp' });
  const opacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute', top: 32, right: 40,
      display: 'flex', alignItems: 'center', gap: 12,
      opacity, transform: `translateY(${slideIn}px)`,
    }}>
      {/* Step dots */}
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i + 1 === current ? 32 : 10,
          height: 10,
          borderRadius: 5,
          background: i + 1 <= current ? colors.primary : `${colors.primary}33`,
          transition: 'none', // NO CSS transitions in Remotion
        }} />
      ))}
      <span style={{
        fontSize: 14, fontWeight: 600,
        color: colors.primary, opacity: 0.8,
      }}>
        {current}/{total}
      </span>
    </div>
  );
};
```

Place `<StepIndicator current={2} total={6} colors={branding.colors} />` in every step scene. Skip it on intro and summary scenes.

#### Every Explanation Gets a Visual Scene

Every piece of information the narration mentions MUST have a corresponding visual scene. If the narration says "set up your environment variables", there must be a scene showing that. If it says "install the dependencies", there must be a scene showing the terminal command. **No narration without a matching visual.**

Map narration → scenes 1:1:
- Intro narration → Intro scene (title, badges, what you'll learn)
- "First, install..." → Scene showing the install command
- "Next, configure..." → Scene showing the config file
- "Now let's create..." → Scene showing the code
- Summary narration → Summary scene (recap checklist)

#### Typing Effect for Code and Commands

Any text that represents a command, code snippet, file path, or terminal output MUST use a typing/typewriter effect — characters appear one by one as if someone is typing. This makes the video interactive and easier to follow.

**Typing effect pattern (use this in every code/command scene):**
```typescript
const TypingText: React.FC<{
  text: string;
  startFrame: number;
  charsPerFrame?: number;
}> = ({ text, startFrame, charsPerFrame = 0.5 }) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  const charsToShow = Math.min(
    Math.floor(elapsed * charsPerFrame),
    text.length
  );
  const displayText = text.slice(0, charsToShow);
  const showCursor = charsToShow < text.length;

  return (
    <span style={{ fontFamily: 'monospace' }}>
      {displayText}
      {showCursor && (
        <span style={{ opacity: Math.floor(frame / 15) % 2 === 0 ? 1 : 0 }}>
          ▌
        </span>
      )}
    </span>
  );
};
```

Use typing effect for:
- Terminal commands (`npm install`, `npx create-...`, `curl ...`)
- Code snippets (function definitions, imports, config lines)
- File paths and file names
- API endpoints and URLs
- Environment variable values

#### Code Highlighting and Annotation

When showing multi-line code snippets, don't give every line equal weight. **Highlight the important line and dim the rest** — this teaches the viewer where to focus, like a teacher pointing at a whiteboard.

**Code highlight pattern (use for code walkthrough scenes):**
```typescript
const HighlightedCode: React.FC<{
  lines: string[];
  highlightLine: number; // 0-indexed
  startFrame: number;
  colors: { primary: string };
}> = ({ lines, highlightLine, startFrame, colors }) => {
  const frame = useCurrentFrame();
  const elapsed = Math.max(0, frame - startFrame);
  // First show all lines dimmed, then highlight kicks in
  const highlightProgress = interpolate(elapsed, [20, 35], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      background: '#1a1a2e', borderRadius: 8, padding: 20,
      fontFamily: 'monospace', fontSize: 16, lineHeight: 1.7,
    }}>
      {lines.map((line, i) => {
        const isHighlighted = i === highlightLine;
        const dimOpacity = isHighlighted ? 1 : 1 - highlightProgress * 0.6;
        return (
          <div key={i} style={{
            padding: '2px 8px',
            opacity: dimOpacity,
            background: isHighlighted ? `${colors.primary}22` : 'transparent',
            borderLeft: isHighlighted ? `3px solid ${colors.primary}` : '3px solid transparent',
          }}>
            <span style={{ color: '#666', marginRight: 16 }}>{i + 1}</span>
            <span style={{ color: isHighlighted ? '#fff' : '#aaa' }}>{line}</span>
          </div>
        );
      })}
    </div>
  );
};
```

Use this pattern when:
- Showing a function with one key line the narration explains
- Displaying a config file where one field matters
- Walking through an API response where one property is the focus

The highlighted line should match what the narration is describing at that moment.

#### Scene Types and Components

| Scene Type | User Components to Use | Duration | Complexity |
|-----------|----------------------|----------|------------|
| Intro | Heading, Badge, Card, Container | 4-6s | — |
| Install/Setup | Code/Terminal with **typing effect**, Card | 4-6s | Simple |
| Config/Environment | Code with **typing effect**, Badge/Label | 6-8s | Medium |
| Code walkthrough | Code with **typing + highlight**, Card, Text | 8-12s | Complex |
| Concept explanation | Card, Heading, Text, diagram components | 8-12s | Complex |
| Terminal output (result) | Simulated terminal with success output | 3-5s | Simple |
| Callout (warning/tip) | CalloutScene component | 3-4s | — |
| Summary | Heading, checkmark list, Badge, Button (CTA) | 5-8s | — |

**If the user doesn't have a component you need** (e.g., no CodeBlock), build it inline in Generated.tsx using their styling patterns (same font, colors, border-radius, shadows).

#### Before/After: Show the Result

Tutorials don't just show code — they show **what happens when you run it**. After a command or code scene, add a result scene that shows the output or effect. This is the cause-and-effect pattern.

**Patterns to use:**
- After `npm install` → show a simulated terminal with `✓ Successfully installed 3 packages`
- After creating a file → show a simulated file tree with the new file highlighted
- After writing an API route → show a mock browser/Postman-style card with the response JSON
- After configuring `.env` → show a "ready" status or checkmark confirmation
- After a build command → show a success message or the running app

**Terminal output scene pattern:**
```typescript
const TerminalOutputScene: React.FC<{ command: string; output: string; colors: any }> = ({ command, output, colors }) => {
  const frame = useCurrentFrame();
  // Command is already typed, output appears after a delay
  const outputOpacity = interpolate(frame, [30, 45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0d1117',
    }}>
      <div style={{ width: '75%' }}>
        <div style={{
          background: '#161b22', borderRadius: 8, padding: 24,
          fontFamily: 'monospace', fontSize: 18,
        }}>
          <div style={{ color: '#8b949e' }}>$ {command}</div>
          <div style={{ color: '#3fb950', marginTop: 12, opacity: outputOpacity }}>
            {output}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

**Not every step needs an output scene** — use them for:
- Install/build commands (always show success)
- Creating files or endpoints (show the result)
- Running the app (show a mock browser)

Skip output scenes for config-only steps where the result isn't visual.

#### Contextual Callouts for Warnings, Tips, and Notes

Documentation often contains `> ⚠️ Warning`, `> 💡 Tip`, or `> Note:` blocks. These MUST become distinct visual moments — a callout card that slides in, pauses, then fades. Don't bury them inside a regular content scene.

**Callout scene pattern:**
```typescript
const CalloutScene: React.FC<{
  type: 'warning' | 'tip' | 'note';
  message: string;
  colors: any;
}> = ({ type, message, colors }) => {
  const frame = useCurrentFrame();

  const config = {
    warning: { bg: '#fef3cd', border: '#f59e0b', icon: '⚠️', label: 'Warning' },
    tip:     { bg: '#d1fae5', border: '#10b981', icon: '💡', label: 'Pro Tip' },
    note:    { bg: '#dbeafe', border: '#3b82f6', icon: '📝', label: 'Note' },
  }[type];

  // Slide in from right
  const slideX = interpolate(frame, [0, 18], [80, 0], { extrapolateRight: 'clamp' });
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `${colors.primary}0a`,
    }}>
      <div style={{
        opacity, transform: `translateX(${slideX}px)`,
        background: config.bg, borderLeft: `4px solid ${config.border}`,
        borderRadius: 8, padding: '24px 32px', maxWidth: '70%',
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: config.border, marginBottom: 8 }}>
          {config.icon} {config.label}
        </div>
        <div style={{ fontSize: 22, color: '#1a1a1a', lineHeight: 1.5 }}>
          {message}
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

Use callout scenes when the docs contain:
- Warnings about common mistakes or breaking changes
- Tips that save time or improve results
- Notes about prerequisites or version requirements

These can be short (3-4s) but they MUST be their own scene — never embed a callout inside a code scene.

**Layout rules:**
- Use at least 3 different layouts across scenes
- Layouts: centered, split (60/40), stacked, grid, full-bleed
- Use the user's Container/Layout components for consistent spacing
- Each scene should feel spacious — don't cram content

---

### Step 6: Write Generated.tsx

Write the full composition at `remotion/src/compositions/Generated.tsx`.

**Critical: Import the user's components using relative paths from Generated.tsx:**
```typescript
// Example: if user's components are at src/components/ui/
import { Button } from '../../../src/components/ui/button';
import { Card } from '../../../src/components/ui/card';
import { Badge } from '../../../src/components/ui/badge';
```

**Required file structure:**

```typescript
import React from 'react';
import {
  AbsoluteFill, useCurrentFrame, useVideoConfig,
  staticFile, Sequence, interpolate, spring,
} from 'remotion';
import { Audio } from '@remotion/media';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { loadFont } from '@remotion/google-fonts/Inter';
import { TutorialVideoProps } from '../Root';

// Import USER's components
import { Button } from '../../../src/components/ui/button';
import { Card } from '../../../src/components/ui/card';
// ... more user components

const { fontFamily } = loadFont('normal', {
  weights: ['400', '700'],
  subsets: ['latin'],
});

export const Generated: React.FC<TutorialVideoProps> = ({
  content, branding, audio, duration,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{
      background: `linear-gradient(135deg, ${branding.colors.primary}, ${branding.colors.secondary})`,
      fontFamily,
    }}>
      {/* Audio */}
      {audio.music?.staticPath && (
        <Audio src={staticFile(audio.music.staticPath)} volume={0.3} />
      )}
      {audio.narration?.staticPath && (
        <Audio src={staticFile(audio.narration.staticPath)} volume={1} />
      )}

      {/* Scenes using TransitionSeries */}
      <TransitionSeries>
        {/* Scenes here, using the user's components */}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
```

**⚠️ Staged Reveals: Visual Hierarchy Within Scenes**

**NEVER show all elements at once.** Every scene must stage its elements — first the title, then a beat later the code, then the highlight. This layered reveal guides the viewer's eye like a teacher pointing at a whiteboard.

**Staging rules:**
1. **Frame 0-15:** Background + scene container fade in
2. **Frame 10-25:** Title/heading appears (spring or fade)
3. **Frame 20-40:** Step badge or label slides in
4. **Frame 30+:** Main content (code, config, etc.) appears — with typing effect if code
5. **Frame 50+:** Highlight or annotation kicks in on the key line

Each element starts its animation 10-15 frames AFTER the previous one. Never animate two elements at the same time.

**Using user's components in Remotion — with staged reveals:**

The user's components are regular React components. Wrap them in Remotion animation logic with staggered timing:

```typescript
// Staged intro — elements appear one by one
const IntroScene: React.FC<{ colors: any; width: number; height: number }> = ({ colors, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Stage 1: card container (frame 0)
  const cardScale = spring({ frame, fps, from: 0.8, to: 1, config: { damping: 12 } });
  const cardOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  // Stage 2: title text (frame 12 — after card is visible)
  const titleOpacity = interpolate(frame, [12, 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleSlide = interpolate(frame, [12, 25], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Stage 3: badges (frame 25 — after title is visible)
  const badgeOpacity = interpolate(frame, [25, 38], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const badgeSlide = interpolate(frame, [25, 38], [15, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
    }}>
      <div style={{ transform: `scale(${cardScale})`, opacity: cardOpacity }}>
        <Card className="p-8 max-w-2xl">
          {/* Stage 2: title */}
          <div style={{ opacity: titleOpacity, transform: `translateY(${titleSlide}px)` }}>
            <h1 style={{ fontSize: height * 0.08, fontWeight: 700 }}>
              {content.title}
            </h1>
          </div>
          {/* Stage 3: badges */}
          <div className="flex gap-2 mt-4" style={{ opacity: badgeOpacity, transform: `translateY(${badgeSlide}px)` }}>
            <Badge>Tutorial</Badge>
            <Badge variant="outline">{content.technology}</Badge>
          </div>
        </Card>
      </div>
    </AbsoluteFill>
  );
};
```

**Code/Command scene with staged reveal + typing effect (REQUIRED for all code/terminal scenes):**

```typescript
const InstallScene: React.FC<{
  colors: any;
  stepNumber: number;
  totalSteps: number;
}> = ({ colors, stepNumber, totalSteps }) => {
  const frame = useCurrentFrame();

  // Stage 1: card container (frame 0-10)
  const cardOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateRight: 'clamp' });

  // Stage 2: title + badge (frame 8-20)
  const titleOpacity = interpolate(frame, [8, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const titleSlide = interpolate(frame, [8, 20], [15, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Stage 3: terminal appears (frame 22-32)
  const termOpacity = interpolate(frame, [22, 32], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Stage 4: typing starts (frame 35+)
  const command = 'npm install @stripe/stripe-js';
  const typingElapsed = Math.max(0, frame - 35);
  const charsToShow = Math.min(Math.floor(typingElapsed * 0.5), command.length);
  const displayText = command.slice(0, charsToShow);
  const showCursor = frame >= 35 && charsToShow < command.length;

  return (
    <AbsoluteFill style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `linear-gradient(135deg, ${colors.primary}22, ${colors.secondary}22)`,
    }}>
      {/* Progress indicator */}
      <StepIndicator current={stepNumber} total={totalSteps} colors={colors} />

      <div style={{ opacity: cardOpacity, width: '80%' }}>
        <Card className="p-8">
          {/* Stage 2: title */}
          <div style={{ opacity: titleOpacity, transform: `translateY(${titleSlide}px)` }}>
            <Badge className="mb-4">Step {stepNumber}</Badge>
            <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}>
              Install the SDK
            </h2>
          </div>
          {/* Stage 3+4: terminal with typing */}
          <div style={{
            opacity: termOpacity,
            background: '#1a1a2e', borderRadius: 8, padding: 24,
            fontFamily: 'monospace', fontSize: 20, color: '#00ff88',
          }}>
            <span style={{ color: '#888' }}>$ </span>
            {displayText}
            {showCursor && (
              <span style={{ opacity: Math.floor(frame / 15) % 2 === 0 ? 1 : 0 }}>▌</span>
            )}
          </div>
        </Card>
      </div>
    </AbsoluteFill>
  );
};
```

**Remember:** Each scene above is ONE step. The install scene ONLY shows install. The next scene shows the next step. Never combine.

**Remotion rules (see `remotion-best-practices` skill for full details):**
- Audio: `import { Audio } from '@remotion/media'` — NOT from `remotion`
- Audio src: `staticFile(audio.music.staticPath)` — NEVER raw paths
- Conditional audio: `{audio.music?.staticPath && <Audio ... />}`
- Animations: ONLY `useCurrentFrame()` + `spring()` / `interpolate()` — NO CSS animations
- Images: `<Img>` from `remotion` — NOT `<img>`
- Fonts: Load via `@remotion/google-fonts` before use
- Duration: `seconds * fps` — never hardcode frame numbers
- Clamp: Always use `extrapolateRight: 'clamp'` on interpolate

---

### Step 7: Validate & Render

**Validation checklist (must pass all):**

**Remotion basics:**
1. Audio imported from `@remotion/media` (not `remotion`)
2. Audio uses `staticFile()` with `staticPath`
3. Conditional audio rendering
4. Font loaded via `@remotion/google-fonts`
5. No CSS animations or Tailwind `animate-*` classes
6. All animations use `useCurrentFrame()` + `spring`/`interpolate`
7. User's components are imported with correct relative paths
8. User's components render without errors in Remotion context
9. Scene durations calculated from fps

**Scene structure:**
10. Has intro scene and summary scene
11. **Each scene explains exactly ONE step** — no scene combines two steps
12. **Every narration paragraph has a matching visual scene** — no explanation without a visual
13. Narration content matches visual progression 1:1

**Tutorial quality:**
14. **All code/commands use typing effect** — characters appear one by one with blinking cursor
15. **Multi-line code uses highlighting** — important line spotlighted, rest dimmed
16. **Step scenes have a progress indicator** — StepIndicator showing "Step N of M"
17. **Elements appear in stages** — title first, then badge, then code, then highlight (never all at once)
18. **Command scenes have output/result scenes** — show what happens after running a command
19. **Warnings/tips from docs are callout scenes** — distinct styled cards, not embedded in code scenes
20. **Pacing varies by complexity** — simple steps are 4-5s, complex code walkthroughs are 8-12s

**Call `render_video`** with:
- `inputProps` — full props (content, branding, audio, metadata, duration)
- `outputFileName` — descriptive name like `react-hooks-tutorial`
- `remotionProjectPath` — absolute path to the `remotion/` directory in the user's project

Duration is automatically calculated from narration length via `calculateMetadata` (narration drives video length, since it IS the content).

---

## Component Compatibility Notes

Not all React components work in Remotion's rendering context. Watch for:

- **Event handlers** (onClick, onHover) — harmless, just won't fire in video
- **CSS animations** — FORBIDDEN. If a user component uses `@keyframes` or `transition`, you must override those styles inline: `style={{ animation: 'none', transition: 'none' }}`
- **Portals** — won't work in Remotion. Skip components that use `createPortal` (modals, tooltips)
- **Client-side state** — `useState`/`useEffect` for animation won't work. Replace with Remotion's `useCurrentFrame()`
- **Dynamic imports** — avoid. Use static imports only
- **Browser APIs** — `window`, `document` queries won't work during render

**When a user's component won't work in Remotion**, build a visual replica inline using:
- The same CSS classes (if Tailwind)
- The same color tokens
- The same border-radius, shadow, and spacing values
- Read their component source to match the visual output
