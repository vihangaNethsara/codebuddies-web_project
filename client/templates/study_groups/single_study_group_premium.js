/**
 * ============================================
 * PREMIUM GROUP PAGE - JavaScript
 * ============================================
 * World-class interactions and real-time features
 * ============================================
 */

import { Template } from "meteor/templating";
import { ReactiveVar } from "meteor/reactive-var";
import { Session } from "meteor/session";
import { Meteor } from "meteor/meteor";
import { $ } from "meteor/jquery";

import "./single_study_group_premium.html";
import "./_modals/share_group_modal.html";

// ============================================
// TEMPLATE LIFECYCLE
// ============================================

Template.single_study_group_premium.onCreated(function() {
  const instance = this;

  // Reactive state management
  instance.activeTab = new ReactiveVar("about");
  instance.isBookmarked = new ReactiveVar(false);
  instance.theme = new ReactiveVar(localStorage.getItem("theme") || "light");
  instance.searchQuery = new ReactiveVar("");
  instance.memberFilter = new ReactiveVar("all");

  // Get group ID from route
  const groupId = FlowRouter.getParam("_id");
  instance.groupId = groupId;

  // Subscribe to real-time data
  instance.autorun(() => {
    instance.subscribe("singleStudyGroup", groupId);
    instance.subscribe("studyGroupMembers", groupId);
    instance.subscribe("groupHangouts", groupId);
    instance.subscribe("groupResources", groupId);
    instance.subscribe("groupActivity", groupId, 20);
    instance.subscribe("groupPresence", groupId);
  });

  // Check if group is bookmarked
  Meteor.call("isGroupBookmarked", groupId, (error, result) => {
    if (!error) {
      instance.isBookmarked.set(result);
    }
  });
});

Template.single_study_group_premium.onRendered(function() {
  const instance = this;

  // Apply saved theme
  applyTheme(instance.theme.get());

  // Initialize micro-interactions
  initRippleEffect();
  initTooltips();
  initSmoothScroll();
  initKeyboardShortcuts(instance);

  // Observe animations on scroll
  observeScrollAnimations();

  // Update presence
  if (Meteor.userId()) {
    updatePresence(instance.groupId);

    // Heartbeat every 30 seconds
    instance.presenceInterval = Meteor.setInterval(() => {
      updatePresence(instance.groupId);
    }, 30000);
  }

  // Scroll to top button visibility
  handleScrollToTopButton();
});

Template.single_study_group_premium.onDestroyed(function() {
  const instance = this;

  // Clear presence interval
  if (instance.presenceInterval) {
    Meteor.clearInterval(instance.presenceInterval);
  }

  // Update presence to offline
  if (Meteor.userId() && instance.groupId) {
    Meteor.call("groups.updatePresence", instance.groupId, false);
  }
});

// ============================================
// HELPERS
// ============================================

