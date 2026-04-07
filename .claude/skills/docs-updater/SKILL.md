---
name: docs-updater
description: Audit and auto-fix project documentation against code. Finds undocumented features, stale references, and missing cross-references.
disable-model-invocation: true
argument-hint: "[optional: 'recent' for delta check, or a git ref like 'v1.2.0']"
allowed-tools: Bash(git *), Read, Glob, Grep, Edit, Write
---

# Update project documentation

Scan the project's documentation and cross-reference it against the actual
codebase. Find gaps, stale references, and missing documentation, then
auto-fix what can be fixed unambiguously.

`$ARGUMENTS` optionally contains a scope:
- Empty: full audit of all documentation
- `recent`: audit only files changed since the last merge to dev
- A git ref (tag, branch, SHA): audit files changed since that ref

## Steps

### 1. Determine scope

**Full audit** (no arguments):

    SCOPE="full"
    echo "Running full documentation audit"

**Delta check** (`recent` or a git ref):

    git fetch origin dev
    if [ "$ARGUMENTS" = "recent" ]; then
      BASE=$(git merge-base HEAD origin/dev)
    else
      BASE="$ARGUMENTS"
    fi
    CHANGED_FILES=$(git diff --name-only "$BASE"..HEAD)
    SCOPE="delta"
    echo "Auditing docs related to changed files since $BASE"

For delta mode, the changed files determine which documentation to audit.
A change to `app/api/chat/route.ts` means you should check whether the
chat API is documented. A change to `package.json` means you should check
whether new dependencies are mentioned in docs.

### 2. Inventory documentation

Find all documentation files in the project:

    # Markdown docs
    find . -name '*.md' -not -path './node_modules/*' -not -path './.git/*'

    # Environment documentation
    find . -name '.env.example' -o -name '.env.sample'

    # Config docs (if they contain comments)
    find . -name '*.config.*' -not -path './node_modules/*'

Read each documentation file and build a mental map of what topics each
file covers. Pay attention to:
- README.md: project overview, features list, setup instructions
- CLAUDE.md / AGENTS.md: AI agent instructions, project architecture
- docs/ directory: detailed guides and references
- .env.example: documented environment variables
- API docs: endpoint documentation (OpenAPI, inline, or markdown)
- CHANGELOG.md: feature history

If running in delta mode, focus on docs that are likely affected by the
changed files, but still scan all docs for cross-reference integrity.

### 3. Inventory code surface

Scan the codebase for documentable surfaces. Adapt the patterns to the
project's framework (these are common patterns, not exhaustive):

**API routes and endpoints:**

    # Next.js App Router
    find . -path '*/api/*/route.*' -not -path './node_modules/*'

    # Express / Hono / Fastify
    grep -rn 'app\.\(get\|post\|put\|patch\|delete\|use\)(' --include='*.ts' --include='*.js' | grep -v node_modules

    # Any framework: look for route definitions
    grep -rn 'router\.\|app\.\(get\|post\|put\|delete\)' --include='*.ts' --include='*.js' | grep -v node_modules

**Environment variables used in code:**

    grep -rn 'process\.env\.\|Bun\.env\.\|import\.meta\.env\.' --include='*.ts' --include='*.js' --include='*.tsx' --include='*.jsx' | grep -v node_modules | grep -oP '(process\.env|Bun\.env|import\.meta\.env)\.\w+'  | sort -u

**Dependencies** (read the manifest file):

    # Node.js
    cat package.json | grep -A 999 '"dependencies"' | grep -B 999 '}'

    # Python
    cat requirements.txt 2>/dev/null || cat pyproject.toml 2>/dev/null

**Exported modules and components:**

    grep -rn '^export ' --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' | grep -v node_modules | head -50

**Middleware, auth, database, and architectural patterns:**

    # Look for middleware
    grep -rn 'middleware\|rateLimit\|auth\|cors\|helmet' --include='*.ts' --include='*.js' | grep -v node_modules

    # Look for database usage
    grep -rn 'prisma\|drizzle\|sequelize\|mongoose\|pg\|Pool\|createClient' --include='*.ts' --include='*.js' | grep -v node_modules

