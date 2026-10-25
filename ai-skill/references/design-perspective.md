# Design Perspective & Design Systems

How Abdullah Ramadan (Phenix / EngCode) approaches UI/UX, styling, tokens, and visual architecture.

---

## 1. Mathematical Tokens & Sizing Scales

Design must never rely on arbitrary numbers. All spatial and typographical values belong to a mathematical scale:

1. **Relative Units (`REM`)**:
   - Always base pixel conversions on a standard base (default: 16px).
   - Use dedicated helper functions across all styling engines:
     - SCSS: `@function REM($size, $base: 16) { @return ($size / $base * 1) + rem; }`
     - CSS: Use `calc(var(--size) / 16 * 1rem)` or precomputed tokens.
2. **Predictable Spacing Scales**:
   - Standardized 5px interval scales: `[0, 5, 10, 15, 20, 25, 30, ... 100]`.
   - Utility generation using automated loop mixins (e.g. `@mixin Repeater`) to ensure full consistency without manual duplication.
3. **CSS Custom Properties as Contracts**:
   - Component dimensions, colors, and borders are parameterized using CSS variables:
     ```css
     .px-select {
         --height: 2.75rem;
         --padding: 1rem;
         --border-color: rgba(0, 0, 0, 0.15);
     }
     ```

---

## 2. Utility-First with Semantic Layering

Rather than choosing between strict BEM or purely atomic utility classes, the Phenix architecture combines the strengths of both:

1. **Atomic Utility Foundation**:
   - High-frequency layout and spacing primitives: `flexbox`, `col-12 col-md-6`, `pdt-15`, `fs-14`, `radius-xxl`, `overflow-hidden`.
   - Quick, predictable adjustments without polluting component stylesheets.
2. **Semantic Component Containers**:
   - Use meaningful component classes (`.product-card`, `.px-media`, `.dialog-modal`) to denote cohesive functional components.
   - Utilities are composed inside or alongside semantic classes:
     ```html
     <div class="product-card col-12 col-md-4 col-lg-3">
         <div class="content-box radius-xxl overflow-hidden position-rv">
             <a class="px-media ratio-4x3 radius-xxl"></a>
         </div>
     </div>
     ```

---

## 3. First-Class Bidirectionality (RTL / LTR)

Bidirectionality is not an afterthought or a patch; it is engineered into the foundation:

1. **Logical Flow Abstractions**:
   - In SASS/CSS, define direction-aware variables:
     ```scss
     // For LTR
     $direction: ltr;
     $direction-reverse: rtl;
     $direction-start: left;
     $direction-end: right;

     // For RTL
     $direction: rtl;
     $direction-reverse: ltr;
     $direction-start: right;
     $direction-end: left;
     ```
   - Rules use logical variables: `padding-#{$direction-start}: 1rem;` or modern CSS logical properties (`padding-inline-start`).
   - A single unified stylesheet can compile to both `style.css` (LTR) and `style-rtl.css` (RTL) with 100% code reuse.
2. **Bidirectional Scripting & Validation**:
   - Scripts query the document direction:
     ```typescript
     const isRtl = document.documentElement.dir === 'rtl' || document.body.classList.contains('rtl');
     ```
   - User feedback, error messages, and icon orientations flip automatically:
     - Next/Prev pagination arrows swap based on reading direction.
     - Validation messages output in the appropriate language (e.g., Arabic when RTL, English when LTR).

---

## 4. DOM Purity & Semantic Standards

- **Zero "Div Soup"**:
  - Never introduce an arbitrary `<div>` wrapper when an existing semantic element (`<button>`, `<label>`, `<section>`, `<figure>`) can hold the classes and behavior.
- **Microdata & Accessibility**:
  - Integrate Schema.org attributes (`itemscope`, `itemtype="https://schema.org/Product"`, `itemprop="name"`) into template components.
  - Native form controls (`<input required>`, `<select>`) maintain their accessibility attributes while being enhanced visually.
- **Context Awareness**:
  - Adapt styling and controls according to runtime context (e.g., WebView adjustments, editor canvas rendering, mobile touch targets).