Template.single_study_group_premium.helpers({
  studyGroup() {
    const groupId = Template.instance().groupId;
    return StudyGroups.findOne(groupId);
  },

  currentTheme() {
    return Template.instance().theme.get();
  },

  isDarkMode() {
    return Template.instance().theme.get() === "dark";
  },

  isActiveTab(tabName) {
    return Template.instance().activeTab.get() === tabName;
  },

  isBookmarked() {
    return Template.instance().isBookmarked.get();
  },

  members() {
    const groupId = Template.instance().groupId;
    const searchQuery = Template.instance().searchQuery.get();
    const filter = Template.instance().memberFilter.get();

    let query = { studyGroupId: groupId };

    // Apply filter
    if (filter === "organizers") {
      query.role = { $in: ["owner", "admin", "moderator"] };
    } else if (filter === "online") {
      const onlineUserIds = getOnlineUserIds(groupId);
      query.userId = { $in: onlineUserIds };
    }

    let members = StudyGroupMembers.find(query).fetch();

    // Apply search
    if (searchQuery) {
      const regex = new RegExp(searchQuery, "i");
      members = members.filter(m => {
        const user = Meteor.users.findOne(m.userId);
        return user && regex.test(user.username);
      });
    }

    // Map to user data
    return members.map(m => {
      const user = Meteor.users.findOne(m.userId);
      return {
        ...user,
        role: m.role,
        avatar: user.avatar || "/default-avatar.png",
        username: user.username
      };
    });
  },

  organizers() {
    const groupId = Template.instance().groupId;
    const organizers = StudyGroupMembers.find({
      studyGroupId: groupId,
      role: { $in: ["owner", "admin"] }
    }).fetch();

    return organizers.map(o => {
      const user = Meteor.users.findOne(o.userId);
      return {
        ...user,
        role: o.role,
        avatar: user.avatar || "/default-avatar.png",
        username: user.username
      };
    });
  },

  onlineMembers() {
    const groupId = Template.instance().groupId;
    return AppStats.find({
      studyGroupId: groupId,
      isOnline: true
    })
      .fetch()
      .map(stat => {
        const user = Meteor.users.findOne(stat.userId);
        return {
          ...user,
          avatar: user.avatar || "/default-avatar.png",
          username: user.username,
          status: stat.status
        };
      });
  },

  hangouts() {
    const groupId = Template.instance().groupId;
    return Hangouts.find({ studyGroupId: groupId }, { sort: { start: -1 } }).fetch();
  },

  resources() {
    const groupId = Template.instance().groupId;
    return Resources.find({ studyGroupId: groupId }, { sort: { createdAt: -1 } }).fetch();
  },

  activities() {
    const groupId = Template.instance().groupId;
    return GroupActivities.find({ studyGroupId: groupId }, { sort: { timestamp: -1 }, limit: 20 }).fetch();
  },

  memberCount() {
    const groupId = Template.instance().groupId;
    return StudyGroupMembers.find({ studyGroupId: groupId }).count();
  },

  hangoutsCount() {
    const groupId = Template.instance().groupId;
    return Hangouts.find({ studyGroupId: groupId }).count();
  },

  resourcesCount() {
    const groupId = Template.instance().groupId;
    return Resources.find({ studyGroupId: groupId }).count();
  },

  activityCount() {
    const groupId = Template.instance().groupId;
    return GroupActivities.find({ studyGroupId: groupId }).count();
  },

  upcomingHangoutsCount() {
    const groupId = Template.instance().groupId;
    return Hangouts.find({
      studyGroupId: groupId,
      start: { $gte: new Date() }
    }).count();
  },

  isMember() {
    const groupId = Template.instance().groupId;
    return StudyGroupMembers.findOne({
      studyGroupId: groupId,
      userId: Meteor.userId()
    });
  },

  canEdit() {
    const groupId = Template.instance().groupId;
    const member = StudyGroupMembers.findOne({
      studyGroupId: groupId,
      userId: Meteor.userId()
    });
    return member && ["owner", "admin"].includes(member.role);
  },

  isPublic() {
    const group = StudyGroups.findOne(Template.instance().groupId);
    return group && group.visibility === "public";
  },

  // Format helpers
  formatDate(date) {
    return moment(date).format("MMM D, YYYY");
  },

  formatDateTime(date) {
    return moment(date).format("MMM D, YYYY [at] h:mm A");
  },

  formatTimeAgo(date) {
    return moment(date).fromNow();
  },

  pluralize(count, singular, plural) {
    return count === 1 ? singular : plural;
  },

  roleIcon(role) {
    const icons = {
      owner: "crown",
      admin: "shield",
      moderator: "star",
      member: "user"
    };
    return icons[role] || "user";
  },

  getResourceIcon(type) {
    const icons = {
      article: "file-text-o",
      video: "video-camera",
      tutorial: "graduation-cap",
      tool: "wrench",
      documentation: "book",
      other: "link"
    };
    return icons[type] || "link";
  },

  getActivityIcon(type) {
    const icons = {
      join: "user-plus",
      leave: "user-times",
      hangout: "video-camera",
      resource: "book",
      comment: "comment"
    };
    return icons[type] || "circle";
  },

  formatActivity(activity) {
    const user = Meteor.users.findOne(activity.userId);
    const username = user ? user.username : "Someone";

    const templates = {
      join: `<strong>${username}</strong> joined the group`,
      leave: `<strong>${username}</strong> left the group`,
      hangout: `<strong>${username}</strong> created a hangout: <a href="/hangout/${activity.hangoutId}">${
        activity.hangoutTitle
      }</a>`,
      resource: `<strong>${username}</strong> added a resource: ${activity.resourceTitle}`,
      comment: `<strong>${username}</strong> commented on ${activity.commentTarget}`
    };

    return templates[activity.type] || activity.description;
  }
});

