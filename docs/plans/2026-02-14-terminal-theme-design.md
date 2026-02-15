# Terminal Theme Design

**Date:** 2026-02-14
**Status:** Approved
**Author:** Paul Buckley

## Overview

Add two new built-in themes to Giki that provide a terminal session aesthetic: **Terminal Dark** and **Terminal Light**. These themes will use monospace fonts across the entire UI and terminal-inspired color palettes while maintaining code readability through standard syntax highlighting.

## Requirements

1. **Color Scheme:**
   - Terminal Dark: White/light gray text on pure black background (modern terminal default)
   - Terminal Light: Black/dark gray text on pure white background (light terminal emulator style)

2. **Typography:**
   - Full monospace font application across the entire UI (sidebar, file tree, content, buttons, all text)
   - Font stack: `'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace`

3. **Visual Style:**
   - Minimal terminal aesthetic - just font and colors, no decorative elements (no ASCII borders, prompt symbols, or cursor effects)
   - Clean and usable, not gimmicky

4. **Syntax Highlighting:**
   - Standard highlight.js themes for code readability
   - Terminal Dark: `monokai` highlight theme
   - Terminal Light: `github` highlight theme

## Approach: Extend Theme System Architecture

Extend the `ThemeDefinition` interface to support optional font customization. This makes the theme system more flexible and enables future themes to customize typography, not just colors.

**Why this approach:**
- Future-proof: Any theme can customize fonts
- Consistent architecture: Fonts handled like colors
- Reusable: Other themes could specify different font stacks (serif, JetBrains Mono, etc.)

## Architecture

### Theme System Extension

Extend `ThemeDefinition` interface to include optional `fonts` object:

```typescript
interface ThemeDefinition {
  id: string;
  name: string;
  author: string;
  type: 'light' | 'dark';
  highlightTheme: string;
  colors: Record<string, string>;
  fonts?: Record<string, string>;  // NEW: optional font overrides
}
```

### Font Property Application

ThemeContext will apply font properties as CSS custom properties (e.g., `--font-family`) alongside color properties. Themes without `fonts` continue working unchanged (backward compatible).

### Default Behavior

Update `index.css` to use CSS custom property with fallback:
```css
font-family: var(--font-family, system-ui, Avenir, Helvetica, Arial, sans-serif);
```

This ensures:
- Terminal themes apply monospace font via `--font-family`
- Existing themes (without `fonts` property) fall back to default sans-serif
- No breaking changes to existing themes

## Component & File Changes

### 1. `ui/src/themes/types.ts`
- Add `fonts?: Record<string, string>` to `ThemeDefinition` interface

### 2. `ui/src/themes/builtin.ts`
Add two new theme definitions:

**Terminal Dark:**
```typescript
const terminalDark: ThemeDefinition = {
  id: 'terminal-dark',
  name: 'Terminal Dark',
  author: 'Giki',
  type: 'dark',
  highlightTheme: 'monokai',
  fonts: {
    'font-family': "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace"
  },
  colors: {
    'bg-primary': '#000000',
    'bg-secondary': '#0a0a0a',
    'bg-tertiary': '#1a1a1a',
    'text-primary': '#ffffff',
    'text-secondary': '#b0b0b0',
    'text-tertiary': '#808080',
    // ... ~50 total color properties
  }
}
```

**Terminal Light:**
```typescript
const terminalLight: ThemeDefinition = {
  id: 'terminal-light',
  name: 'Terminal Light',
  author: 'Giki',
  type: 'light',
  highlightTheme: 'github',
  fonts: {
    'font-family': "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'Courier New', monospace"
  },
  colors: {
    'bg-primary': '#ffffff',
    'bg-secondary': '#f5f5f5',
    'bg-tertiary': '#e5e5e5',
    'text-primary': '#000000',
    'text-secondary': '#404040',
    'text-tertiary': '#707070',
    // ... ~50 total color properties
  }
}
```

Export both in `builtinThemes` array.

### 3. `ui/src/context/ThemeContext.tsx`
Update theme application logic (around lines 65-83):

```typescript
// Apply theme to DOM
useEffect(() => {
  const style = document.documentElement.style;
  const newProps = new Set<string>();

  // Set all color properties
  for (const [key, value] of Object.entries(theme.colors)) {
    const prop = `--${key}`;
    style.setProperty(prop, value);
    newProps.add(prop);
  }

  // NEW: Set all font properties if defined
  if (theme.fonts) {
    for (const [key, value] of Object.entries(theme.fonts)) {
      const prop = `--${key}`;
      style.setProperty(prop, value);
      newProps.add(prop);
    }
  }

  // Clean up properties that were set previously but not in the new theme
  for (const prop of appliedPropsRef.current) {
    if (!newProps.has(prop)) {
      style.removeProperty(prop);
    }
  }

  appliedPropsRef.current = newProps;

  // ... rest of existing code
}, [theme]);
```

### 4. `ui/src/index.css`
Change line 2:
```css
font-family: var(--font-family, system-ui, Avenir, Helvetica, Arial, sans-serif);
```