Build a list of all discoverable code surfaces. Group them by category:
API endpoints, env vars, dependencies, components, middleware/infra.

### 4. Cross-reference audit

Compare the documentation inventory (step 2) against the code inventory
(step 3). Check these six dimensions:

**A. Features coverage**

For each significant code feature (API endpoint, component, middleware,
service), check whether it appears in at least one documentation file.
A "feature" is significant if it has its own file, directory, or route.

Flag: features present in code but missing from all documentation.

**B. API endpoint documentation**

For each API route found in code, verify:
- Is the endpoint mentioned in README or API docs?
- Are the HTTP method, path, and purpose documented?
- Are request/response formats described?
- Are error codes and rate limits mentioned (if applicable)?

Flag: endpoints that exist in code but have no documentation.

**C. Environment variables**

Compare env vars used in code against `.env.example` and setup docs:
- Every `process.env.X` in code should appear in `.env.example`
- Every var in `.env.example` should have a comment explaining its purpose
- Setup/deployment docs should mention required env vars

Flag: env vars in code but missing from `.env.example` or docs.

**D. Dependencies**

For production dependencies (not devDependencies), check whether key
ones are mentioned in architecture or setup docs. Focus on:
- Frameworks (Express, Next.js, React, etc.)
- Databases (pg, prisma, drizzle, mongoose)
- External services (AWS SDK, Stripe, Anthropic, etc.)
- Non-obvious deps that affect setup (native modules, etc.)

Flag: significant deps not mentioned in any documentation.

**E. Internal link integrity**

For every markdown link in documentation files:
- `[text](./path/to/file.md)` - verify the target file exists
- `[text](#heading)` - verify the heading anchor exists in the same file
- `[text](./path/to/file.md#heading)` - verify both file and heading

Flag: broken links pointing to non-existent files or headings.

**F. CLAUDE.md / AGENTS.md accuracy**

If the project has AI agent instruction files, verify they reflect the
current state:
- Do they mention the correct framework and tech stack?
- Do they reference files and directories that actually exist?
- Are the described patterns still accurate?

Flag: stale references to renamed/deleted files or outdated patterns.

### 5. Auto-fix

For each issue found, apply fixes automatically where unambiguous:

**Unambiguous fixes (apply directly):**
- Add missing env vars to `.env.example` with a `# TODO: add description`
  comment
- Fix broken internal markdown links when the target file was clearly
  renamed (same name, different directory)
- Add missing API endpoints to an existing API documentation section
- Update dependency lists in docs to match current package manifest

**Ambiguous fixes (add TODO markers):**
- Features that need a prose description: add
  `<!-- TODO: document [feature name] -->` in the appropriate doc section
- Architectural changes that need human judgment: add a TODO comment
- Files where the correct documentation location is unclear: note it in
  the report

**New documentation (create if missing):**
- If `.env.example` doesn't exist but env vars are used in code, create it
- If no API documentation exists but the project has 3+ API endpoints,
  create a stub `docs/api.md` with endpoint listings

When editing existing docs, preserve the file's existing style and
formatting. Insert new content in the most logical location (e.g., add a
new feature to an existing features list, not at the end of the file).

### 6. Report and commit

Present a summary of all findings and actions:

    DOCS AUDIT REPORT
    =================

    Scope: [full / delta since <ref>]
    Files scanned: [N] documentation files, [M] source files

    Fixed automatically:
      - Added REDIS_URL to .env.example
      - Added /api/chat endpoint to docs/api.md
      - Fixed broken link in README.md (old-path.md -> new-path.md)

    Needs manual attention:
      - Rate limiting middleware (lib/rate-limit.ts) has no documentation
        <!-- TODO added to README.md -->
      - CLAUDE.md references "Express app" but project uses Hono
      - New dependency @anthropic-ai/sdk not mentioned in architecture docs

    No issues found:
      - All env vars documented ✓
      - All internal links valid ✓

If any files were modified, stage and commit them:

    git add -A
    git commit -m "docs: update documentation to match codebase"

If nothing was changed, inform the user that documentation is consistent.