// ============================================
// EVENTS
// ============================================

Template.single_study_group_premium.events({
  // ============================================
  // THEME TOGGLE
  // ============================================
  "click .theme-toggle"(event, instance) {
    event.preventDefault();
    const currentTheme = instance.theme.get();
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    instance.theme.set(newTheme);
    applyTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    showToast(`Switched to ${newTheme} mode`, "success");
  },

  // ============================================
  // TAB NAVIGATION
  // ============================================
  "click .tab-button"(event, instance) {
    event.preventDefault();
    const tabName = $(event.currentTarget).data("tab");
    instance.activeTab.set(tabName);

    // Update URL without reload
    const groupId = instance.groupId;
    FlowRouter.setParams({ _id: groupId });
    FlowRouter.setQueryParams({ tab: tabName });

    // Smooth scroll to tab content
    setTimeout(() => {
      const tabPanel = document.getElementById(`tab-${tabName}`);
      if (tabPanel) {
        tabPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 100);

    // Log activity
    logActivity(groupId, "view_tab", { tabName });
  },

  // ============================================
  // BOOKMARK
  // ============================================
  "click .bookmark-btn"(event, instance) {
    event.preventDefault();

    if (!Meteor.userId()) {
      showToast("Please sign in to bookmark groups", "warning");
      return;
    }

    const groupId = instance.groupId;
    const isBookmarked = instance.isBookmarked.get();

    // Optimistic UI update
    instance.isBookmarked.set(!isBookmarked);

    const method = isBookmarked ? "removeBookmark" : "addBookmark";
    Meteor.call(method, groupId, error => {
      if (error) {
        // Revert on error
        instance.isBookmarked.set(isBookmarked);
        showToast("Failed to update bookmark", "error");
      } else {
        showToast(isBookmarked ? "Bookmark removed" : "Group bookmarked!", "success");
      }
    });
  },

  // ============================================
  // SHARE
  // ============================================
  "click .share-btn"(event, instance) {
    event.preventDefault();

    const group = StudyGroups.findOne(instance.groupId);
    if (!group) return;

    const shareData = {
      title: group.title,
      text: group.tagline || `Check out ${group.title} on CodeBuddies`,
      url: window.location.href
    };

    // Try Web Share API first
    if (navigator.share) {
      navigator
        .share(shareData)
        .then(() => {
          showToast("Shared successfully!", "success");
          logActivity(instance.groupId, "share", { method: "native" });
        })
        .catch(error => {
          if (error.name !== "AbortError") {
            copyToClipboard(shareData.url, instance);
          }
        });
    } else {
      // Fallback — open our modal
      // Render modal template into body
      const modalHtml = Blaze.toHTMLWithData(Template.share_group_modal, {});
      // Ensure no duplicates
      document.querySelectorAll(".modal-backdrop").forEach(n => n.remove());
      const wrapper = document.createElement("div");
      wrapper.innerHTML = modalHtml;
      document.body.appendChild(wrapper.firstElementChild);
      // Populate input value
      const input = document.querySelector(".share-modal .input-link");
      if (input) input.value = shareData.url;
    }
  },

  // ============================================
  // JOIN GROUP
  // ============================================
  "click .join-group-btn, .join-btn"(event, instance) {
    event.preventDefault();

    if (!Meteor.userId()) {
      showToast("Please sign in to join groups", "warning");
      FlowRouter.go("/sign-in");
      return;
    }

    const groupId = instance.groupId;
    const button = event.currentTarget;

    // Add loading state
    button.classList.add("loading");
    button.disabled = true;

    Meteor.call("joinStudyGroup", groupId, error => {
      button.classList.remove("loading");
      button.disabled = false;

      if (error) {
        showToast("Failed to join group: " + error.reason, "error");
      } else {
        showToast("Welcome to the group! 🎉", "success");
        logActivity(groupId, "join", {});
      }
    });
  },

  // ============================================
  // LEAVE GROUP
  // ============================================
  "click .leave-group-btn"(event, instance) {
    event.preventDefault();

    const group = StudyGroups.findOne(instance.groupId);
    if (!group) return;

    if (confirm(`Are you sure you want to leave "${group.title}"?`)) {
      const groupId = instance.groupId;

      Meteor.call("leaveStudyGroup", groupId, error => {
        if (error) {
          showToast("Failed to leave group: " + error.reason, "error");
        } else {
          showToast("You have left the group", "success");
          logActivity(groupId, "leave", {});

          // Redirect after 2 seconds
          setTimeout(() => {
            FlowRouter.go("/study-groups");
          }, 2000);
        }
      });
    }
  },

  // ============================================
  // SEARCH MEMBERS
  // ============================================
  "input .search-input"(event, instance) {
    const query = event.target.value;
    instance.searchQuery.set(query);

    // Show/hide clear button
    const clearBtn = $(event.target).siblings(".search-clear");
    if (query) {
      clearBtn.addClass("show");
    } else {
      clearBtn.removeClass("show");
    }
  },

  "click .search-clear"(event, instance) {
    event.preventDefault();
    instance.searchQuery.set("");
    $(".search-input")
      .val("")
      .focus();
    $(event.currentTarget).removeClass("show");
  },

  // ============================================
  // FILTER MEMBERS
  // ============================================
  "click .filter-chip"(event, instance) {
    event.preventDefault();
    const filter = $(event.currentTarget).data("filter");
    instance.memberFilter.set(filter);

    // Update active state
    $(".filter-chip").removeClass("active");
    $(event.currentTarget).addClass("active");
  },

  // ============================================
  // CREATE HANGOUT
  // ============================================
  "click .create-hangout-btn"(event, instance) {
    event.preventDefault();
    const groupId = instance.groupId;
    FlowRouter.go(`/hangout/new?studyGroupId=${groupId}`);
  },

  // ============================================
  // ADD RESOURCE
  // ============================================
  "click .add-resource-btn"(event, instance) {
    event.preventDefault();
    // Open add resource modal
    // TODO: Implement modal
    showToast("Add resource feature coming soon!", "info");
  },

  // ============================================
  // SCROLL TO TOP
  // ============================================
  "click .scroll-to-top"(event, instance) {
    event.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  },

  // ============================================
  // CLOSE TOAST
  // ============================================
  "click .toast-close"(event) {
    event.preventDefault();
    const toast = $(event.currentTarget).closest(".toast-premium");
    closeToast(toast);
  }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Apply theme to container
 */
function applyTheme(theme) {
  const container = document.querySelector(".premium-container");
  if (container) {
    container.setAttribute("data-theme", theme);
  }
}

/**
 * Initialize ripple effect on buttons
 */
function initRippleEffect() {
  // Ripple effect is handled by CSS
  // Just ensure buttons have the right class
  document.querySelectorAll(".premium-button").forEach(button => {
    if (!button.classList.contains("btn-ghost")) {
      // Ghost buttons don't need ripple
    }
  });
}

/**
 * Initialize tooltips
 */
function initTooltips() {
  // Tooltips are handled by CSS :hover
  // Just ensure data-tooltip attributes are present
}

/**
 * Initialize smooth scroll for anchors
 */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });
  });
}

