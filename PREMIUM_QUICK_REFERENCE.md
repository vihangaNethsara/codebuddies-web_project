# 🚀 Premium Group Page - Quick Reference

## 📁 File Structure

```
client/css/
├── _group_page_premium.scss         # Part 1: Core (750 lines)
├── _group_page_premium_part2.scss   # Part 2: Components (720 lines)
├── _group_page_premium_part3.scss   # Part 3: Interactions (630 lines)
└── style.scss                       # Main (imports all parts)

client/templates/study_groups/
├── single_study_group_premium.html  # ⏳ TO CREATE
└── single_study_group_premium.js    # ⏳ TO CREATE

server/study_groups/
└── premium_methods.js               # ⏳ TO CREATE
```

---

## 🎨 Design Token Quick Reference

### Colors

```scss
// Brand
--brand-primary: #6366f1    // Primary blue-purple
--brand-secondary: #ec4899  // Secondary pink

// Semantic
--success: #10b981          // Green
--warning: #f59e0b          // Orange
--danger: #ef4444           // Red
--info: #3b82f6             // Blue

// Neutrals (11-stop scale)
--gray-50: #f9fafb
--gray-100: #f3f4f6
// ... through to
--gray-900: #111827
--gray-950: #030712

// Dark Mode
[data-theme="dark"] {
  --text-primary: var(--gray-50)
  --bg-primary: var(--gray-950)
  // ... inverted colors
}
```

### Spacing (8px base)

```scss
--space-1: 0.25rem   // 4px
--space-2: 0.5rem    // 8px
--space-3: 0.75rem   // 12px
--space-4: 1rem      // 16px
--space-6: 1.5rem    // 24px
--space-8: 2rem      // 32px
--space-12: 3rem     // 48px
--space-16: 4rem     // 64px
```

### Shadows

```scss
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05)
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1)
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1)
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1)
--shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1)
--shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.25)
```

### Border Radius

```scss
--radius-xs: 0.125rem    // 2px
--radius-sm: 0.25rem     // 4px
--radius-md: 0.375rem    // 6px
--radius-lg: 0.5rem      // 8px
--radius-xl: 0.75rem     // 12px
--radius-2xl: 1rem       // 16px
--radius-full: 9999px    // Pill shape
```

### Transitions

```scss
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-base: 250ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1)
--transition-bounce: 500ms cubic-bezier(0.68, -0.55, 0.265, 1.55)
```

---

## 🧩 Component Classes

### Buttons

```html
<!-- Primary Gradient -->
<button class="premium-button btn-primary">
  <i class="fa fa-plus"></i>
  <span>Create</span>
</button>

<!-- Secondary Outlined -->
<button class="premium-button btn-secondary">Edit</button>

<!-- Success -->
<button class="premium-button btn-success">Join</button>

<!-- Danger -->
<button class="premium-button btn-danger">Delete</button>

<!-- Ghost -->
<button class="premium-button btn-ghost">Cancel</button>

<!-- Icon Only -->
<button class="premium-button btn-icon">
  <i class="fa fa-heart"></i>
</button>

<!-- Sizes -->
<button class="premium-button btn-primary btn-sm">Small</button>
<button class="premium-button btn-primary">Default</button>
<button class="premium-button btn-primary btn-lg">Large</button>

<!-- Loading State -->
<button class="premium-button btn-primary loading">
  <span class="spinner"></span>
  <span>Loading...</span>
</button>
```

### Cards

```html
<!-- Basic Premium Card -->
<div class="premium-card">
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</div>

<!-- Interactive Card -->
<div class="premium-card card-interactive">
  <!-- Clickable card with hover effect -->
</div>
```

### Tabs

```html
<div class="premium-tabs">
  <button class="tab-button active" data-tab="about">
    <i class="fa fa-info-circle"></i>
    <span>About</span>
    <span class="tab-badge">3</span>
  </button>
  <button class="tab-button" data-tab="members">
    <i class="fa fa-users"></i>
    <span>Members</span>
  </button>
</div>
```

### Badges

```html
<!-- Primary -->
<span class="badge-premium badge-primary">New</span>

<!-- Success -->
<span class="badge-premium badge-success">Active</span>

<!-- Warning -->
<span class="badge-premium badge-warning">Pending</span>

<!-- Danger -->
<span class="badge-premium badge-danger">Archived</span>

<!-- With Pulse -->
<span class="badge-premium badge-success badge-pulse">Live</span>
```

### Tooltips

```html
<button data-tooltip="Click to bookmark">
  <i class="fa fa-bookmark"></i>
</button>
```

### Toasts

```javascript
// Show success toast
showToast('Changes saved successfully!', 'success');

// Show error toast
showToast('Something went wrong', 'error');

// Show warning toast
showToast('Please complete your profile', 'warning');

// Show info toast
showToast('New updates available', 'info');
```

---

## 🎭 State Classes

### Loading

```html
<!-- Button loading -->
<button class="premium-button loading">...</button>

<!-- Skeleton loader -->
<div class="skeleton-loader skeleton-title"></div>
<div class="skeleton-loader skeleton-text"></div>
<div class="skeleton-loader skeleton-avatar"></div>
<div class="skeleton-loader skeleton-card"></div>
```

### Empty States

```html
<div class="empty-state-premium">
  <div class="empty-illustration">
    <i class="fa fa-inbox"></i>
  </div>
  <h3 class="empty-title">No items yet</h3>
  <p class="empty-description">
    Get started by creating your first item.
  </p>
  <div class="empty-action">
    <button class="premium-button btn-primary">
      Create Item
    </button>
  </div>
</div>
```

