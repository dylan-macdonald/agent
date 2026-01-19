# CLAUDE.md - AI Personal Assistant Project Hub

> **DO NOT MODIFY THIS FILE UNLESS EXPLICITLY ASKED TO BY THE USER.**
> This document serves as the central reference for all AI agents working on this project.

---

## INDEX

| Section | Description | Jump Link |
|---------|-------------|-----------|
| **1. Project Overview** | Mission, vision, and scope | [Go](#1-project-overview) |
| **2. Architecture** | System design and components | [Go](#2-architecture) |
| **3. Security Requirements** | Privacy and data protection standards | [Go](#3-security-requirements) |
| **4. Code Standards** | Quality, consistency, and style guidelines | [Go](#4-code-standards) |
| **5. Frontend Skills** | UI/UX design guidelines (Claude frontend-design skill) | [Go](#5-frontend-skills) |
| **6. Testing Requirements** | Comprehensive testing at every phase | [Go](#6-testing-requirements) |
| **7. Agent Guidelines** | How AI agents should operate on this project | [Go](#7-agent-guidelines) |
| **8. Troubleshooting & Recovery** | When stuck, how to reset and recover | [Go](#8-troubleshooting--recovery) |
| **9. Notes System** | How to use the notes/ folder | [Go](#9-notes-system) |
| **10. Commands & Scripts** | Common commands for development | [Go](#10-commands--scripts) |
| **11. File Structure** | Project directory layout | [Go](#11-file-structure) |
| **12. Change Log Protocol** | How to log changes to documentation | [Go](#12-change-log-protocol) |

---

## 1. Project Overview

### Mission
Build a comprehensive AI-powered personal assistant that acts as a proactive digital companion - handling scheduling, reminders, health tracking, goal management, and daily task support with minimal user intervention.

### Vision
Create a genuine, daily-use tool that combines the capabilities of:
- **Personal Assistant**: Scheduling, planning, reminders, task management
- **Digital Trainer/Diet Coach**: Health tracking, exercise guidance, nutrition advice
- **Physical Therapist Guide**: Movement reminders, posture checks, stretch recommendations
- **ADHD Body Double**: Accountability, task breakdown, focus support, gentle nudges
- **Supportive Friend**: Emotional check-ins, encouragement, celebrating wins

### Core Capabilities

| Capability | Description |
|------------|-------------|
| **Memory System** | Remember user preferences, history, patterns, and personal details |
| **Proactive Communication** | Self-initiating reminders and check-ins without user prompting |
| **SMS/Text Integration** | Send reminders, receive responses, two-way communication |
| **Remote PC Access** | Control home computer while user is away |
| **Sleep/Wake Logging** | Track and log daily rhythms automatically |
| **Goal Tracking** | Monitor progress on projects, habits, and long-term objectives |
| **Health Monitoring** | Diet logging, exercise tracking, wellness reminders |
| **Context Awareness** | Understand user's schedule, location, and current priorities |

### Design Philosophy
- **No Shortcuts**: Every feature built properly, no half-measures
- **Security First**: All data in transit must be encrypted and protected
- **Genuine Utility**: Real tool for daily use, not a demo or prototype
- **No Dummy Data**: Only use placeholder data for testing purposes
- **Proactive, Not Reactive**: Assistant should anticipate needs

---

## 2. Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI PERSONAL ASSISTANT                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Core AI   │  │   Memory    │  │  Scheduler  │              │
│  │   Engine    │◄─┤   System    │◄─┤   Service   │              │
│  └──────┬──────┘  └─────────────┘  └─────────────┘              │
│         │                                                        │
│  ┌──────▼──────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Communication│  │   Health    │  │   Remote    │              │
│  │   Gateway   │  │   Tracker   │  │  PC Agent   │              │
│  └──────┬──────┘  └─────────────┘  └─────────────┘              │
│         │                                                        │
│  ┌──────▼──────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  SMS/Text   │  │   Web UI    │  │   Mobile    │              │
│  │  Interface  │  │  Dashboard  │  │     App     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack (Recommended)
- **Backend**: Node.js/TypeScript or Python with FastAPI
- **Frontend**: React + TypeScript + Tailwind CSS
- **Database**: PostgreSQL for structured data, Redis for caching
- **Message Queue**: For async task processing
- **SMS Provider**: Twilio or similar (with encryption layer)
- **Authentication**: OAuth 2.0 + JWT with refresh tokens
- **Encryption**: AES-256 for data at rest, TLS 1.3 for transit

---

## 3. Security Requirements

### CRITICAL: Security is Non-Negotiable

> **Any data leaving the local machine or cloud must be secured. Data in transit is the primary vulnerability. No shortcuts on privacy.**

### Security Standards

| Requirement | Implementation |
|-------------|----------------|
| **Data at Rest** | AES-256 encryption for all stored personal data |
| **Data in Transit** | TLS 1.3 minimum, certificate pinning where applicable |
| **Authentication** | Multi-factor authentication, secure token rotation |
| **API Security** | Rate limiting, input validation, OWASP Top 10 compliance |
| **Secrets Management** | Environment variables, never hardcoded, use vault services |
| **Audit Logging** | All access to sensitive data must be logged |
| **Key Rotation** | Regular rotation of encryption keys and API tokens |

### User Alert Protocol
If an agent encounters a security concern that requires user action:
1. **STOP** current operation
2. **DOCUMENT** the concern clearly
3. **ALERT** the user with specific required actions
4. **WAIT** for user confirmation before proceeding

### Prohibited Actions
- Never store plaintext passwords or sensitive tokens
- Never transmit data over unencrypted channels
- Never log sensitive user data (PII, health info, etc.)
- Never use HTTP when HTTPS is available
- Never disable security features for convenience

---

## 4. Code Standards

### Quality Guidelines

```typescript
// GOOD: Clear, typed, documented where non-obvious
interface UserPreference {
  id: string;
  category: PreferenceCategory;
  value: unknown;
  lastUpdated: Date;
}

async function getUserPreferences(userId: string): Promise<UserPreference[]> {
  // Validate input at system boundary
  if (!isValidUserId(userId)) {
    throw new ValidationError('Invalid user ID format');
  }

  return await preferenceRepository.findByUserId(userId);
}

// BAD: Untyped, unclear, over-commented
function getPrefs(id) {  // Gets user preferences
  // Check if id exists
  if (id) {
    // Return preferences from database
    return db.query('SELECT * FROM prefs WHERE user_id = ?', [id]);  // SQL query
  }
}
```

### Style Rules

| Rule | Standard |
|------|----------|
| **Language** | TypeScript preferred, strict mode enabled |
| **Formatting** | Prettier with project config |
| **Linting** | ESLint with recommended + strict rules |
| **Naming** | camelCase functions/variables, PascalCase types/classes |
| **Imports** | Absolute imports from `@/` prefix |
| **Error Handling** | Typed errors, no silent catches |
| **Comments** | Only where logic isn't self-evident |

### Avoid Over-Engineering
- Don't add features beyond what's requested
- Don't create abstractions for one-time operations
- Don't add error handling for impossible scenarios
- Don't design for hypothetical future requirements
- Three similar lines of code > premature abstraction

### Git Practices
- Meaningful commit messages describing WHY
- One logical change per commit
- Never commit secrets or sensitive data
- Branch naming: `feature/`, `fix/`, `refactor/`

---

## 5. Frontend Skills

> Integrated from Claude's official `frontend-design` skill for creating distinctive, production-grade interfaces.

### Design Philosophy
Create interfaces that avoid generic "AI slop" aesthetics. Every design should be memorable, intentional, and contextually appropriate.

### Before Coding, Define:
1. **Purpose**: What problem does this interface solve? Who uses it?
2. **Tone**: Choose a direction - minimalist, maximalist, retro-futuristic, organic, luxury, playful, editorial, brutalist, art deco, soft/pastel, industrial, etc.
3. **Constraints**: Framework, performance, accessibility requirements
4. **Differentiation**: What makes this UNFORGETTABLE?

### Typography
- Choose beautiful, unique, interesting fonts
- **AVOID**: Arial, Inter, Roboto, system fonts
- Pair distinctive display fonts with refined body fonts
- Let typography carry personality

### Color & Theme
- Commit to a cohesive aesthetic
- Use CSS variables for consistency
- Dominant colors with sharp accents > evenly-distributed palettes
- **AVOID**: Purple gradients on white (AI slop cliche)

### Motion & Animation
- Use animations for delight and feedback
- Prioritize CSS-only solutions for HTML
- Use Framer Motion for React when available
- Focus on high-impact moments: page load, hover states, transitions
- One well-orchestrated animation > scattered micro-interactions

### Spatial Composition
- Unexpected layouts
- Asymmetry and overlap
- Diagonal flow
- Grid-breaking elements
- Generous negative space OR controlled density

### Backgrounds & Visual Details
- Create atmosphere and depth (not solid colors)
- Contextual effects matching the aesthetic
- Techniques: gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, grain overlays

### What NOT to Do
- Generic font families (Inter, Roboto, Arial)
- Clichéd color schemes
- Predictable layouts and patterns
- Cookie-cutter design without context
- Converging on "safe" common choices

### Implementation Principle
Match complexity to vision:
- **Maximalist** = elaborate code, extensive animations
- **Minimalist** = restraint, precision, careful spacing

---

## 6. Testing Requirements

### Testing Philosophy
Every feature must be testable in isolation before integration. Testing is not optional.

### Test Pyramid

```
         ┌───────────┐
         │   E2E     │  ← Critical user flows only
         ├───────────┤
         │Integration│  ← API boundaries, service interactions
         ├───────────┤
         │   Unit    │  ← Business logic, utilities, pure functions
         └───────────┘
```

### Requirements by Phase

| Phase | Minimum Test Coverage |
|-------|----------------------|
| Core Services | 90%+ unit test coverage |
| API Endpoints | Integration tests for all endpoints |
| User Flows | E2E tests for critical paths |
| Security Features | 100% coverage + penetration testing |

### Test Standards
- Colocate unit tests: `*.test.ts` or `__tests__/` folder
- Integration tests in `tests/integration/`
- E2E tests in `tests/e2e/`
- Prefer real tests over heavy mocking
- Test edge cases and error conditions
- Security features require additional fuzzing

### Before Merging
- [ ] All tests pass
- [ ] No decrease in coverage
- [ ] New code has corresponding tests
- [ ] Security-sensitive code reviewed

---

## 7. Agent Guidelines

### Operating Principles

1. **Read Before Write**: Always read and understand existing code before modifying
2. **Track Progress**: Use TodoWrite tool to track tasks and give visibility
3. **Small Steps**: Break large tasks into testable increments
4. **Commit Often**: Save working states frequently
5. **Ask When Unclear**: Use AskUserQuestion when uncertain
6. **Security Conscious**: Always consider security implications
7. **No Shortcuts**: Build it right, not just fast

### Context Management
- Keep CLAUDE.md open/referenced for project standards
- Use `/clear` when context becomes cluttered
- For large tasks: document progress in notes, clear context, continue
- Reference TODO.md for current project phase

### Working with This Repository

```bash
# Before starting work
git pull origin main
git checkout -b feature/your-feature-name

# During work
git add -A && git commit -m "feat: descriptive message"

# When complete
git push origin feature/your-feature-name
```

### Inter-Agent Communication
- Use `notes/` folder for persistent observations
- Always check for existing notes before starting new work
- Document blockers and decisions for future agents

---

## 8. Troubleshooting & Recovery

### When You're Stuck

#### Level 1: Context Refresh
```
Problem: Confusion, looping, or unclear state
Solution: Use /clear command, re-read CLAUDE.md, restart task
```

#### Level 2: Progress Save & Reset
```
Problem: Extended confusion, context overflow
Solution:
1. Document current progress in notes/
2. Commit any working code
3. /clear context
4. Start fresh session referencing notes
```

#### Level 3: Escalate to User
```
Problem: Blocked by external factors, security concerns, unclear requirements
Solution:
1. Document the blocker clearly
2. List what you've tried
3. Ask user for guidance via AskUserQuestion
```

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Terminal hanging | Cancel operation, check for prompts requiring input |
| Infinite loops | Break task into smaller steps, commit working code |
| Context overflow | Document progress, /clear, continue in new session |
| Tests failing | Read error carefully, fix one at a time, don't batch |
| Unclear requirements | Ask user, don't assume |
| Security uncertainty | Stop and alert user |

### Escape Sequences (Technical)
If terminal output becomes corrupted with ANSI escape sequences:
- Disable terminal themes (PowerLevel10k, Oh-My-Zsh themes)
- Use `export TERM=dumb` for clean output
- Reset terminal: `reset` or `tput reset`

### Recovery Protocol
1. `git status` - Check current state
2. `git stash` - Save uncommitted work if needed
3. `git log --oneline -10` - Review recent history
4. Return to known good state if necessary

---

## 9. Notes System

### Purpose
The `notes/` folder provides persistent storage for agent observations, decisions, and work-in-progress thoughts that need to survive context resets.

### Usage Rules

1. **Creating Notes**
   - Filename format: `AGENTNAME_TIMESTAMP_topic.md`
   - Example: `Claude_20250118_memory-system-design.md`
   - Always include agent name and timestamp at the top

2. **Note Content**
   ```markdown
   # Topic Title

   **Agent**: Claude (or agent identifier)
   **Timestamp**: 2025-01-18T14:30:00Z
   **Status**: In Progress | Complete | Blocked

   ## Content
   [Your observations, decisions, or work-in-progress]

   ## Next Steps (if applicable)
   [What needs to happen next]
   ```

3. **Cleanup Rule**
   > **CRITICAL**: When a note is no longer needed (task complete, info incorporated elsewhere), DELETE IT. No stale notes.

4. **Reading Notes**
   - Check `notes/` before starting new work
   - Previous agents may have left important context

### See Also
- `notes/notes.md` - Detailed notes system documentation

---

## 10. Commands & Scripts

### Development Commands
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format

# Build for production
npm run build

# Type check
npm run typecheck
```

### Git Commands
```bash
# Check status
git status

# Create feature branch
git checkout -b feature/name

# Stage and commit
git add -A && git commit -m "type: description"

# Push with upstream
git push -u origin branch-name

# Pull latest
git pull origin main
```

### Useful Shortcuts
```bash
# Run single test file
npm test -- path/to/file.test.ts

# Watch mode for tests
npm test -- --watch

# Verbose output
npm test -- --verbose
```

---

## 11. File Structure

```
/
├── CLAUDE.md           # This file - project hub for Claude agents
├── AGENTS.md           # Model-agnostic version for other AI agents
├── TODO.md             # Phased project breakdown and progress
├── README.md           # Public project documentation
├── package.json        # Node.js dependencies and scripts
├── tsconfig.json       # TypeScript configuration
├── .env.example        # Environment variable template (no secrets!)
├── .gitignore          # Git ignore rules
│
├── src/                # Source code
│   ├── core/           # Core AI engine and logic
│   ├── services/       # Business logic services
│   ├── api/            # API routes and handlers
│   ├── integrations/   # Third-party integrations (SMS, etc.)
│   ├── database/       # Database models and migrations
│   ├── utils/          # Utility functions
│   └── types/          # TypeScript type definitions
│
├── tests/              # Test files
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── e2e/            # End-to-end tests
│
├── docs/               # Additional documentation
│   └── api/            # API documentation
│
└── notes/              # Agent notes folder
    └── notes.md        # Notes system documentation
```

---

## 12. Change Log Protocol

### When Modifying Documentation

Any agent modifying TODO.md, AGENTS.md, or other project documentation must:

1. **Add an entry to the Change Log at the bottom of the file**
2. **Never delete other agents' entries**
3. **Format**:

```markdown
---
## Change Log

| Timestamp | Agent | Summary |
|-----------|-------|---------|
| 2025-01-18T10:00:00Z | Claude | Initial document creation |
| 2025-01-18T14:30:00Z | GPT-4 | Added Phase 3 testing details |
```

### This File's Change Log
> Note: CLAUDE.md should rarely need modification. Log entries here only when explicitly asked to update.

---
## Change Log

| Timestamp | Agent | Summary |
|-----------|-------|---------|
| 2025-01-18T23:55:00Z | Claude (Opus 4.5) | Initial document creation with full project specification |