/**
 * Initialize keyboard shortcuts
 */
function initKeyboardShortcuts(instance) {
  document.addEventListener("keydown", e => {
    // Ignore if typing in input
    if (e.target.matches("input, textarea")) {
      // Allow ESC to close search
      if (e.key === "Escape") {
        e.target.blur();
      }
      return;
    }

    const key = e.key.toLowerCase();

    // Tab shortcuts (1-5)
    const tabMap = {
      "1": "about",
      "2": "members",
      "3": "hangouts",
      "4": "resources",
      "5": "activity"
    };

    if (tabMap[key]) {
      e.preventDefault();
      instance.activeTab.set(tabMap[key]);
      return;
    }

    // Action shortcuts
    switch (key) {
      case "j":
        // Join group
        e.preventDefault();
        $(".join-group-btn").click();
        break;
      case "h":
        // Create hangout
        e.preventDefault();
        $(".create-hangout-btn").click();
        break;
      case "s":
        // Share
        e.preventDefault();
        $(".share-btn").click();
        break;
      case "b":
        // Bookmark
        e.preventDefault();
        $(".bookmark-btn").click();
        break;
      case "t":
        // Toggle theme
        e.preventDefault();
        $(".theme-toggle").click();
        break;
      case "/":
        // Focus search
        e.preventDefault();
        $(".search-input").focus();
        break;
    }
  });
}

