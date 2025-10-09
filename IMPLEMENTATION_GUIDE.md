# 🚀 Group Page Implementation Guide

## Quick Start - 3 Steps to Get It Running

### Step 1: Create StudyGroupBookmarks Collection

Add this to your `lib/collections.js`:

```javascript
// Add this with your other collections
StudyGroupBookmarks = new Mongo.Collection("study_group_bookmarks");
```

### Step 2: Import New Files

Add these imports to your `server/main.js`:

```javascript
import '../study_groups/premium_methods.js';
import '../study_groups/premium_publications.js';
```

### Step 3: Restart Meteor

```bash
# Stop the current Meteor process (Ctrl+C)
meteor reset  # Optional: Only if you want to clear all data
meteor run
```

---

## 📝 Complete Code Implementation

### 1. Enhanced Client-Side Logic

Update your `single_study_group_premium.js` with these key event handlers:

```javascript
// ===========================================================================
// EVENT HANDLERS - Add these to your Template.single_study_group_premium
// ===========================================================================

Template.single_study_group_premium.events({
  
  // ===== BOOKMARK BUTTON =====
  "click .bookmark-btn"(event, instance) {
    event.preventDefault();
    
    if (!Meteor.userId()) {
      Bert.alert("Please log in to bookmark this group", "warning");
      return;
    }

    const groupId = instance.groupId;
    const $btn = $(event.currentTarget);
    
    // Add loading state
    $btn.addClass("loading").prop("disabled", true);

    Meteor.call("groups.toggleBookmark", groupId, (error, result) => {
      $btn.removeClass("loading").prop("disabled", false);
      
      if (error) {
        console.error("Bookmark error:", error);
        Bert.alert(error.reason || "Failed to update bookmark", "danger");
        return;
      }

      // Update local state
      instance.isBookmarked.set(result.bookmarked);
      
      // Show success message
      const message = result.bookmarked ? "Group bookmarked!" : "Bookmark removed";
      Bert.alert(message, "success");
      
      // Animate button
      $btn.addClass("animated").one("animationend", function() {
        $(this).removeClass("animated");
      });
    });
  },

  // ===== SHARE BUTTON =====
  "click .share-btn"(event, instance) {
    event.preventDefault();
    
    const groupId = instance.groupId;
    const group = StudyGroups.findOne(groupId);
    
    if (!group) return;

    // Create share modal dynamically
    const shareUrl = window.location.href;
    const shareText = `Check out ${group.title} on CodeBuddies!`;
    
    // Show share options modal
    Modal.show("shareGroupModal", {
      groupId: groupId,
      groupTitle: group.title,
      shareUrl: shareUrl,
      shareText: shareText
    });
  },

  // ===== THEME TOGGLE =====
  "click .theme-toggle"(event, instance) {
    event.preventDefault();
    
    const currentTheme = instance.theme.get();
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    
    instance.theme.set(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
    
    Bert.alert(`Switched to ${newTheme} mode`, "info");
  },

  // ===== TAB NAVIGATION =====
  "click .tab-button"(event, instance) {
    event.preventDefault();
    
    const tabName = $(event.currentTarget).data("tab");
    instance.activeTab.set(tabName);
    
    // Update URL hash
    window.location.hash = tabName;
    
    // Scroll to tabs
    $(".premium-tabs")[0].scrollIntoView({ behavior: "smooth", block: "nearest" });
  },

  // ===== JOIN GROUP =====
  "click .join-btn"(event, instance) {
    event.preventDefault();
    
    if (!Meteor.userId()) {
      Bert.alert("Please log in to join this group", "warning");
      FlowRouter.go("/login");
      return;
    }

    const groupId = instance.groupId;
    const group = StudyGroups.findOne(groupId);
    
    if (!group) return;

    const $btn = $(event.currentTarget);
    $btn.addClass("loading").prop("disabled", true);

    Meteor.call(
      "joinStudyGroup",
      {
        studyGroupId: groupId,
        studyGroupTitle: group.title,
        studyGroupSlug: group.slug || groupId
      },
      (error) => {
        $btn.removeClass("loading").prop("disabled", false);
        
        if (error) {
          console.error("Join error:", error);
          Bert.alert(error.reason || "Failed to join group", "danger");
          return;
        }

        Bert.alert("Welcome to the group! 🎉", "success");
        
        // Update presence
        updatePresence(groupId);
      }
    );
  },

  // ===== LEAVE GROUP =====
  "click .leave-btn"(event, instance) {
    event.preventDefault();
    
    const groupId = instance.groupId;
    const group = StudyGroups.findOne(groupId);
    
    if (!group) return;

    // Confirmation modal
    if (!confirm("Are you sure you want to leave this group?")) {
      return;
    }

    const $btn = $(event.currentTarget);
    $btn.addClass("loading").prop("disabled", true);

    Meteor.call(
      "leaveStudyGroup",
      {
        studyGroupId: groupId,
        studyGroupTitle: group.title,
        studyGroupSlug: group.slug || groupId
      },
      (error) => {
        $btn.removeClass("loading").prop("disabled", false);
        
        if (error) {
          console.error("Leave error:", error);
          Bert.alert(error.reason || "Failed to leave group", "danger");
          return;
        }

        Bert.alert("You've left the group", "info");
        
        // Redirect to study groups page
        setTimeout(() => {
          FlowRouter.go("/study-groups");
        }, 1500);
      }
    );
  },

  // ===== INVITE MEMBERS (Admins Only) =====
  "click .invite-btn"(event, instance) {
    event.preventDefault();
    
    Modal.show("inviteMemberModal", {
      groupId: instance.groupId
    });
  },

  // ===== SETTINGS (Admins Only) =====
  "click .settings-btn"(event, instance) {
    event.preventDefault();
    
    FlowRouter.go(`/study-groups/${instance.groupId}/settings`);
  },

  // ===== MEMBER SEARCH =====
  "input .search-input"(event, instance) {
    const query = $(event.currentTarget).val().trim();
    instance.searchQuery.set(query);
    
    // Show/hide clear button
    if (query) {
      $(".search-clear").show();
    } else {
      $(".search-clear").hide();
    }
  },

  "click .search-clear"(event, instance) {
    event.preventDefault();
    $(".search-input").val("").focus();
    instance.searchQuery.set("");
    $(event.currentTarget).hide();
  },

  // ===== MEMBER FILTER =====
  "click .filter-chip"(event, instance) {
    event.preventDefault();
    
    const filter = $(event.currentTarget).data("filter");
    instance.memberFilter.set(filter);
    
    // Update active state
    $(".filter-chip").removeClass("active");
    $(event.currentTarget).addClass("active");
  },

  // ===== SCROLL TO TOP =====
  "click .scroll-to-top"(event) {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

// ===========================================================================
// HELPER FUNCTIONS
// ===========================================================================

/**
 * Apply theme to page
 */
function applyTheme(theme) {
  $(".premium-container").attr("data-theme", theme);
  
  // Update meta theme-color
  $('meta[name="theme-color"]').attr(
    "content",
    theme === "dark" ? "#0a0a0b" : "#ffffff"
  );
}

/**
 * Initialize ripple effect on buttons
 */
function initRippleEffect() {
  $(document).on("click", ".premium-button, .tab-button, .filter-chip", function(e) {
    const $button = $(this);
    const $ripple = $("<span class='ripple'></span>");
    
    const size = Math.max($button.outerWidth(), $button.outerHeight());
    const x = e.pageX - $button.offset().left - size / 2;
    const y = e.pageY - $button.offset().top - size / 2;
    
    $ripple.css({
      width: size,
      height: size,
      top: y,
      left: x
    });
    
    $button.append($ripple);
    
    setTimeout(() => $ripple.remove(), 600);
  });
}

/**
 * Initialize tooltips
 */
function initTooltips() {
  $("[data-tooltip]").each(function() {
    const $el = $(this);
    const text = $el.data("tooltip");
    
    $el.on("mouseenter", function() {
      const $tooltip = $(`<div class="premium-tooltip">${text}</div>`);
      $("body").append($tooltip);
      
      const offset = $el.offset();
      $tooltip.css({
        top: offset.top - $tooltip.outerHeight() - 8,
        left: offset.left + $el.outerWidth() / 2 - $tooltip.outerWidth() / 2
      });
      
      setTimeout(() => $tooltip.addClass("show"), 10);
    });
    
    $el.on("mouseleave", function() {
      $(".premium-tooltip").removeClass("show");
      setTimeout(() => $(".premium-tooltip").remove(), 200);
    });
  });
}

/**
 * Initialize smooth scroll for anchor links
 */
function initSmoothScroll() {
  $('a[href^="#"]').on("click", function(e) {
    const target = $(this.getAttribute("href"));
    if (target.length) {
      e.preventDefault();
      target[0].scrollIntoView({ behavior: "smooth" });
    }
  });
}

/**
 * Initialize keyboard shortcuts
 */
function initKeyboardShortcuts(instance) {
  $(document).on("keydown", function(e) {
    // Escape key - close modals
    if (e.key === "Escape") {
      $(".modal").fadeOut();
    }
    
    // Number keys 1-5 - switch tabs
    if (e.key >= "1" && e.key <= "5" && !$(e.target).is("input, textarea")) {
      const tabs = ["about", "members", "hangouts", "resources", "activity"];
      const tabIndex = parseInt(e.key) - 1;
      if (tabs[tabIndex]) {
        instance.activeTab.set(tabs[tabIndex]);
      }
    }
    
    // D key - toggle dark mode
    if (e.key === "d" && !$(e.target).is("input, textarea")) {
      $(".theme-toggle").click();
    }
  });
}

/**
 * Observe scroll animations
 */
function observeScrollAnimations() {
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    $(".animate-on-scroll").each(function() {
      observer.observe(this);
    });
  }
}

/**
 * Update user presence in group
 */
function updatePresence(groupId) {
  if (!Meteor.userId()) return;

  Meteor.call("groups.updatePresence", groupId, true, null, (error) => {
    if (error) {
      console.error("Presence update error:", error);
    }
  });
}

/**
 * Handle scroll-to-top button visibility
 */
function handleScrollToTopButton() {
  $(window).on("scroll", function() {
    if ($(this).scrollTop() > 300) {
      $(".scroll-to-top").fadeIn();
    } else {
      $(".scroll-to-top").fadeOut();
    }
  });
}

/**
 * Get online user IDs for a group
 */
function getOnlineUserIds(groupId) {
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  return AppStats.find({
    studyGroupId: groupId,
    isOnline: true,
    lastSeen: { $gte: twoMinutesAgo }
  })
    .fetch()
    .map((stat) => stat.userId);
}
```

