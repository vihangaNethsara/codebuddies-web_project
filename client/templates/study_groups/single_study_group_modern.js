/**
 * ============================================
 * MODERN SINGLE STUDY GROUP - JAVASCRIPT
 * ============================================
 * Enhanced functionality with modern UX features
 *
 * Features:
 * - Tab management with URL sync
 * - Share functionality
 * - Bookmark functionality
 * - Enhanced animations
 * - Keyboard shortcuts
 * - Loading states
 * - Error handling
 *
 * Author: Professional Full-Stack Developer
 * Date: 2025
 * ============================================
 */

// ============================================
// TEMPLATE LIFECYCLE - onCreated
// ============================================
Template.singleStudyGroupModern.onCreated(function() {
  const instance = this;

  // Get study group ID from URL
  instance.studyGroupId = FlowRouter.getParam("studyGroupId");
  instance.hangoutId = `cb${instance.studyGroupId}`;

  // Reactive variable for active tab
  instance.activeTab = new ReactiveVar("overview");

  // Reactive variable for bookmark state
  instance.isBookmarked = new ReactiveVar(false);

  // Subscribe to data
  instance.autorun(() => {
    instance.subscribe("studyGroupById", instance.studyGroupId);
    instance.subscribe("hangoutParticipants", instance.hangoutId);
  });

  // Load active tab from URL hash
  const hash = window.location.hash.replace("#", "");
  if (hash) {
    instance.activeTab.set(hash);
  }

  // Check if group is bookmarked (if user is logged in)
  if (Meteor.userId()) {
    Meteor.call("isGroupBookmarked", instance.studyGroupId, (error, result) => {
      if (!error && result) {
        instance.isBookmarked.set(true);
      }
    });
  }
});

// ============================================
// TEMPLATE LIFECYCLE - onRendered
// ============================================
Template.singleStudyGroupModern.onRendered(function() {
  const instance = this;

  // Set page title and meta description
  const title = "CodeBuddies | Study Groups";
  const metaInfo = {
    name: "description",
    content:
      "Join CodeBuddies study groups to learn together. Connect with independent code learners from around the world who enjoy sharing knowledge and helping each other."
  };
  DocHead.setTitle(title);
  DocHead.addMeta(metaInfo);

  // Activate the tab from reactive variable
  instance.autorun(() => {
    const activeTab = instance.activeTab.get();
    activateTab(activeTab);
  });

  // Add smooth scroll behavior
  $("html, body").css("scroll-behavior", "smooth");

  // Initialize tooltips (if Bootstrap is available)
  if (typeof $.fn.tooltip === "function") {
    $("[title]").tooltip();
  }

  // Add keyboard shortcuts
  $(document).on("keydown.studyGroup", e => {
    // Only if no input is focused
    if (!$(e.target).is("input, textarea, select")) {
      // Numbers 1-9 for tabs
      if (e.key >= "1" && e.key <= "9") {
        const tabIndex = parseInt(e.key) - 1;
        const tabs = $(".tab-item");
        if (tabs[tabIndex]) {
          $(tabs[tabIndex]).trigger("click");
        }
      }
      // 'J' to join/leave group
      if (e.key === "j" || e.key === "J") {
        $(".joinStudyGroup, .leaveStudyGroup")
          .first()
          .trigger("click");
      }
      // 'H' to create hangout
      if (e.key === "h" || e.key === "H") {
        $("#newHangout").trigger("click");
      }
      // 'S' to share
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        $("#shareGroup").trigger("click");
      }
    }
  });
});

// ============================================
// TEMPLATE LIFECYCLE - onDestroyed
// ============================================
Template.singleStudyGroupModern.onDestroyed(function() {
  // Clean up keyboard shortcuts
  $(document).off("keydown.studyGroup");

  // Remove smooth scroll
  $("html, body").css("scroll-behavior", "");

  // Destroy tooltips
  if (typeof $.fn.tooltip === "function") {
    $("[title]").tooltip("dispose");
  }
});

