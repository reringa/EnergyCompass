---
name: mergedev
description: Merge the current feature branch into dev. Use when the user says "merge to dev", "merge into dev", or invokes /mergedev.
disable-model-invocation: true
argument-hint: "[optional: PR title]"
allowed-tools: Bash(git *), Read, Write, Glob, Grep
---

# Merge to dev

Merge the current feature into dev by creating the `.pr-description.md` signal
file, committing, and pushing. The GitHub Action (`claude-to-feature-branch.yml`)
handles PR creation and auto-merge.

## Steps

### 1. Determine the feature name

    BRANCH=$(git branch --show-current)
    # Strip claude/ prefix and -<sessionId> suffix
    # e.g. claude/dark-mode-abc123 → dark-mode

Derive the feature branch name: `feature/<name>`.

### 2. Gather all changes

Fetch and diff against dev to understand what's being merged:

    git fetch origin dev
    git log origin/dev..HEAD --oneline
    git diff origin/dev..HEAD --stat

Also check if a `feature/<name>` branch exists and include its commits:

    git fetch origin feature/<name> 2>/dev/null
    git log origin/dev..origin/feature/<name> --oneline 2>/dev/null

Review ALL changes (not just the latest commit) to write an accurate PR
description.

### 3. Run docs-updater agent

Before writing the PR description, launch the docs-updater agent to ensure all
documentation reflects the changes being merged. Use the Agent tool:

    Launch the docs-updater agent with prompt:
    "Audit and update all project documentation for changes being merged to dev.
     This is a delta audit: focus on files changed since origin/dev.
     Update CLAUDE.md, README, architecture docs, .env.example, API docs,
     and any other documentation that needs to reflect the current codebase."

Wait for the agent to complete. If it committed documentation changes, those
changes will be included in the merge automatically.

### 4. Write `.pr-description.md`

Create `.pr-description.md` at the repo root. If `$ARGUMENTS` is provided, use
it as the PR title. Otherwise, generate a concise title from the changes.

Format:

    ---
    title: Short PR title (under 70 characters)
    ---

    ## Summary
    - 3-5 bullet points explaining what changed and why

    ## What's new
    - User-facing changes described in plain language

    ## Technical changes
    - Key implementation details, files changed, architectural decisions

    ## How to test
    - Steps to verify the feature works correctly

### 5. Commit and push

    git add .pr-description.md
    git commit -m "chore: trigger auto-merge to dev"
    git push -u origin <current-branch>

### 6. Inform the user

Tell the user:
- The auto-merge has been triggered
- The GitHub Action will create a PR from `feature/<name>` → `dev` and merge it
- If there are merge conflicts, the PR will be left open with resolution
  instructions
- The feature branch will be cleaned up automatically

### 7. Generate session summary

Generate a flat, easy-to-copy-paste session summary under the heading
"Session Summary (copy-paste into your next session)" as a fenced text block.
Include ALL sections:

    SESSION SUMMARY: [Feature Name]
    Branch: claude/[branch-name] → feature/[name] → merged to dev
    Date: [today's date]

    WHAT WAS DONE (in order):
    WHAT WORKED:
    WHAT DIDN'T WORK:
    KEY DECISIONS:
    FILES CHANGED:
    CURRENT STATE:
    OPEN QUESTIONS / NEXT STEPS:

### 8. Update memory files if warranted

If the session revealed broadly useful lessons (new conventions, gotchas, etc.),
update CLAUDE.md. Do NOT add feature-specific WIP notes.