---

## 2. Share Modal Component

Create `client/templates/study_groups/_modals/share_group_modal.html`:

```html
<template name="shareGroupModal">
  <div class="modal-overlay" data-modal="shareGroupModal">
    <div class="premium-modal">
      <button class="modal-close" data-dismiss="modal" aria-label="Close">
        <i class="fa fa-times"></i>
      </button>
      
      <div class="modal-header">
        <i class="fa fa-share-alt modal-icon"></i>
        <h2>Share Group</h2>
        <p>Share <strong>{{groupTitle}}</strong> with others</p>
      </div>

      <div class="modal-body">
        <!-- Copy Link -->
        <div class="share-option">
          <input type="text" readonly value="{{shareUrl}}" class="share-url-input" id="shareUrlInput">
          <button class="premium-button btn-primary copy-link-btn">
            <i class="fa fa-copy"></i>
            Copy Link
          </button>
        </div>

        <!-- Social Share Buttons -->
        <div class="share-buttons">
          <a href="https://twitter.com/intent/tweet?text={{shareText}}&url={{shareUrl}}" 
             target="_blank" 
             class="share-btn btn-twitter"
             data-platform="twitter">
            <i class="fab fa-twitter"></i>
            <span>Twitter</span>
          </a>
          
          <a href="https://www.facebook.com/sharer/sharer.php?u={{shareUrl}}" 
             target="_blank" 
             class="share-btn btn-facebook"
             data-platform="facebook">
            <i class="fab fa-facebook-f"></i>
            <span>Facebook</span>
          </a>
          
          <a href="https://www.linkedin.com/sharing/share-offsite/?url={{shareUrl}}" 
             target="_blank" 
             class="share-btn btn-linkedin"
             data-platform="linkedin">
            <i class="fab fa-linkedin-in"></i>
            <span>LinkedIn</span>
          </a>
          
          <a href="mailto:?subject={{shareText}}&body={{shareUrl}}" 
             class="share-btn btn-email"
             data-platform="email">
            <i class="fa fa-envelope"></i>
            <span>Email</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>
```

