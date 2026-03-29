#!/usr/bin/env bash
# PRIMA Scholar — Install commands, skills, agents, and MCP servers into a Claude Code workspace
#
# Usage:
#   ./install.sh                    # installs to current directory
#   ./install.sh /path/to/workspace # installs to specified workspace
#
# What it does:
#   1. Copies slash commands to .claude/commands/
#   2. Copies skills to .claude/skills/
#   3. Copies agents to .claude/agents/
#   4. Copies MCP server code to .claude/mcp-servers/ with start.sh wrappers
#   5. Registers MCP servers in ~/.claude.json pointing to workspace copies
#
# MCP servers must already be built (npm run build in each server directory).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:-$(pwd)}"

# Resolve to absolute path
TARGET="$(cd "$TARGET" && pwd)"

echo "PRIMA Scholar — Installing to: $TARGET"
echo ""

# --- Validate ---

if [ ! -d "$TARGET/.claude" ]; then
    echo "ERROR: $TARGET/.claude does not exist. Is this a Claude Code workspace?"
    exit 1
fi

# --- Commands ---

mkdir -p "$TARGET/.claude/commands"
COMMANDS_INSTALLED=0

for cmd in "$SCRIPT_DIR"/commands/*.md; do
    [ -f "$cmd" ] || continue
    name="$(basename "$cmd")"
    cp "$cmd" "$TARGET/.claude/commands/$name"
    echo "  command: $name"
    COMMANDS_INSTALLED=$((COMMANDS_INSTALLED + 1))
done

echo "  $COMMANDS_INSTALLED command(s) installed"
echo ""

# --- Skills ---

mkdir -p "$TARGET/.claude/skills"
SKILLS_INSTALLED=0

for skill_dir in "$SCRIPT_DIR"/skills/*/; do
    [ -d "$skill_dir" ] || continue
    name="$(basename "$skill_dir")"

    # Check for conflict with existing skill
    if [ -d "$TARGET/.claude/skills/$name" ]; then
        echo "  skill: $name — SKIPPED (already exists)"
        continue
    fi

    cp -r "$skill_dir" "$TARGET/.claude/skills/$name"
    echo "  skill: $name"
    SKILLS_INSTALLED=$((SKILLS_INSTALLED + 1))
done

echo "  $SKILLS_INSTALLED skill(s) installed"
echo ""

# --- Agents ---

mkdir -p "$TARGET/.claude/agents"
AGENTS_INSTALLED=0

