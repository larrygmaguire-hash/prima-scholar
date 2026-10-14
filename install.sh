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
#   5. Registers MCP servers in ~/.claude.json pointing to workspace copies,
#      keeping any env variables (API keys, contact emails) already set there
#   6. Adds the two MCP server directories to the workspace .gitignore
#
# Requires bash and python3 (python3 reads and writes ~/.claude.json).
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

# Abort if running from inside the target workspace (nested git repo risk)
case "$SCRIPT_DIR" in
    "$TARGET"/*)
        echo "ERROR: prima-scholar is cloned inside the workspace ($TARGET)."
        echo ""
        echo "This creates a nested git repository. Git will commit it as an embedded"
        echo "repo rather than tracking the files, causing warnings and broken clones."
        echo ""
        echo "Fix: move prima-scholar outside the workspace and run again."
        echo ""
        echo "  mv $SCRIPT_DIR ~/Developer/prima-scholar"
        echo "  ~/Developer/prima-scholar/install.sh $TARGET"
        echo ""
        exit 1
        ;;
esac

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

    if [ -d "$TARGET/.claude/skills/$name" ]; then
        rm -rf "$TARGET/.claude/skills/$name"
        cp -r "$skill_dir" "$TARGET/.claude/skills/$name"
        echo "  skill: $name (updated)"
    else
        cp -r "$skill_dir" "$TARGET/.claude/skills/$name"
        echo "  skill: $name"
    fi
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
        cp "$agent" "$TARGET/.claude/agents/$name"
        echo "  agent: $name (updated)"
    else
        cp "$agent" "$TARGET/.claude/agents/$name"
        echo "  agent: $name"
    fi
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
    # Register each server. An entry that already points at the workspace copy
    # is left alone. Otherwise the entry is rewritten to point at start.sh,
    # keeping every env variable already set (API keys, contact emails, library
    # path) and adding only the defaults that are missing. Paths are passed as
    # arguments, not interpolated into the Python source.
    register_server() {
        local name="$1" dest="$2" defaults="$3"
        if [ ! -f "$dest/start.sh" ]; then
            echo "  MCP: $name — not installed, skipping registration"
            return 0
        fi
        python3 - "$CLAUDE_JSON" "$name" "$dest" "$defaults" << 'PYEOF'
import json
import sys

config_path, name, dest, defaults = sys.argv[1], sys.argv[2], sys.argv[3], json.loads(sys.argv[4])
command = dest + "/start.sh"

with open(config_path) as f:
    d = json.load(f)

servers = d.setdefault("mcpServers", {})
existing = servers.get(name)
if isinstance(existing, dict):
    args = existing.get("args") or []
    if existing.get("command") == command or (args and dest in str(args[0])):
        print(f"  MCP: {name} — already registered (correct path)")
        sys.exit(0)

entry = dict(existing) if isinstance(existing, dict) else {}
env = dict(entry.get("env") or {})
for key, value in defaults.items():
    env.setdefault(key, value)
entry.pop("args", None)
entry["type"] = "stdio"
entry["command"] = command
entry["env"] = env
servers[name] = entry

with open(config_path, "w") as f:
    json.dump(d, f, indent=2)
print(f"  MCP: {name} — registered → {command}")
PYEOF
    }

    register_server "prima-scholar-search" "$SEARCH_DEST" \
        '{"CROSSREF_MAILTO": "", "OPENALEX_MAILTO": ""}'
    register_server "prima-scholar-library" "$LIBRARY_DEST" \
        '{"RESEARCH_LIBRARY_PATH": "~/.research-library/library.db"}'
fi

# --- Gitignore ---

GITIGNORE="$TARGET/.gitignore"
GITIGNORE_ENTRIES=(
    ".claude/mcp-servers/prima-scholar-search/"
    ".claude/mcp-servers/prima-scholar-library/"
)

if [ -f "$GITIGNORE" ]; then
    ADDED=0
    for entry in "${GITIGNORE_ENTRIES[@]}"; do
        if ! grep -qxF "$entry" "$GITIGNORE"; then
            echo "$entry" >> "$GITIGNORE"
            ADDED=$((ADDED + 1))
        fi
    done
    if [ $ADDED -gt 0 ]; then
        echo "  .gitignore: added $ADDED MCP server entries"
    else
        echo "  .gitignore: MCP server entries already present"
    fi
else
    echo "  .gitignore: not found — add these entries manually to avoid committing MCP server files:"
    for entry in "${GITIGNORE_ENTRIES[@]}"; do
        echo "    $entry"
    done
fi

echo ""
echo "Done. Restart Claude Code to load new commands and MCP servers."
