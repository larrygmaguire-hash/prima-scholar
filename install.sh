#!/usr/bin/env bash
# PRIMA Scholar — Install commands, skills, and agents into a Claude Code workspace
#
# Usage:
#   ./install.sh                    # installs to current directory
#   ./install.sh /path/to/workspace # installs to specified workspace
#
# What it does:
#   1. Copies slash commands to .claude/commands/
#   2. Copies skills to .claude/skills/
#   3. Copies agents to .claude/agents/
#   4. Registers MCP servers in ~/.claude.json (if not already present)
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

# --- MCP Server Registration ---

CLAUDE_JSON="$HOME/.claude.json"
SEARCH_SERVER="$SCRIPT_DIR/mcp-servers/prima-scholar-search-mcp/build/index.js"
LIBRARY_SERVER="$SCRIPT_DIR/mcp-servers/prima-scholar-library-mcp/build/index.js"

if [ ! -f "$CLAUDE_JSON" ]; then
    echo "  WARNING: ~/.claude.json not found — skipping MCP registration"
    echo "  Add MCP servers manually per the README"
else
    # Check if search server is already registered
    if python3 -c "
import json, sys
with open('$CLAUDE_JSON') as f:
    d = json.load(f)
servers = d.get('mcpServers', {})
if 'prima-scholar-search' in servers:
    sys.exit(0)
sys.exit(1)
" 2>/dev/null; then
        echo "  MCP: prima-scholar-search — already registered"
    else
        if [ -f "$SEARCH_SERVER" ]; then
            echo "  MCP: prima-scholar-search — registering..."
            python3 -c "
import json
with open('$CLAUDE_JSON') as f:
    d = json.load(f)
d.setdefault('mcpServers', {})
d['mcpServers']['prima-scholar-search'] = {
    'type': 'stdio',
    'command': 'node',
    'args': ['$SEARCH_SERVER'],
    'env': {
        'CROSSREF_MAILTO': d['mcpServers'].get('prima-scholar-search', {}).get('env', {}).get('CROSSREF_MAILTO', ''),
        'OPENALEX_MAILTO': d['mcpServers'].get('prima-scholar-search', {}).get('env', {}).get('OPENALEX_MAILTO', '')
    }
}
with open('$CLAUDE_JSON', 'w') as f:
    json.dump(d, f, indent=2)
print('    registered')
"
        else
            echo "  MCP: prima-scholar-search — build not found. Run: cd mcp-servers/prima-scholar-search-mcp && npm run build"
        fi
    fi

    # Check if library server is already registered
    if python3 -c "
import json, sys
with open('$CLAUDE_JSON') as f:
    d = json.load(f)
servers = d.get('mcpServers', {})
if 'prima-scholar-library' in servers:
    sys.exit(0)
sys.exit(1)
" 2>/dev/null; then
        echo "  MCP: prima-scholar-library — already registered"
    else
        if [ -f "$LIBRARY_SERVER" ]; then
            echo "  MCP: prima-scholar-library — registering..."
            python3 -c "
import json
with open('$CLAUDE_JSON') as f:
    d = json.load(f)
d.setdefault('mcpServers', {})
d['mcpServers']['prima-scholar-library'] = {
    'type': 'stdio',
    'command': 'node',
    'args': ['$LIBRARY_SERVER'],
    'env': {
        'RESEARCH_LIBRARY_PATH': '~/.research-library/library.db'
    }
}
with open('$CLAUDE_JSON', 'w') as f:
    json.dump(d, f, indent=2)
print('    registered')
"
        else
            echo "  MCP: prima-scholar-library — build not found. Run: cd mcp-servers/prima-scholar-library-mcp && npm run build"
        fi
    fi
fi

echo ""
echo "Done. Restart Claude Code to load new commands and MCP servers."