/**
 * Observe scroll animations
 */
function observeScrollAnimations() {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in");
        }
      });
    },
    {
      threshold: 0.1
    }
  );

  document.querySelectorAll(".premium-card, .member-card-premium, .activity-item").forEach(el => {
    observer.observe(el);
  });
}

/**
 * Handle scroll-to-top button visibility
 */
function handleScrollToTopButton() {
  const button = document.querySelector(".scroll-to-top");
  if (!button) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
      button.style.display = "flex";
    } else {
      button.style.display = "none";
    }
  });
}

/**
 * Update user presence
 */
function updatePresence(groupId) {
  if (!Meteor.userId() || !groupId) return;

  Meteor.call("groups.updatePresence", groupId, true, error => {
    if (error) {
      console.error("Failed to update presence:", error);
    }
  });
}

/**
 * Get online user IDs
 */
function getOnlineUserIds(groupId) {
  return AppStats.find({
    studyGroupId: groupId,
    isOnline: true
  }).map(stat => stat.userId);
}

/**
 * Copy to clipboard
 */
function copyToClipboard(text, instance) {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      showToast("Link copied to clipboard!", "success");
      logActivity(instance.groupId, "share", { method: "clipboard" });
    })
    .catch(() => {
      showToast("Failed to copy link", "error");
    });
}

/**
 * Show toast notification
 */
function showToast(message, type = "info") {
  const container = document.querySelector(".toast-container");
  if (!container) return;

  const iconMap = {
    success: "check-circle",
    error: "times-circle",
    warning: "exclamation-triangle",
    info: "info-circle"
  };

  const titleMap = {
    success: "Success",
    error: "Error",
    warning: "Warning",
    info: "Info"
  };

  const toast = document.createElement("div");
  toast.className = `toast-premium toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fa fa-${iconMap[type]}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-title">${titleMap[type]}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close">
      <i class="fa fa-times"></i>
    </button>
    <div class="toast-progress"></div>
  `;

  container.appendChild(toast);

  // Show toast
  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  // Auto hide after 5 seconds
  setTimeout(() => {
    closeToast($(toast));
  }, 5000);
}

/**
 * Close toast
 */
function closeToast(toast) {
  toast.addClass("hide");
  setTimeout(() => {
    toast.remove();
  }, 300);
}

/**
 * Log activity
 */
function logActivity(groupId, activityType, data) {
  if (!Meteor.userId()) return;

  Meteor.call("groups.logActivity", groupId, activityType, data, error => {
    if (error) {
      console.error("Failed to log activity:", error);
    }
  });
}

// Export for testing
if (typeof module !== "undefined") {
  module.exports = {
    showToast,
    copyToClipboard,
    applyTheme
  };
}