Create `client/templates/study_groups/_modals/share_group_modal.js`:

```javascript
import { Template } from "meteor/templating";
import { Meteor } from "meteor/meteor";
import { $ } from "meteor/jquery";

import "./share_group_modal.html";

Template.shareGroupModal.events({
  "click .copy-link-btn"(event) {
    event.preventDefault();
    
    const $input = $("#shareUrlInput");
    $input.select();
    
    try {
      document.execCommand("copy");
      
      const $btn = $(event.currentTarget);
      const originalHTML = $btn.html();
      
      $btn.html('<i class="fa fa-check"></i> Copied!');
      
      setTimeout(() => {
        $btn.html(originalHTML);
      }, 2000);
      
      Bert.alert("Link copied to clipboard!", "success");
    } catch (err) {
      Bert.alert("Failed to copy link", "danger");
    }
  },

  "click .share-btn"(event) {
    const platform = $(event.currentTarget).data("platform");
    const groupId = Template.currentData().groupId;
    
    // Log share activity
    Meteor.call("groups.shareGroup", groupId, platform, (error) => {
      if (error) {
        console.error("Share logging error:", error);
      }
    });
  },

  "click .modal-close, click .modal-overlay"(event) {
    if ($(event.target).hasClass("modal-overlay") || $(event.target).closest(".modal-close").length) {
      Modal.hide();
    }
  }
});
```

