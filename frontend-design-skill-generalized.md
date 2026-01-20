# Frontend Design Skill for AI Agents

A skill guide for AI systems to create distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. The goal is to produce real, working code with exceptional attention to aesthetic details and creative choices.

---

## Overview

When a user requests frontend work—a component, page, application, or interface—the AI agent should generate code that is visually striking, memorable, and production-ready. This skill prevents the common failure mode of AI-generated interfaces: bland, predictable, cookie-cutter designs that all look the same.

---

## Phase 1: Design Thinking

Before generating any code, the agent must reason through the following:

### 1.1 Context Analysis
- **Purpose**: What problem does this interface solve? Who is the target user?
- **Constraints**: Technical requirements (framework, performance, accessibility, browser support)
- **Brand/Tone Cues**: Any explicit or implicit signals about the desired feel

### 1.2 Aesthetic Direction Selection

Commit to a **bold, specific aesthetic direction**. Generic or safe choices produce forgettable output. Choose one or blend intentionally:

| Direction | Characteristics |
|-----------|----------------|
| Brutally Minimal | Maximum whitespace, stark typography, near-zero ornamentation |
| Maximalist Chaos | Dense, layered, overwhelming in a controlled way |
| Retro-Futuristic | Blend of vintage aesthetics with sci-fi elements |
| Organic/Natural | Soft shapes, earthy tones, flowing layouts |
| Luxury/Refined | Expensive feeling, restrained elegance, premium typography |
| Playful/Toy-like | Bright colors, rounded shapes, whimsical interactions |
| Editorial/Magazine | Strong typography hierarchy, dramatic imagery, grid-based |
| Brutalist/Raw | Exposed structure, anti-design, intentionally rough |
| Art Deco/Geometric | Bold geometry, metallic accents, symmetry |
| Soft/Pastel | Gentle colors, rounded corners, calming atmosphere |
| Industrial/Utilitarian | Functional aesthetic, monospace fonts, no-nonsense |
| Cyberpunk/Neon | Dark backgrounds, glowing accents, tech dystopia |
| Neo-Memphis | Bold shapes, clashing colors, 80s revival |

**Key Principle**: Bold maximalism and refined minimalism both succeed—the key is *intentionality*, not intensity. Pick a direction and execute it with precision.

### 1.3 Differentiation Check

Ask: "What is the ONE thing someone will remember about this interface?"

If there's no clear answer, the design isn't distinctive enough. Return to aesthetic selection.

---

## Phase 2: Implementation Standards

Generate working code (HTML/CSS/JS, React, Vue, Svelte, etc.) that meets these criteria:

### 2.1 Typography

**DO**:
- Choose fonts that are beautiful, unique, and characterful
- Pair a distinctive display font with a refined body font
- Use unexpected, memorable typeface combinations
- Leverage variable fonts for fine-tuned weight control

**DO NOT**:
- Default to Inter, Roboto, Arial, or system fonts
- Use the same fonts across different projects
- Rely on generic sans-serifs without justification

**Font Pairing Examples**:
- Display: Playfair Display / Body: Source Sans Pro (editorial)
- Display: Space Mono / Body: Work Sans (technical)
- Display: Fraunces / Body: Inter (warm modern)
- Display: Clash Display / Body: Satoshi (contemporary)

### 2.2 Color & Theme

**DO**:
- Commit to a cohesive, intentional palette
- Use CSS custom properties (variables) for consistency
- Apply dominant colors with sharp, deliberate accents
- Consider dark mode as a first-class option, not an afterthought

**DO NOT**:
- Use timid, evenly-distributed palettes
- Default to purple gradients on white (extremely common AI aesthetic)
- Apply colors without clear hierarchy or purpose

**Palette Strategy**:
```
--color-dominant: used for 60% of visual space
--color-secondary: used for 30%
--color-accent: used for 10%, high contrast, draws attention
```

### 2.3 Motion & Animation

