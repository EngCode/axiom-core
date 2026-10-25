---
name: phenix-craft
description: >-
  Applies Abdullah Ramadan's engineering mindset, clean architectural principles,
  design-system-first methodology, signature hierarchical arrow comments, bidirectional RTL/LTR support,
  and zero-bloat standards across all programming languages when designing and writing code with AI.
---

# The Engineering & Design System Standard

This skill encapsulates the software engineering and design philosophy of **Abdullah Ramadan (Phenix / EngCode)**. When building software with AI across **any programming language** (TypeScript, JavaScript, PHP, Python, Go, Rust, SCSS, etc.), you must adopt this exact mindset, visual structure, and craftsmanship.

No matter the language or environment, code should read like high-precision craftsmanship: clean, self-reliant, visually structured, mathematically consistent, bidirectional by default, and free of unnecessary bloat.

---

## 1. Core Mindset: How I Think

### Development Perspective
1. **Self-Reliance & Zero-Bloat First Principles**:
   - Prefer lightweight, tailored implementations and native platform APIs over heavy, third-party kitchen-sink dependencies.
   - Actively eliminate bloat: strip redundant wrapper markup, unnecessary scripts, unused styles, and dead abstractions. Every byte and DOM node counts.
2. **Symmetry & Isomorphism Across the Stack**:
   - Maintain cognitive parity between client and server layers.
   - If a concept exists on both sides (e.g., unit conversions, option renderers, grid calculators, validator schemas), use the **same mental model, matching naming conventions, and identical function signatures**.
3. **Flat Control Flow via Guard Clauses**:
   - Avoid deep indentation pyramids. Check preconditions immediately and return early (`return`, `continue`, `break`).
   - Validate existence and types upfront before executing business logic.
4. **Lifecycle & State Mount Management**:
   - Always track mounting states (e.g., `.px-mounted`, `.is-active`, `data-state`) to prevent duplicate bindings, race conditions, and memory leaks.
   - Support clean lifecycle transitions: mount, update/rebuild, and destroy.
5. **Decoupled, Event-Driven Architecture**:
   - Components communicate through decoupled event triggers (`CustomEvent`, hook filters, listeners) rather than tight direct coupling.

### Designing Perspective
1. **Design System First (Mathematical Tokens)**:
   - Avoid random or magic numbers. All dimensions, spacing, typography, and borders derive from strict mathematical token scales (e.g., base-16 `REM` calculators, standardized `0, 5, 10, ... 100` step intervals).
   - Use CSS custom properties (`--primary-color`, `--height`, `--padding`, `--border-color`) as the single source of truth between styling and scripting.
2. **Utility-First with Semantic Component Layering**:
   - Compose layouts using crisp atomic utilities (e.g., `flexbox`, `col-12 col-md-6`, `pdt-15`, `fs-14`, `radius-xxl`).
   - Layer semantic classes (`.product-card`, `.px-select`, `.dialog-modal`) over utilities to define reusable entity boundaries without sacrificing atomic flexibility.
3. **First-Class Bidirectionality (RTL / LTR Native from Line Zero)**:
   - Software must be culturally neutral and bidirectional by default.
   - Never hardcode directional physical properties (`left` / `right`) when representing reading flow.
   - Abstract directions into logical start/end axes (`$direction-start`, `$direction-end`, inline start/end).
   - Scripting and validation must detect text direction and adapt UI messages, alignments, and icons (e.g., reversing chevron directions in RTL).
4. **DOM Purity & Semantic HTML**:
   - Eliminate "div soup". Never add an extra wrapper element when a native semantic element (`<form>`, `<select>`, `<button>`, `<dialog>`, `<header>`) can host the attributes and styles directly.
   - Embed Schema.org microdata (`itemscope`, `itemtype`, `itemprop`) for semantic richness where applicable.
5. **Contextual & Progressive Enhancement**:
   - Preserve and augment native elements rather than replacing them blindly.
   - Gracefully adapt to execution contexts (e.g., WebViews vs browser windows, editor previews vs live output, headless vs interactive).

---

## 2. Visual Structure: How I Write Code

Every code file—regardless of programming language—must reflect this clean, disciplined visual rhythm:

### The File Header Table of Contents
Begin every significant file with a structured reference index listing the sections contained within:

```javascript
/**======> Reference By Comment <======
 * ===> 01 - Type Definitions & Interfaces
 * ===> 02 - Core Helper Functions
 * ===> 03 - Main Component Class
 * ===> 04 - Event Listeners & Mounting
*/
```

### Hierarchical Arrow Comment Dividers
Organize code into clear, visual strata using 3 levels of arrow dividers:

- **Level 1 (Major Architecture / File Sections)**:
  ```javascript
  //=====> Major Section Name <=====//
  /*=====> Major Section Name <=====*/
  ```
- **Level 2 (Functions, Classes, or Logical Blocks)**:
  ```javascript
  //====> Function or Feature Name <====//
  ```
- **Level 3 (Steps inside a Function / Inline Steps)**:
  ```javascript
  //===> Define Variables / Elements <===//
  //===> Guard Clause Check <===//
  //===> Compute / Transform <===//
  //===> Return Output <===//
  ```

### Standard Function Anatomy
Every function should follow a predictable 4-beat rhythm:
```typescript
function processUserData(user: UserConfig): ProcessedUser | null {
    //===> Guard Clause: Validate Input <===//
    if (!user || !user.id) return null;

    //===> Define Local Data & Defaults <===//
    const userRole = user.role || 'guest';
    const timestamp = Date.now();

    //===> Compute & Transform <===//
    const normalizedName = user.name.trim().toLowerCase();

    //===> Return Result <===//
    return { id: user.id, name: normalizedName, role: userRole, activeAt: timestamp };
}
```

---

## 3. Multi-Language Demonstrations

Refer to the included example files for complete, runnable code:
- **TypeScript**: [`typescript-component.ts`](./examples/typescript-component.ts) — DOM toolkit, custom event emission, mounting lifecycle, RTL support.
- **Python**: [`python-module.py`](./examples/python-module.py) — Optimizer/sanitizer service, clean guards, pipeline steps, symmetric naming.
- **PHP**: [`php-service.php`](./examples/php-service.php) — Modular service class, filterable pipelines, defensive checks, unit conversions.
- **SCSS**: [`scss-design-system.scss`](./examples/scss-design-system.scss) — Bidirectional token system, REM function, utility repeater mixin, semantic component styling.

For detailed guidelines on each aspect, explore:
- [`commenting-standards.md`](./references/commenting-standards.md)
- [`development-perspective.md`](./references/development-perspective.md)
- [`design-perspective.md`](./references/design-perspective.md)

---

## 4. AI Pair-Programming Checklist

When writing code under the **Phenix Craft** standard, verify before presenting code:
- [ ] **Table of Contents**: Is there a `/**======> Reference By Comment <====== ... */` block at the top?
- [ ] **Hierarchical Comments**: Are sections and function internals marked with `//=====>`, `//====>`, and `//===>`?
- [ ] **Zero-Bloat**: Is the solution free of unnecessary dependencies and wrapper elements?
- [ ] **Guard Clauses**: Are preconditions checked upfront with immediate returns, keeping indentation flat?
- [ ] **Bidirectional Awareness**: If styling or UI text is involved, are logical directions (`start`/`end`) and RTL/LTR fallbacks respected?
- [ ] **Symmetric Naming**: Do names accurately express intent without jargon or artificial complexity?
- [ ] **Design Tokens**: Are spacing, dimensions, and colors aligned with a systematic tokenized scale?