for agent in "$SCRIPT_DIR"/agents/*.md; do
    [ -f "$agent" ] || continue
    name="$(basename "$agent")"

    if [ -f "$TARGET/.claude/agents/$name" ]; then
        echo "  agent: $name — SKIPPED (already exists)"
        continue
    fi

    cp "$agent" "$TARGET/.claude/agents/$name"
    echo "  agent: $name"
    AGENTS_INSTALLED=$((AGENTS_INSTALLED + 1))
done

echo "  $AGENTS_INSTALLED agent(s) installed"
echo ""

# --- MCP Servers ---

echo "Installing MCP servers..."

SEARCH_SRC="$SCRIPT_DIR/mcp-servers/prima-scholar-search-mcp"
LIBRARY_SRC="$SCRIPT_DIR/mcp-servers/prima-scholar-library-mcp"

SEARCH_DEST="$TARGET/.claude/mcp-servers/prima-scholar-search"
LIBRARY_DEST="$TARGET/.claude/mcp-servers/prima-scholar-library"

# Install search server
if [ -d "$SEARCH_SRC/build" ] && [ -d "$SEARCH_SRC/node_modules" ]; then
    mkdir -p "$SEARCH_DEST"
    cp -r "$SEARCH_SRC/build" "$SEARCH_DEST/build"
    cp -r "$SEARCH_SRC/node_modules" "$SEARCH_DEST/node_modules"
    cp "$SEARCH_SRC/package.json" "$SEARCH_DEST/package.json"

    # Create start.sh wrapper
    cat > "$SEARCH_DEST/start.sh" << 'STARTEOF'
#!/bin/bash
SCRIPT_DIR="$(dirname "$0")"
export NODE_PATH="$SCRIPT_DIR/node_modules"
exec node "$SCRIPT_DIR/build/index.js"
STARTEOF
    chmod +x "$SEARCH_DEST/start.sh"

    echo "  MCP: prima-scholar-search — installed to .claude/mcp-servers/"
else
    echo "  MCP: prima-scholar-search — build not found. Run: cd mcp-servers/prima-scholar-search-mcp && npm install && npm run build"
fi

# Install library server
if [ -d "$LIBRARY_SRC/build" ] && [ -d "$LIBRARY_SRC/node_modules" ]; then
    mkdir -p "$LIBRARY_DEST"
    cp -r "$LIBRARY_SRC/build" "$LIBRARY_DEST/build"
    cp -r "$LIBRARY_SRC/node_modules" "$LIBRARY_DEST/node_modules"
    cp "$LIBRARY_SRC/package.json" "$LIBRARY_DEST/package.json"

    # Create start.sh wrapper
    cat > "$LIBRARY_DEST/start.sh" << 'STARTEOF'
#!/bin/bash
SCRIPT_DIR="$(dirname "$0")"
export NODE_PATH="$SCRIPT_DIR/node_modules"
exec node "$SCRIPT_DIR/build/index.js"
STARTEOF
    chmod +x "$LIBRARY_DEST/start.sh"

    echo "  MCP: prima-scholar-library — installed to .claude/mcp-servers/"
else
    echo "  MCP: prima-scholar-library — build not found. Run: cd mcp-servers/prima-scholar-library-mcp && npm install && npm run build"
fi

echo ""

# --- MCP Server Registration ---

CLAUDE_JSON="$HOME/.claude.json"

if [ ! -f "$CLAUDE_JSON" ]; then
    echo "  WARNING: ~/.claude.json not found — skipping MCP registration"
    echo "  Add MCP servers manually per the README"
else
    # Register search server
    if python3 -c "
import json, sys
with open('$CLAUDE_JSON') as f:
    d = json.load(f)
servers = d.get('mcpServers', {})
if 'prima-scholar-search' in servers:
    # Check if already pointing to workspace copy
    existing = servers['prima-scholar-search'].get('command', '')
    existing_args = servers['prima-scholar-search'].get('args', [])
    if existing_args and '$SEARCH_DEST' in existing_args[0]:
        sys.exit(0)  # already correct
    sys.exit(1)  # exists but points elsewhere
sys.exit(1)  # not registered
" 2>/dev/null; then
        echo "  MCP: prima-scholar-search — already registered (correct path)"
    else
        if [ -f "$SEARCH_DEST/start.sh" ]; then
            echo "  MCP: prima-scholar-search — registering..."
            python3 -c "
import json
with open('$CLAUDE_JSON') as f:
    d = json.load(f)
d.setdefault('mcpServers', {})
# Preserve existing env vars if re-registering
existing_env = d['mcpServers'].get('prima-scholar-search', {}).get('env', {})
d['mcpServers']['prima-scholar-search'] = {
    'type': 'stdio',
    'command': '$SEARCH_DEST/start.sh',
    'env': {
        'CROSSREF_MAILTO': existing_env.get('CROSSREF_MAILTO', ''),
        'OPENALEX_MAILTO': existing_env.get('OPENALEX_MAILTO', '')
    }
}
with open('$CLAUDE_JSON', 'w') as f:
    json.dump(d, f, indent=2)
print('    registered → $SEARCH_DEST/start.sh')
"
        else
            echo "  MCP: prima-scholar-search — not installed, skipping registration"
        fi
    fi

    # Register library server
    if python3 -c "
import json, sys
with open('$CLAUDE_JSON') as f:
    d = json.load(f)
servers = d.get('mcpServers', {})
if 'prima-scholar-library' in servers:
    existing_args = servers['prima-scholar-library'].get('args', [])
    if existing_args and '$LIBRARY_DEST' in existing_args[0]:
        sys.exit(0)
    sys.exit(1)
sys.exit(1)
" 2>/dev/null; then
        echo "  MCP: prima-scholar-library — already registered (correct path)"
    else
        if [ -f "$LIBRARY_DEST/start.sh" ]; then
            echo "  MCP: prima-scholar-library — registering..."
            python3 -c "
import json
with open('$CLAUDE_JSON') as f:
    d = json.load(f)
d.setdefault('mcpServers', {})
existing_env = d['mcpServers'].get('prima-scholar-library', {}).get('env', {})
d['mcpServers']['prima-scholar-library'] = {
    'type': 'stdio',
    'command': '$LIBRARY_DEST/start.sh',
    'env': {
        'RESEARCH_LIBRARY_PATH': existing_env.get('RESEARCH_LIBRARY_PATH', '~/.research-library/library.db')
    }
}
with open('$CLAUDE_JSON', 'w') as f:
    json.dump(d, f, indent=2)
print('    registered → $LIBRARY_DEST/start.sh')
"
        else
            echo "  MCP: prima-scholar-library — not installed, skipping registration"
        fi
    fi
fi

echo ""
echo "Done. Restart Claude Code to load new commands and MCP servers."