---

## 3. Essential CSS Additions

Add these to your `_group_page_premium.scss`:

```scss
// ===========================================================================
// BUTTON LOADING STATES
// ===========================================================================

.premium-button {
  position: relative;
  
  &.loading {
    color: transparent;
    pointer-events: none;
    
    &::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      width: 16px;
      height: 16px;
      margin: -8px 0 0 -8px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
  }
  
  &.animated {
    animation: buttonPulse 0.3s ease;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes buttonPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(0.95); }
}

// ===========================================================================
// RIPPLE EFFECT
// ===========================================================================

.ripple {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transform: scale(0);
  animation: ripple 0.6s ease-out;
  pointer-events: none;
}

@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}

// ===========================================================================
// TOOLTIPS
// ===========================================================================

.premium-tooltip {
  position: absolute;
  background: var(--gray-900);
  color: white;
  padding: 6px 12px;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  white-space: nowrap;
  z-index: 1000;
  opacity: 0;
  transition: opacity var(--transition-base);
  pointer-events: none;
  
  &.show {
    opacity: 1;
  }
  
  [data-theme="dark"] & {
    background: var(--gray-100);
    color: var(--gray-900);
  }
}

// ===========================================================================
// SHARE MODAL
// ===========================================================================

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: var(--space-4);
}

.premium-modal {
  background: var(--surface);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-2xl);
  max-width: 500px;
  width: 100%;
  position: relative;
  animation: modalSlideIn 0.3s ease;
  
  .modal-close {
    position: absolute;
    top: var(--space-4);
    right: var(--space-4);
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 1.5rem;
    cursor: pointer;
    transition: color var(--transition-base);
    
    &:hover {
      color: var(--text-primary);
    }
  }
  
  .modal-header {
    text-align: center;
    padding: var(--space-8) var(--space-6) var(--space-4);
    
    .modal-icon {
      font-size: 3rem;
      color: var(--brand-primary);
      margin-bottom: var(--space-4);
    }
    
    h2 {
      margin: 0 0 var(--space-2);
      font-size: 1.75rem;
    }
    
    p {
      color: var(--text-secondary);
      margin: 0;
    }
  }
  
  .modal-body {
    padding: var(--space-4) var(--space-6) var(--space-8);
  }
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.share-option {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
  
  .share-url-input {
    flex: 1;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 0.875rem;
    
    &:focus {
      outline: none;
      border-color: var(--brand-primary);
      box-shadow: 0 0 0 3px var(--brand-primary-light);
    }
  }
  
  .copy-link-btn {
    white-space: nowrap;
  }
}

.share-buttons {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
  
  .share-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    font-weight: 600;
    text-decoration: none;
    transition: all var(--transition-base);
    
    &.btn-twitter {
      background: #1DA1F2;
      color: white;
      
      &:hover {
        background: #1a8cd8;
        transform: translateY(-2px);
      }
    }
    
    &.btn-facebook {
      background: #1877F2;
      color: white;
      
      &:hover {
        background: #1564d4;
        transform: translateY(-2px);
      }
    }
    
    &.btn-linkedin {
      background: #0A66C2;
      color: white;
      
      &:hover {
        background: #095196;
        transform: translateY(-2px);
      }
    }
    
    &.btn-email {
      background: var(--gray-600);
      color: white;
      
      &:hover {
        background: var(--gray-700);
        transform: translateY(-2px);
      }
    }
  }
}

// ===========================================================================
// SCROLL TO TOP BUTTON
// ===========================================================================

.scroll-to-top {
  position: fixed;
  bottom: var(--space-8);
  right: var(--space-8);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--brand-primary);
  color: white;
  border: none;
  cursor: pointer;
  box-shadow: var(--shadow-lg);
  display: none;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  transition: all var(--transition-base);
  z-index: 100;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-xl);
  }
  
  @media (max-width: 768px) {
    bottom: var(--space-6);
    right: var(--space-6);
    width: 40px;
    height: 40px;
  }
}
```

