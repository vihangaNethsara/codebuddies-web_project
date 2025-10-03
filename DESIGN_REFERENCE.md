# Study Groups Page - Visual Design Reference

## Component Spacing System

### Vertical Rhythm
```
Hero Section:          padding: 5rem 0 3.5rem
Stats Section:         padding: 2.5rem 0
Featured Section:      margin-bottom: 3rem
Groups Grid Section:   padding: 2rem 0 4rem
Section Gaps:          2-3rem between major sections
```

### Horizontal Spacing
```
Topbar:               gap: 16px, padding: 12px 24px
Search Actions:       gap: 16px
Filter Controls:      gap: 2 (Bootstrap)
Chip List:            gap: 10px
Groups Grid:          gap: 28px
Card Actions:         gap: 10px
```

## Typography Scale

```
Hero Title:           3.5rem, weight: 800, line-height: 1.1
Hero Subtitle:        1.15rem, line-height: 1.6
Section Title:        1.5rem, weight: 600
Card Title:           1.25rem, weight: 600, line-height: 1.3
Stats Number:         2rem, weight: 700
Stats Label:          0.95rem
Body Text:            0.95rem, line-height: 1.5
Meta Text:            0.85-0.9rem
```

## Border Radius System

```
Cards:                16px (modern, friendly)
Buttons:              10px (primary actions)
Search Input:         24px (pill-shaped)
Stats Cards:          16px
Featured Cards:       12px
Chips:                999px (fully rounded)
View Toggle:          8px (container), 6px (buttons)
```

## Shadow System

```
Topbar:               0 4px 20px rgba(0,0,0,0.7)
Card Base:            0 4px 20px rgba(0,0,0,0.3)
Card Hover:           0 12px 32px rgba(0,0,0,0.6)
Stats Hover:          0 8px 24px rgba(0,0,0,0.5)
Button Focus:         0 0 0 3px rgba(46,204,113,0.3)
Featured Card:        0 8px 24px rgba(0,0,0,0.5)
```

## Color Usage

### Primary Colors
```scss
--bg:       #121212  // Main background
--surface:  #1E1E1E  // Card backgrounds
--text:     #EAEAEA  // Primary text
--muted:    #9AA0A6  // Secondary text
--accent:   #2ecc71  // Primary actions (green)
--danger:   #e74c3c  // Destructive actions
```

### Semantic Colors
```scss
Featured:       #f59e0b (orange/warning)
Success:        #2ecc71 (green)
Error:          #ef4444 (red)
Info:           #3b82f6 (blue)
```

### Transparency System
```scss
Border Light:   rgba(255,255,255,0.05-0.1)
Hover BG:       rgba(255,255,255,0.08)
Overlay:        rgba(0,0,0,0.6)
Glass Effect:   backdrop-filter: blur(8px)
```

## Interactive States

### Hover Transformations
```scss
Cards:              translateY(-8px)
Stats Cards:        translateY(-4px)
Buttons:            translateY(-2px)
Featured Cards:     translateY(-4px)
```

### Transition Timing
```scss
Default:            0.2s ease
Card Hover:         0.2s ease
Image Zoom:         0.3s ease
```

## Iconography

### Icon Sizes
```
Hero Actions:       me-2 (margin-end 8px)
Button Icons:       me-1 (margin-end 4px)
Stats Icons:        2rem (fa-2x)
Meta Icons:         fa-fw (fixed width)
```

### Icon Usage
```
Search:             fas fa-search
Clear:              fas fa-times
Filter:             fas fa-filter
Grid View:          fas fa-th
List View:          fas fa-list
Create:             fas fa-plus-circle
Join:               fas fa-user-plus
View:               fas fa-eye
Leave:              fas fa-sign-out-alt
Navigate:           fas fa-arrow-right
Carousel:           fas fa-chevron-left/right
Featured:           fas fa-star
```

## Button Hierarchy

### Primary Actions
```html
<button class="btn btn-gradient-primary">
  <i class="fas fa-plus-circle"></i>
  <span>Create Group</span>
</button>
```
- Gradient background (green)
- High contrast text
- Icon + text
- Most prominent

### Secondary Actions
```html
<button class="btn btn-outline-light">
  <i class="fas fa-filter"></i>
  <span>Filters</span>
</button>
```
- Outlined style
- Medium prominence
- Optional icon

### Tertiary Actions
```html
<button class="btn btn-view-toggle">
  <i class="fas fa-th"></i>
</button>
```
- Icon only
- Minimal style
- Grouped in container

## Grid Layouts

### Groups Grid
```scss
display: grid;
grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
gap: 28px;

// Responsive behavior:
Desktop (1200px+):  3-4 columns
Tablet (768-1199):  2-3 columns
Mobile (< 768px):   1 column
```

### Stats Grid
```scss
display: grid;
grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
gap: 24px;
```

### Featured Carousel
```scss
display: flex;
gap: 20px;
overflow-x: auto;
scroll-behavior: smooth;

Card Width: 280px (flex: 0 0 280px)
```

## Accessibility

### Focus Indicators
```scss
outline: 2px solid var(--accent);
outline-offset: 2px;

// Enhanced focus for inputs:
border-color: var(--accent);
box-shadow: 0 0 0 3px rgba(46,204,113,0.1);
```

### Touch Targets
```
Minimum: 44x44px
Preferred: 48x48px
Buttons: 48px height (10-12px padding)
```

## Animation Principles

1. **Purposeful:** Every animation serves a function
2. **Fast:** Most animations under 300ms
3. **Easing:** Use `ease` or `ease-out` for natural feel
4. **Subtle:** Transform values kept small (2-8px)
5. **Consistent:** Same timing function throughout

## Responsive Breakpoints

```scss
Mobile:     < 768px
Tablet:     768px - 1199px
Desktop:    1200px+

// Meteor/Bootstrap classes:
d-none d-sm-flex    // Hidden on mobile
d-flex d-md-none    // Hidden on tablet+
```

## Dark Theme Variables

```scss
:root {
  --bg: #121212;
  --surface: #1E1E1E;
  --muted: #9AA0A6;
  --text: #EAEAEA;
  --accent: #2ecc71;
  --danger: #e74c3c;
  --radius: 12px;
  --transition: all 0.2s ease;
  --header-height: 64px;
}
```

## Best Practices Applied

1. ✅ **Consistent spacing scale** (multiples of 4px/8px)
2. ✅ **Clear visual hierarchy** (size, weight, color)
3. ✅ **Adequate touch targets** (min 44px)
4. ✅ **Smooth interactions** (hover, focus, active states)
5. ✅ **Semantic HTML** (proper headings, sections, ARIA)
6. ✅ **Performance** (CSS transforms, efficient selectors)
7. ✅ **Accessibility** (ARIA labels, keyboard navigation)
8. ✅ **Responsive design** (mobile-first approach)
9. ✅ **Color contrast** (WCAG AA compliance)
10. ✅ **Loading states** (skeletons, spinners)

---

**Reference:** This document provides the design system used in the Study Groups page for consistency across future updates.