// ============================================
// HELPERS
// ============================================
Template.singleStudyGroupModern.helpers({
  /**
   * Get the current study group
   */
  studyGroup: function() {
    return StudyGroups.findOne({ _id: FlowRouter.getParam("studyGroupId") });
  },

  /**
   * Count of users currently online
   */
  usersOnlineCount: function() {
    return Meteor.users.find({ "status.online": true }).count();
  },

  /**
   * Count of resources in this group
   */
  resourcesCount: function() {
    return Resources.find().count();
  },

  /**
   * Count of learnings in this group
   */
  learningsCount: function() {
    return Learnings.find().count();
  },

  /**
   * Number of participants in 24/7 hangout
   */
  numParticipants: function() {
    const appState = AppStats.findOne({ _id: Template.instance().hangoutId });
    if (appState && appState.participants) {
      return appState.participants.length;
    }
    return 0;
  },

  /**
   * Check if current tab is active
   */
  isActiveTab: function(tabName) {
    return Template.instance().activeTab.get() === tabName;
  },

  /**
   * Check if group is bookmarked
   */
  isBookmarked: function() {
    return Template.instance().isBookmarked.get();
  }
});

// ============================================
// EVENT HANDLERS
// ============================================
Template.singleStudyGroupModern.events({
  /**
   * Tab click handler
   * Switches between different content tabs
   */
  "click .tab-item": function(event, template) {
    event.preventDefault();
    const tabName = $(event.currentTarget).data("tab");

    // Update reactive variable
    template.activeTab.set(tabName);

    // Update URL hash (for bookmarking/sharing)
    window.location.hash = tabName;

    // Scroll to top of content
    $(".main-content-area")
      .get(0)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  },

  /**
   * Join Study Group
   * Adds current user to the study group
   */
  "click .joinStudyGroup": function(event, template) {
    event.preventDefault();

    // Show loading state
    const $btn = $(event.currentTarget);
    const originalHTML = $btn.html();
    $btn.prop("disabled", true).html('<i class="fas fa-spinner fa-spin"></i> Joining...');

    const data = {
      studyGroupId: this._id,
      studyGroupTitle: this.title,
      studyGroupSlug: this.slug
    };

    Meteor.call("joinStudyGroup", data, function(error, result) {
      // Restore button state
      $btn.prop("disabled", false).html(originalHTML);

      if (error) {
        return Bert.alert(error.reason, "danger", "growl-top-right");
      }

      if (result) {
        // Show success message
        Bert.alert("🎉 You have joined the study group!", "success", "growl-top-right");

        // Animate button transformation
        $btn.addClass("animate__animated animate__bounceOut");
        setTimeout(() => {
          // Button will be replaced by template re-render
        }, 500);
      }
    });
  },

  /**
   * Leave Study Group
   * Removes current user from the study group
   */
  "click .leaveStudyGroup": function(event, template) {
    event.preventDefault();

    // Confirm before leaving
    if (!confirm("Are you sure you want to leave this study group?")) {
      return;
    }

    // Show loading state
    const $btn = $(event.currentTarget);
    const originalHTML = $btn.html();
    $btn.prop("disabled", true).html('<i class="fas fa-spinner fa-spin"></i> Leaving...');

    const data = {
      studyGroupId: this._id,
      studyGroupTitle: this.title,
      studyGroupSlug: this.slug
    };

    Meteor.call("leaveStudyGroup", data, function(error, result) {
      // Restore button state
      $btn.prop("disabled", false).html(originalHTML);

      if (error) {
        return Bert.alert(error.reason, "danger", "growl-top-right");
      }

      if (result) {
        Bert.alert("You have left the study group", "info", "growl-top-right");
      }
    });
  },

  /**
   * Create New Hangout
   * Opens modal to create a hangout event
   */
  "click #newHangout": function(event, template) {
    event.preventDefault();
    Modal.show("createHangoutModal");
  },

  /**
   * Edit Group Title
   * Opens modal to edit the group title
   */
  "click #editTitle": function(event, template) {
    event.preventDefault();
    Modal.show("editStudyGroupTitleModal", this);
  },

  /**
   * Share Group
   * Copies group URL to clipboard and shows social share options
   */
  "click #shareGroup": function(event, template) {
    event.preventDefault();

    const groupUrl = window.location.href.split("#")[0];

    // Try to use native Web Share API (mobile)
    if (navigator.share) {
      navigator
        .share({
          title: this.title,
          text: `Join me in ${this.title} on CodeBuddies!`,
          url: groupUrl
        })
        .then(() => {
          Bert.alert("Shared successfully!", "success", "growl-top-right");
        })
        .catch(error => {
          // User cancelled, no action needed
          console.log("Share cancelled", error);
        });
    } else {
      // Fallback: Copy to clipboard
      copyToClipboard(groupUrl);
      Bert.alert("📋 Link copied to clipboard!", "success", "growl-top-right");

      // Optional: Show social share buttons
      showSocialShareModal(this.title, groupUrl);
    }
  },

  /**
   * Bookmark Group
   * Adds/removes group from user's bookmarks
   */
  "click #bookmarkGroup": function(event, template) {
    event.preventDefault();

    const $btn = $(event.currentTarget);
    const $icon = $btn.find("i");
    const isBookmarked = template.isBookmarked.get();

    // Toggle bookmark
    const method = isBookmarked ? "removeBookmark" : "addBookmark";

    Meteor.call(method, this._id, function(error, result) {
      if (error) {
        return Bert.alert(error.reason, "danger", "growl-top-right");
      }

      if (result) {
        // Update state
        template.isBookmarked.set(!isBookmarked);

        // Animate icon
        $icon.toggleClass("far fas");
        $btn.addClass("animate__animated animate__heartBeat");
        setTimeout(() => {
          $btn.removeClass("animate__animated animate__heartBeat");
        }, 1000);

        // Show message
        const message = !isBookmarked ? "🔖 Bookmarked!" : "Bookmark removed";
        Bert.alert(message, "success", "growl-top-right");
      }
    });
  },

  /**
   * View Member Details
   * Opens modal with member information
   */
  "click .memberDetail": function(event, template) {
    event.preventDefault();
    return Modal.show("studyGroupMemberDetail", this);
  }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Activate a specific tab
 * @param {string} tabName - Name of the tab to activate
 */
function activateTab(tabName) {
  // Remove active class from all tabs
  $(".tab-item")
    .removeClass("active")
    .attr("aria-selected", "false");
  $(".tab-pane-modern").removeClass("active");

  // Add active class to selected tab
  $(`.tab-item[data-tab="${tabName}"]`)
    .addClass("active")
    .attr("aria-selected", "true");
  $(`#${tabName}`).addClass("active");
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 */
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    // Modern approach
    navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

/**
 * Show social share modal
 * @param {string} title - Group title
 * @param {string} url - Group URL
 */
function showSocialShareModal(title, url) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`
  };

  // You can implement a custom modal here or use the existing modal system
  // For now, just log the links
  console.log("Social share links:", shareLinks);

  // Optional: Open Twitter share as example
  // window.open(shareLinks.twitter, '_blank', 'width=600,height=400');
}

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDate(date) {
  if (!date) return "";

  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString();
}

// ============================================
// METEOR METHODS (Server-side - see below)
// ============================================
// These methods should be added to the server/study_groups/methods.js file

/*
// Add to server/study_groups/methods.js:

Meteor.methods({
  // Check if group is bookmarked by current user
  isGroupBookmarked(groupId) {
    check(groupId, String);
    
    if (!this.userId) {
      return false;
    }
    
    const user = Meteor.users.findOne(this.userId);
    return user && user.profile && user.profile.bookmarkedGroups 
           && user.profile.bookmarkedGroups.includes(groupId);
  },
  
  // Add group to bookmarks
  addBookmark(groupId) {
    check(groupId, String);
    
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    
    Meteor.users.update(this.userId, {
      $addToSet: { 'profile.bookmarkedGroups': groupId }
    });
    
    return true;
  },
  
  // Remove group from bookmarks
  removeBookmark(groupId) {
    check(groupId, String);
    
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in');
    }
    
    Meteor.users.update(this.userId, {
      $pull: { 'profile.bookmarkedGroups': groupId }
    });
    
    return true;
  }
});
*/
