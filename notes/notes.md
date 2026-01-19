# Notes System Documentation

> **This file explains the notes system. DO NOT DELETE this file.**

---

## Purpose

The `notes/` folder provides persistent storage for AI agent observations, decisions, work-in-progress thoughts, and context that needs to survive context resets or session boundaries.

Think of this as a shared scratchpad between all agents (and the user) working on this project.

---

## When to Create a Note

Create a note when:
- You need to preserve context for a future session
- You're documenting a decision or architectural choice
- You're in the middle of a complex task and may lose context
- You discover something important that future agents should know
- You're blocked and need to document the blocker for later
- You want to leave observations about code, patterns, or issues

---

## Note File Naming Convention

**Format**: `AGENTNAME_YYYYMMDD_topic.md`

**Examples**:
- `Claude_20250118_memory-system-design.md`
- `GPT4_20250119_api-endpoint-decisions.md`
- `Llama_20250120_testing-blockers.md`
- `User_20250118_personal-preferences.md`

**Rules**:
- Use your agent/model name (Claude, GPT-4, Llama, Gemini, User, etc.)
- Use YYYYMMDD date format
- Use lowercase-hyphenated topic description
- Keep topic descriptions short but descriptive

---

## Note Content Template

```markdown
# [Topic Title]

**Agent**: [Your identifier - Claude, GPT-4, User, etc.]
**Timestamp**: [ISO 8601 format: 2025-01-18T14:30:00Z]
**Status**: [In Progress | Complete | Blocked | For Reference]

---

## Summary
[Brief 1-2 sentence summary of what this note contains]

---

## Content
[Main content of your note - observations, decisions, work-in-progress, etc.]

---

## Next Steps (if applicable)
[What needs to happen next with this information]

---

## Related Files (if applicable)
[List any files this note relates to]
```

---

## CRITICAL: Cleanup Rule

> **When a note is no longer needed, DELETE IT.**

Notes must be deleted when:
- The task documented in the note is complete
- The information has been incorporated elsewhere (into code, docs, etc.)
- The note is stale and no longer relevant
- The blocker described in the note has been resolved

**Why?**
- Stale notes create confusion
- Future agents may act on outdated information
- A clean notes folder is easier to navigate
- Notes are for temporary/working information, not permanent documentation

**Permanent information should go in:**
- `CLAUDE.md` or `AGENTS.md` for project standards
- `TODO.md` for task tracking
- Code comments for code-specific documentation
- `docs/` folder for actual documentation

---

## Reading Notes Before Work

**Before starting any significant work**, check the `notes/` folder:

1. Look for notes related to your task
2. Check for blockers or warnings left by other agents
3. Review any recent notes for context
4. Look for notes you may have left in a previous session

---

## Examples of Good Notes

### Example 1: Work in Progress
```markdown
# Memory System Implementation Progress

**Agent**: Claude
**Timestamp**: 2025-01-18T10:00:00Z
**Status**: In Progress

---

## Summary
Documenting progress on memory system before context clear.

---

## Content
Completed:
- Schema design for memories table
- Basic CRUD operations
- Encryption utility integrated

In progress:
- Memory search by relevance (50% complete)
- Need to implement vector similarity search

Decisions made:
- Using pgvector for similarity search
- Memory expiration set to 90 days default

---

## Next Steps
1. Complete vector similarity search integration
2. Add memory categorization
3. Write unit tests

---

## Related Files
- src/services/memory.ts
- src/database/schema/memories.ts
```

### Example 2: Blocker Documentation
```markdown
# Blocked: SMS Provider Rate Limits

**Agent**: GPT-4
**Timestamp**: 2025-01-19T16:45:00Z
**Status**: Blocked

---

## Summary
Cannot proceed with SMS testing due to rate limit issues.

---

## Content
The Twilio test account has hit rate limits during integration testing.
Error: `Error 20429: Too Many Requests`

Tried:
- Waiting 1 hour (still limited)
- Reducing test batch size
- Using different test numbers

---

## Next Steps
Need user to either:
1. Upgrade Twilio account
2. Request rate limit increase
3. Provide alternative test credentials

---

## Related Files
- src/integrations/sms/twilio.ts
- tests/integration/sms.test.ts
```

### Example 3: Decision Record
```markdown
# Decision: Authentication Strategy

**Agent**: Claude
**Timestamp**: 2025-01-18T09:30:00Z
**Status**: Complete

---

## Summary
Recording architectural decision for authentication.

---

## Content
Evaluated options:
1. Session-based auth
2. JWT with refresh tokens
3. OAuth 2.0 only

**Decision**: JWT with refresh tokens

**Rationale**:
- Stateless for API scalability
- Refresh tokens allow secure long sessions
- Works well with mobile/web clients
- Can add OAuth providers later

**Trade-offs accepted**:
- Need to handle token storage securely on client
- Revocation requires token blocklist

---

## Next Steps
This note can be deleted after implementation is complete
and decision is documented in code/architecture docs.
```

---

## Notes vs Other Documentation

| Type | Use For | Location |
|------|---------|----------|
| Notes | Temporary work, blockers, WIP context | `notes/` |
| Project Standards | Permanent guidelines, conventions | `CLAUDE.md`, `AGENTS.md` |
| Tasks | Trackable work items, progress | `TODO.md` |
| Code Docs | API documentation, architecture | `docs/` |
| Code Comments | Implementation details | In source files |

---

## Note Maintenance

This notes folder should be:
- Regularly cleaned of completed/stale notes
- Organized with clear, descriptive filenames
- Checked before starting new work
- Used actively, not as an archive

**A good notes folder has 0-10 active notes, not dozens of stale ones.**
