# Visual Structure & Commenting Standards

In the **Phenix Craft** style, code is not merely executable instructions—it is visual communication. Code must be instantly scannable, well-indexed, and structured with hierarchical rhythm.

---

## 1. File Header Table of Contents

Every file starts with a header block that indexes its contents. This allows developers and AI models to immediately navigate complex modules without scrolling back and forth.

### C-Style Syntax (JavaScript, TypeScript, PHP, SCSS, C#, Java, Go, Rust)
```javascript
/**======> Reference By Comment <======
 * ===> 01 - Type Definitions & Constants
 * ===> 02 - Core Utilities & Math Helpers
 * ===> 03 - Component Implementation
 * ===> 04 - Event Handling & Lifecycle
 * ===> 05 - Initialization & Export
*/
```

### Python Syntax
```python
"""======> Reference By Comment <======
 * ===> 01 - Imports & Type Aliases
 * ===> 02 - Helper Functions
 * ===> 03 - Pipeline / Optimizer Service
 * ===> 04 - Public Interface
"""
```

### HTML / Template Syntax
```html
<!--======> Reference By Comment <======
 * ===> 01 - Header Meta & Microdata
 * ===> 02 - Media Container
 * ===> 03 - Content Body & Controls
 * ===> 04 - Action Buttons
======-->
```

---

## 2. Hierarchical Arrow Comment System

Three distinct tiers of arrow comments are used to delineate logical scope:

### Tier 1: Major Module / Architectural Boundaries
Used for major structural segments within a file or between distinct classes.
- Single-line: `//=====> Major Section Name <=====//`
- Multi-line block: `/*=====> Major Section Name <=====*/`
- Python: `# =====> Major Section Name <=====`
- SCSS: `/*==== Major Section Name ====*/`

### Tier 2: Functions, Classes, and Logical Units
Used above function definitions, class declarations, or standalone feature blocks.
- Single-line: `//====> Feature / Function Name <====//`
- Python: `# ====> Feature / Function Name <====`
- SCSS: `/*==== Sub-feature Name ====*/`

### Tier 3: Steps Inside Functions (Inline Narrative)
Used inside function bodies to mark discrete sequential steps:
- `//===> Define Data & Elements <===//`
- `//===> Guard Clause Check <===//`
- `//===> Compute Values <===//`
- `//===> Bind Event Listeners <===//`
- `//===> Return Output <===//`
- Python: `# ===> Step Description <===`
- SCSS: `//===> Variable Calculation`

---

## 3. Formatting & Code Hygiene Rules

1. **Space Around Operators & Keywords**:
   Always maintain breathing room between statements, operators, and control constructs:
   ```javascript
   // Good
   if (!input || input.value === '') return;
   const total = (base * 10) + offset;

   // Avoid
   if(!input||input.value=='')return;
   const total=(base*10)+offset;
   ```
2. **Predictable Linebreaks**:
   Separate logical sections with a single blank line before the comment divider. Do not cluster unrelated lines together.
3. **No Redundant Comments**:
   Comments should explain *intent and stage* (`//===> Check for Existing Instance <===//`), not state trivial syntax (`//===> if x is 5 <===//`).