This makes all text inherit from the CSS custom property with a graceful fallback.

## Data Flow

1. **Theme Selection:**
   - User selects "Terminal Dark" or "Terminal Light" from ThemeSelector
   - `setThemeId()` called with theme ID

2. **Theme Resolution:**
   - ThemeContext finds theme definition from `builtinThemes`
   - Theme object includes both `colors` and `fonts` properties

3. **CSS Property Application:**
   - Apply all `theme.colors` entries as `--color-name` CSS properties (existing)
   - NEW: Check if `theme.fonts` exists
   - If present, apply all `theme.fonts` entries as `--font-name` CSS properties
   - Applied to `document.documentElement.style`

4. **Property Cleanup:**
   - Track all applied properties (colors + fonts) in `appliedPropsRef`
   - When switching themes, remove properties that are no longer defined
   - Prevents theme conflicts and CSS pollution

5. **CSS Inheritance:**
   - Root element uses `font-family: var(--font-family, ...fallback...)`
   - All descendant elements inherit monospace font when terminal theme active
   - Switching away from terminal theme restores default fonts via fallback

6. **Highlight.js (unchanged):**
   - Existing highlight.js theme loading continues working
   - Terminal themes specify `monokai` or `github` in `highlightTheme` field
   - MutationObserver watches `data-highlight-theme` attribute and loads appropriate CSS

## Terminal Theme Color Palettes

### Terminal Dark
- **Backgrounds:** Pure black (`#000000`), near-black secondary (`#0a0a0a`), dark gray tertiary (`#1a1a1a`)
- **Text:** Bright white (`#ffffff`), medium gray (`#b0b0b0`), dim gray (`#808080`)
- **Borders:** Dark gray (`#333333`), darker gray (`#1a1a1a`)
- **Accents:** Bright green for success (`#00ff00`), bright yellow for warnings (`#ffff00`), bright red for errors (`#ff0000`)
- **Links:** Bright cyan (`#00ffff`), brighter cyan on hover
- **Code blocks:** Slight gray background (`#0a0a0a`), white text

### Terminal Light
- **Backgrounds:** Pure white (`#ffffff`), light gray secondary (`#f5f5f5`), medium gray tertiary (`#e5e5e5`)
- **Text:** Pure black (`#000000`), dark gray (`#404040`), medium gray (`#707070`)
- **Borders:** Medium gray (`#cccccc`), light gray (`#e5e5e5`)
- **Accents:** Dark green for success (`#008000`), dark yellow for warnings (`#808000`), dark red for errors (`#ff0000`)
- **Links:** Dark blue (`#0000ff`), darker blue on hover
- **Code blocks:** Light gray background (`#f5f5f5`), black text

## Testing

### Unit Tests

**`ui/src/themes/builtin.test.ts`:**
- Test terminal theme definitions exist
- Verify `terminalDark` and `terminalLight` have all required fields
- Verify `fonts` property exists and contains `font-family`
- Verify color properties match terminal aesthetic (pure black/white backgrounds)

**`ui/src/context/ThemeContext.test.tsx`:**
- Test font property application: mock theme with `fonts`, verify CSS properties set
- Test font property cleanup: switch from theme with fonts to theme without, verify removal
- Test backward compatibility: themes without `fonts` property continue working
- Test font fallback: verify default fonts used when no `--font-family` is set

### Integration Tests

**Manual Visual Verification:**
1. Build the app, select Terminal Dark theme
2. Verify monospace font applied to all UI elements (sidebar, file tree, markdown, buttons)
3. Verify syntax highlighting works (monokai theme)
4. Switch to Terminal Light, verify colors invert and font remains monospace
5. Switch to non-terminal theme (e.g., "Light"), verify font reverts to sans-serif

**No Playwright e2e tests needed** - theming is visual/CSS, manual verification is sufficient.

## Success Criteria

1. ✅ Two new themes appear in ThemeSelector: "Terminal Dark" and "Terminal Light"
2. ✅ Selecting Terminal Dark applies monospace font to entire UI with white text on black background
3. ✅ Selecting Terminal Light applies monospace font to entire UI with black text on white background
4. ✅ Code syntax highlighting works correctly (monokai for dark, github for light)
5. ✅ Switching to non-terminal themes restores default sans-serif fonts
6. ✅ All unit tests pass
7. ✅ No regressions to existing themes (light, dark, dracula, solarized, catppuccin variants)

## Future Enhancements

- User-configurable terminal color schemes (via config file)
- Additional terminal aesthetics (amber, green CRT-style themes)
- Terminal-specific features (optional cursor blink effect, prompt symbols)
- Custom font support (allow users to specify font files)

## Implementation Notes

- Start with `types.ts` and `builtin.ts` to define themes
- Update ThemeContext to handle font properties
- Update `index.css` to use CSS custom property
- Write unit tests alongside implementation
- Manual visual testing before committing
- One step = one commit (follow step-based workflow if breaking into plan)