**DO**:
- Use animations for delight and functional feedback
- Prioritize CSS-only solutions for HTML artifacts
- Focus on high-impact moments: orchestrated page loads with staggered reveals
- Add scroll-triggered animations and surprising hover states
- Use `animation-delay` for sequenced entrances

**DO NOT**:
- Scatter random micro-interactions without purpose
- Add motion that distracts from content
- Over-animate—restraint is often more elegant

**Animation Priorities**:
1. Page/component entrance (highest impact)
2. State transitions (hover, active, focus)
3. Scroll-triggered reveals
4. Loading states
5. Micro-interactions (lowest priority, use sparingly)

### 2.4 Spatial Composition

**DO**:
- Use unexpected layouts: asymmetry, overlap, diagonal flow
- Break the grid intentionally for visual interest
- Apply generous negative space OR controlled density (commit to one)
- Let content breathe or pack it tight—avoid the muddy middle

**DO NOT**:
- Stack everything in predictable vertical columns
- Use equal spacing everywhere
- Center everything by default

### 2.5 Backgrounds & Visual Details

**DO**:
- Create atmosphere and depth
- Add contextual effects that match the aesthetic:
  - Gradient meshes
  - Noise/grain textures
  - Geometric patterns
  - Layered transparencies
  - Dramatic shadows
  - Decorative borders
  - Custom cursors
  - Backdrop filters (blur, saturation)

**DO NOT**:
- Default to solid white or plain gray backgrounds
- Apply effects that don't serve the aesthetic direction
- Use generic stock patterns

---

## Phase 3: Anti-Patterns (The "AI Slop" Checklist)

Before finalizing output, verify the design does NOT exhibit these common AI-generated aesthetic failures:

| Anti-Pattern | Why It's Bad |
|--------------|-------------|
| Inter/Roboto/Arial everywhere | Shows no typographic consideration |
| Purple-to-blue gradients | Overused to the point of cliché |
| Rounded cards with light shadows | Every AI dashboard looks like this |
| Centered everything | Lazy, unintentional composition |
| Same layout for every request | Indicates no contextual reasoning |
| Excessive Tailwind defaults | Using the framework without customization |
| Gray-100 backgrounds | The color of no design decisions |
| Safe, predictable animations | Fade-in everything is not a strategy |

**Self-Test**: Would this design be indistinguishable from 100 other AI-generated interfaces? If yes, iterate.

---

## Phase 4: Framework-Specific Notes

### HTML/CSS/JS
- Embed all styles and scripts in a single file when appropriate
- Use CSS custom properties for theming
- Leverage modern CSS: Grid, Flexbox, `clamp()`, `container queries`
- CSS animations over JS when possible

### React/JSX
- Use Tailwind CSS but customize it—don't rely on defaults
- Motion libraries (Framer Motion, React Spring) for complex animations
- Keep component structure clean but don't sacrifice aesthetics for "clean code"
- Inline styles are acceptable for one-off creative elements

### Vue/Svelte
- Scoped styles are your friend
- Built-in transition components for animation
- Same aesthetic principles apply

---

## Phase 5: Output Checklist

Before presenting the final code:

- [ ] Aesthetic direction is clear and specific
- [ ] Typography is distinctive, not default
- [ ] Color palette is intentional with clear hierarchy
- [ ] At least one memorable visual element exists
- [ ] Animations serve purpose and delight
- [ ] Layout shows compositional thought
- [ ] Code is production-ready and functional
- [ ] Design would NOT blend in with generic AI output

---

## Summary

AI agents are capable of extraordinary creative work. This skill exists to prevent convergence toward bland, forgettable output. The key principles:

1. **Commit to a direction** — Safe choices produce generic results
2. **Typography matters** — It's the #1 differentiator
3. **Intentionality over intensity** — Bold or minimal, just be deliberate
4. **One memorable element** — Every interface needs a hook
5. **Avoid the checklist of clichés** — If it looks like AI made it, iterate

Execute with precision. Make unexpected choices. Design for the specific context, not for the average case.
