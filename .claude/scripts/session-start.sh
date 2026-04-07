#!/usr/bin/env bash
set -euo pipefail

# Auto-initialize feature branches on session start.
# If the feature branch exists, merge previous work. If not, push an init
# commit to trigger the GitHub Action (creates feature branch + Railway env).
BRANCH=$(git branch --show-current 2>/dev/null || echo "")
if [[ "$BRANCH" == claude/* ]]; then
  WITHOUT_PREFIX="${BRANCH#claude/}"
  FEATURE_NAME="${WITHOUT_PREFIX%-*}"
  FEATURE_BRANCH="feature/$FEATURE_NAME"

  if git fetch origin "$FEATURE_BRANCH" 2>/dev/null; then
    # Feature branch exists: merge previous work
    if git merge "origin/$FEATURE_BRANCH" --no-edit 2>/dev/null; then
      echo "Merged $FEATURE_BRANCH into local branch. Previous feature work is available."
    else
      git merge --abort 2>/dev/null || true
      echo "Warning: Could not auto-merge $FEATURE_BRANCH. You may need to merge manually."
    fi

    # Show Railway preview URL if environment already exists
    RAILWAY_URL=$(git show "origin/$FEATURE_BRANCH:.railway-url" 2>/dev/null || echo "")
    if [[ -n "$RAILWAY_URL" ]]; then
      echo ""
      echo "=========================================="
      echo "  Railway preview: $RAILWAY_URL"
      echo "=========================================="
    fi
  else
    # Feature branch doesn't exist yet: auto-initialize
    echo "Auto-initializing feature: $FEATURE_NAME"

    # Clean up stale signal files from a previous /mergedev
    if [ -f ".pr-description.md" ]; then
      git rm .pr-description.md
      git commit -m "chore: clean up stale signal file from previous merge"
    fi

    # Configure git identity
    git config user.name "claude-code[bot]" 2>/dev/null || true
    git config user.email "claude-code[bot]@users.noreply.github.com" 2>/dev/null || true

    # Create init commit (real file change required; paths-ignore skips empty commits)
    date -u > .harness-init
    git add .harness-init
    git commit -m "chore: initialize feature branch ($FEATURE_NAME)"

    # Push with retry (exponential backoff: 2s, 4s, 8s, 16s)
    MAX_RETRIES=4
    RETRY_DELAY=2
    PUSH_OK=false
    for i in $(seq 1 $MAX_RETRIES); do
      if git push -u origin "$BRANCH" 2>&1; then
        PUSH_OK=true
        break
      fi
      if [ "$i" -lt "$MAX_RETRIES" ]; then
        sleep $RETRY_DELAY
        RETRY_DELAY=$((RETRY_DELAY * 2))
      fi
    done

    if $PUSH_OK; then
      echo "Pushed to $BRANCH; Railway environment is being provisioned."
    else
      echo "Warning: push failed after $MAX_RETRIES retries. You may need to push manually."
    fi
  fi
fi

cat <<'HARNESS'
<EXTREMELY_IMPORTANT>
You have Superpowers.
**RIGHT NOW, go read**: .claude/skills/getting-started/SKILL.md
</EXTREMELY_IMPORTANT>
HARNESS