### Modal

```html
<div class="premium-modal-overlay">
  <div class="premium-modal">
    <div class="modal-header">
      <h3 class="modal-title">Modal Title</h3>
      <button class="modal-close">
        <i class="fa fa-times"></i>
      </button>
    </div>
    <div class="modal-body">
      <!-- Modal content -->
    </div>
    <div class="modal-footer">
      <button class="premium-button btn-ghost">Cancel</button>
      <button class="premium-button btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

---

## 🌙 Dark Mode Toggle

```javascript
// Toggle dark mode
function toggleDarkMode() {
  const container = document.querySelector('.premium-container');
  const currentTheme = container.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  container.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

// Load saved theme
function loadTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.querySelector('.premium-container')
    .setAttribute('data-theme', savedTheme);
}
```

---

## 📱 Responsive Breakpoints

```scss
// Mobile
@media (max-width: 640px) { }

// Tablet
@media (max-width: 1024px) { }

// Desktop
@media (min-width: 1025px) { }
```

---

## ⌨️ Keyboard Shortcuts

```javascript
// Tab navigation
'1-9' → Switch to tab 1-9
'J'   → Join group
'H'   → Create hangout
'S'   → Share group
'B'   → Toggle bookmark
'T'   → Toggle dark mode
'/'   → Focus search
'ESC' → Close modal/dropdown
```

---

## 🎨 Animation Keyframes

```scss
// Available animations
fadeIn          // Fade in from 0 to 1 opacity
fadeInUp        // Fade in + slide up from 20px
pulse           // Scale 1 → 1.2 → 1
spin            // 360° rotation
gradientShift   // Gradient background position animation
skeleton-pulse  // Skeleton loading shimmer
progress-shine  // Progress bar shine effect
toast-progress  // Toast countdown bar
badge-pulse     // Badge pulse shadow effect
```

---

## 🔧 Common Patterns

### Ripple Effect

```javascript
// Add to buttons
function addRippleEffect() {
  document.querySelectorAll('.premium-button').forEach(button => {
    button.addEventListener('click', function(e) {
      const ripple = this.querySelector('::before');
      // Ripple animation handled by CSS
    });
  });
}
```

### Smooth Scroll to Tab

```javascript
function scrollToTab(tabId) {
  const tabContent = document.getElementById(tabId);
  tabContent.scrollIntoView({ 
    behavior: 'smooth', 
    block: 'start' 
  });
}
```

### Toast Notification

```javascript
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast-premium toast-${type} show`;
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fa fa-${getIconForType(type)}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-title">${getTitleForType(type)}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close">
      <i class="fa fa-times"></i>
    </button>
    <div class="toast-progress"></div>
  `;
  
  document.querySelector('.toast-container').appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}
```

---

## 🎯 Best Practices

### CSS

- ✅ Always use design tokens (CSS variables)
- ✅ Use BEM naming for custom classes
- ✅ Add transitions for smooth interactions
- ✅ Include hover/focus/active states
- ✅ Support dark mode with `[data-theme="dark"]`
- ✅ Make it responsive (mobile-first)

### HTML

- ✅ Use semantic HTML5 elements
- ✅ Add ARIA labels for accessibility
- ✅ Include keyboard navigation support
- ✅ Add loading/empty states
- ✅ Use `data-*` attributes for JS hooks

### JavaScript

- ✅ Use reactive variables for state
- ✅ Implement optimistic UI updates
- ✅ Add error handling
- ✅ Debounce search/filter functions
- ✅ Use event delegation for performance

---

## 📊 Performance Tips

- Use CSS transforms instead of position properties
- Use `will-change` for heavy animations
- Lazy load images and heavy content
- Debounce scroll/resize handlers
- Use skeleton screens instead of spinners
- Minimize reflows and repaints

---

## ♿ Accessibility Checklist

- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] ARIA labels are present
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Images have alt text
- [ ] Forms have labels
- [ ] Error messages are clear
- [ ] Reduced motion is supported
- [ ] Screen reader friendly

---

## 🐛 Debugging

### CSS Issues

```javascript
// Check computed styles
const element = document.querySelector('.premium-button');
console.log(getComputedStyle(element).getPropertyValue('--brand-primary'));
```

### Dark Mode Issues

```javascript
// Check current theme
const theme = document.querySelector('.premium-container')
  .getAttribute('data-theme');
console.log('Current theme:', theme);
```

### Animation Issues

```css
/* Disable animations for debugging */
* {
  animation-duration: 0s !important;
  transition-duration: 0s !important;
}
```

---

## 📚 Related Documentation

- `PREMIUM_GROUP_PAGE_SUMMARY.md` - Complete conversation history
- `PREMIUM_ROADMAP.md` - Development roadmap & timeline
- `MODERN_STUDY_GROUP_REDESIGN.md` - First redesign docs
- `MIGRATION_GUIDE.md` - Migration instructions

---

## 🎉 Quick Start Checklist

1. ✅ All SCSS files created and imported
2. ⏳ Create HTML template with premium components
3. ⏳ Create JavaScript with event handlers
4. ⏳ Add real-time subscriptions
5. ⏳ Create backend methods
6. ⏳ Test on all devices
7. ⏳ Run accessibility audit
8. ⏳ Deploy to production

---

**Status:** 60% Complete - Styling Done, Implementation Pending  
**Next:** Create HTML Template (2-3 hours)  
**Goal:** World-class SaaS-quality group page! 🚀✨
