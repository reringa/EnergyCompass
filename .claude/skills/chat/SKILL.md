---
name: chat
description: Think, brainstorm, and discuss without modifying the repo. No branches, no commits, no pushes, just conversation.
disable-model-invocation: true
argument-hint: "<topic or question>"
allowed-tools: Read, Glob, Grep, WebSearch, WebFetch
---

# Chat

Pure conversation mode. Think, brainstorm, and discuss without touching the
repository. Nothing gets committed, pushed, or deployed.

`$ARGUMENTS` contains the topic or question to discuss.

## Rules

### What you MUST NOT do

- **No git operations**: no commits, no pushes, no branch creation, no merges
- **No file writes or edits**: do not create, modify, or delete any files
- **No bash commands**: do not run shell commands of any kind
- **No skill chaining**: do not invoke other skills (like /feature or /mergedev)

### What you CAN do

- **Read code** for context: reference files, search the codebase, understand
  architecture
- **Research**: search the web, look things up, reason through problems,
  explore ideas
- **Discuss**: answer questions, explain trade-offs, propose approaches,
  challenge assumptions

## Behavior

If the session-start hook already initialized a branch, that's fine; ignore
it. Do not push any further commits.

If the user asks you to make changes during the conversation, remind them
that you're in chat mode. Suggest they start a new session or use `/feature`
if they want to implement something.

Focus entirely on the conversation. Be a thinking partner, not a code
generator.