---

## 4. Add Scroll-to-Top Button

Add this to your `single_study_group_premium.html` at the bottom:

```html
<!-- Scroll to Top Button -->
<button class="scroll-to-top" aria-label="Scroll to top">
  <i class="fa fa-arrow-up"></i>
</button>
```

---

## 🎯 Testing Checklist

After implementing, test these features:

- [ ] ✅ Bookmark button works (toggles on/off)
- [ ] ✅ Share button opens modal
- [ ] ✅ Copy link button copies to clipboard
- [ ] ✅ Social share buttons open in new tab
- [ ] ✅ Theme toggle switches between light/dark
- [ ] ✅ Tabs switch content properly
- [ ] ✅ Join button adds user to group
- [ ] ✅ Leave button removes user from group
- [ ] ✅ Member search filters list
- [ ] ✅ Filter chips work (all/organizers/online)
- [ ] ✅ Online presence shows correctly
- [ ] ✅ Scroll-to-top button appears/works
- [ ] ✅ Loading states show on buttons
- [ ] ✅ Success/error messages appear
- [ ] ✅ Tooltips show on hover
- [ ] ✅ Ripple effects work on clicks
- [ ] ✅ Keyboard shortcuts work (1-5 for tabs, D for dark mode)
- [ ] ✅ Responsive design works on mobile
- [ ] ✅ All animations smooth

---

## 🐛 Troubleshooting

### Bookmarks not working?
```javascript
// Check if collection exists
console.log(StudyGroupBookmarks); // Should not be undefined

// Check if method is registered
Meteor.call("groups.toggleBookmark", "test-id", console.log);
```

### Theme not persisting?
```javascript
// Check localStorage
console.log(localStorage.getItem("theme"));

// Manually set
localStorage.setItem("theme", "dark");
```

### Presence not updating?
```javascript
// Check if heartbeat is running
console.log("Checking presence interval...");

// Manually trigger
Meteor.call("groups.updatePresence", "group-id", true, null, console.log);
```

---

## 📚 Additional Resources

- [Meteor Guide](https://guide.meteor.com/)
- [Blaze Documentation](https://blazejs.org/guide/introduction.html)
- [MongoDB Manual](https://docs.mongodb.com/manual/)
- [SCSS Guide](https://sass-lang.com/guide)

---

**Ready to Launch! 🚀**

Everything is set up and ready to go. Just follow the steps above and your Group Page will be transformed!
