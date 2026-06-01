# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Claude Code **plugin** (distributed via a Claude Code plugin marketplace) that makes Claude speak to the user in the voice of "Kapitan Bomba" — a loud, crude, military Polish cartoon character. There is no application to build or run: the deliverable is a `SessionStart` hook that injects a persona + quote list into Claude's context, plus the editable content files that drive it.

There is no build system, no test suite, no linter, and no third-party dependencies. The `.venv/` directory is an unrelated Python virtualenv, is gitignored, and is not part of the plugin.

## Repository layout (two nested levels — important)

The repo root is a **marketplace**; the plugin lives one directory down. They share the name `kapitan-bomba`, which is easy to confuse:

- `/.claude-plugin/marketplace.json` — marketplace manifest; lists the plugin and points `source` at `./kapitan-bomba`.
- `/kapitan-bomba/.claude-plugin/plugin.json` — the **plugin** manifest.
- `/kapitan-bomba/hooks/hooks.json` — registers the `SessionStart` hook.
- `/kapitan-bomba/scripts/session-start.js` — the hook script (pure Node.js).
- `/kapitan-bomba/persona.md` — persona instructions injected into context.
- `/kapitan-bomba/quotes.json` — canonical quotes, each `{ "quote", "when" }`.

When bumping the version, update it in **both** `marketplace.json` and `plugin.json`.

## How it works

1. On `SessionStart` (matchers: `startup|resume|clear|compact`), the hook runs `node "${CLAUDE_PLUGIN_ROOT}/scripts/session-start.js"`.
2. The script reads `persona.md` and `quotes.json` (located via the `CLAUDE_PLUGIN_ROOT` env var), formats them, and writes the result to **stdout** — that stdout becomes additional context for the session.
3. Claude then *semantically* decides when a quote fits the situation (an error, a success, a dumb idea, long waits…) rather than forcing one into every reply.

## Core invariant: the hook must NEVER crash the session

`session-start.js` is built around graceful degradation, and changes must preserve this:

- Missing `CLAUDE_PLUGIN_ROOT` or unreadable `persona.md` → fall back to the inline `FALLBACK_PERSONA` constant.
- Broken/invalid `quotes.json` → the persona still loads; the script emits a technical note telling Claude to inform the user the file is broken and offer to fix it. A malformed quotes file must not abort startup.
- A top-level `try/catch` is the last line of defense and still prints the fallback persona. **Always exit 0.**

When editing the script, keep these fallback layers intact and add new ones in the same defensive style.

## Manually testing the hook

Run the script the way the hook does and inspect stdout:

```bash
CLAUDE_PLUGIN_ROOT="$(pwd)/kapitan-bomba" node kapitan-bomba/scripts/session-start.js
```

To exercise the degradation paths, run it with `CLAUDE_PLUGIN_ROOT` unset, or temporarily point it at a directory with a malformed `quotes.json`, and confirm it still exits 0 with sensible output.

## Editing the persona and quotes (style boundary)

The persona and quotes are intentionally crude, uncensored Polish — that is the product, not a mistake. Do **not** sanitize or soften that content unless asked.

The persona enforces a hard rule that also governs your own work in this repo: the Kapitan Bomba style lives **only in chat**. Everything written to the repository or shown in tooling stays clean and professional — code, code comments, variable/function names, commit messages, PR titles/descriptions, branch and tag names. The crude register belongs in conversation only, never in artifacts.

`quotes.json` is consumed both as a bare array and as `{ "quotes": [...] }` — the parser accepts either shape.
