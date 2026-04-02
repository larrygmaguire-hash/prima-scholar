# Fix: PRIMA Scholar Nested Repository

This file fixes a PRIMA Scholar installation where the repository was cloned inside the workspace, causing git to track it as an embedded repository.

## Instructions for Claude Code (read and follow these steps in order)

### Step 1: Find the prima-scholar clone inside the workspace

Search the current workspace for a directory named `prima-scholar` that contains a `.git` folder:

```bash
find "$(pwd)" -maxdepth 3 -name ".git" -path "*/prima-scholar/*" -type d 2>/dev/null
```

Note the parent directory path. This is the misplaced clone.

### Step 2: Move the clone outside the workspace

Move it to `~/Developer/prima-scholar`. If `~/Developer/` does not exist, create it first.

```bash
mkdir -p ~/Developer
mv /path/to/prima-scholar ~/Developer/prima-scholar
```

Replace `/path/to/prima-scholar` with the actual path found in Step 1.

If `~/Developer/prima-scholar` already exists, remove it first (`rm -rf ~/Developer/prima-scholar`) and then move.

### Step 3: Remove the embedded repo from git tracking

Git committed a gitlink entry for the nested repo. Remove it from tracking:

```bash
git rm --cached prima-scholar
```

Use the relative path from the workspace root that matches where the directory was. If git says the path is not in the index, try `git ls-files --stage | grep "160000"` to find the gitlink entry and use that path.

### Step 4: Add a safety entry to .gitignore

Append to the workspace's `.gitignore` to prevent this from happening again if the directory reappears:

```bash
echo "" >> .gitignore
echo "# PRIMA Scholar clone (should live outside workspace)" >> .gitignore
echo "prima-scholar/" >> .gitignore
```

Only add this if the entry does not already exist in `.gitignore`.

### Step 5: Rebuild and re-install from the new location

```bash
cd ~/Developer/prima-scholar/mcp-servers/prima-scholar-search-mcp && npm install && npm run build
cd ~/Developer/prima-scholar/mcp-servers/prima-scholar-library-mcp && npm install && npm run build
~/Developer/prima-scholar/install.sh /path/to/workspace
```

Replace `/path/to/workspace` with the actual workspace directory.

### Step 6: Commit the cleanup

Stage and commit the changes (removal of the gitlink entry, updated `.gitignore`):

```bash
git add .gitignore
git commit -m "fix: remove embedded prima-scholar repo, add gitignore entry"
```

### Step 7: Restart Claude Code

Restart Claude Code to load the updated MCP servers.

## After this fix

Future updates follow the standard process: ask Claude Code to update PRIMA Scholar. It will pull, rebuild, and re-install from `~/Developer/prima-scholar` per the instructions in the main README.
