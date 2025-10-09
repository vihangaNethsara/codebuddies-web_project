/**
 * ============================================
 * PREMIUM GROUP PAGE - Backend Methods
 * ============================================
 * Real-time features, presence tracking, activity logging
 * ============================================
 */

import { Meteor } from "meteor/meteor";
import { check, Match } from "meteor/check";
import { Email } from "meteor/email";

// ============================================
// METEOR METHODS
// ============================================

Meteor.methods({
  /**
   * Update user presence in a study group
   * @param {String} groupId - Study group ID
   * @param {Boolean} isOnline - User online status
   * @param {String} status - Optional custom status message
   */
  "groups.updatePresence"(groupId, isOnline, status = null) {
    check(groupId, String);
    check(isOnline, Boolean);
    check(status, Match.Maybe(String));

    if (!this.userId) {
      throw new Meteor.Error("not-authorized", "You must be logged in");
    }

    // Verify user is a member
    const member = StudyGroupMembers.findOne({
      studyGroupId: groupId,
      userId: this.userId
    });

    if (!member) {
      throw new Meteor.Error("not-member", "You must be a member of this group");
    }

    // Update or insert presence record
    const presenceData = {
      studyGroupId: groupId,
      userId: this.userId,
      isOnline: isOnline,
      lastSeen: new Date()
    };

    if (status) {
      presenceData.status = status;
    }

    try {
      // Try to update existing record first
      const updated = AppStats.update({ studyGroupId: groupId, userId: this.userId }, { $set: presenceData });

      // If no record exists, insert new one
      if (updated === 0) {
        try {
          AppStats.insert(presenceData);
        } catch (insertError) {
          // If insert fails (duplicate key), try update again
          AppStats.update({ studyGroupId: groupId, userId: this.userId }, { $set: presenceData });
        }
      }
    } catch (error) {
      console.error("Error updating presence:", error);
      // Don't throw error to prevent app crash
    }

    return true;
  },

  /**
   * Get online members for a group
   * @param {String} groupId - Study group ID
   */
  "groups.getOnlineMembers"(groupId) {
    check(groupId, String);

    // Get presence records from last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    return AppStats.find({
      studyGroupId: groupId,
      isOnline: true,
      lastSeen: { $gte: twoMinutesAgo }
    }).fetch();
  },

  /**
   * Log activity in the group
   * @param {String} groupId - Study group ID
   * @param {String} activityType - Type of activity (join, leave, hangout, resource, etc.)
   * @param {Object} data - Additional activity data
   */
  "groups.logActivity"(groupId, activityType, data = {}) {
    check(groupId, String);
    check(activityType, String);
    check(data, Object);

    if (!this.userId) {
      throw new Meteor.Error("not-authorized", "You must be logged in");
    }

    // Verify group exists
    const group = StudyGroups.findOne(groupId);
    if (!group) {
      throw new Meteor.Error("not-found", "Study group not found");
    }

    // Create activity record
    const activity = {
      studyGroupId: groupId,
      userId: this.userId,
      type: activityType,
      data: data,
      timestamp: new Date()
    };

    // Insert into activities collection
    // Note: Create GroupActivities collection if it doesn't exist
    if (typeof GroupActivities !== "undefined") {
      GroupActivities.insert(activity);
    } else {
      console.warn("GroupActivities collection not defined");
    }

    // Update group's last activity timestamp
    StudyGroups.update(groupId, {
      $set: { lastActivityAt: new Date() }
    });

    return true;
  },

  /**
   * Get recent activity for a group
   * @param {String} groupId - Study group ID
   * @param {Number} limit - Maximum number of activities to return
   */
  "groups.getRecentActivity"(groupId, limit = 20) {
    check(groupId, String);
    check(limit, Number);

    if (typeof GroupActivities === "undefined") {
      return [];
    }

    return GroupActivities.find(
      { studyGroupId: groupId },
      {
        sort: { timestamp: -1 },
        limit: limit
      }
    ).fetch();
  },

  /**
   * Toggle bookmark (add or remove)
   * @param {String} groupId - Study group ID
   */
  "groups.toggleBookmark"(groupId) {
    check(groupId, String);

    if (!this.userId) {
      throw new Meteor.Error("not-authorized", "You must be logged in");
    }

    // Verify group exists
    const group = StudyGroups.findOne(groupId);
    if (!group) {
      throw new Meteor.Error("not-found", "Study group not found");
    }

    // Check if already bookmarked
    const existingBookmark = StudyGroupBookmarks.findOne({
      studyGroupId: groupId,
      userId: this.userId
    });

    if (existingBookmark) {
      // Remove bookmark
      StudyGroupBookmarks.remove(existingBookmark._id);
      return { bookmarked: false, message: "Bookmark removed" };
    }

    // Add bookmark
    StudyGroupBookmarks.insert({
      studyGroupId: groupId,
      userId: this.userId,
      createdAt: new Date()
    });

    // Create notification for group organizers
    if (!group || !group.members) {
      return { bookmarked: true, message: "Bookmark added" };
    }

    const organizers = group.members.filter(m => ["owner", "admin"].includes(m.role));

    const user = Meteor.users.findOne(this.userId);
    const username = user ? user.username : "Someone";

    organizers.forEach(organizer => {
      if (typeof Notifications !== "undefined") {
        Notifications.insert({
          userId: organizer.id,
          type: "group_bookmark",
          message: `${username} bookmarked ${group.title}`,
          groupId: groupId,
          createdAt: new Date(),
          read: false
        });
      }
    });

    // Log activity
    this.unblock();
    Meteor.call("groups.logActivity", groupId, "bookmark", {
      username: username
    });

    return { bookmarked: true, message: "Bookmark added" };
  },

  /**
   * Share group - Log sharing activity
   * @param {String} groupId - Study group ID
   * @param {String} platform - Sharing platform (twitter, facebook, linkedin, email, link)
   */
  "groups.shareGroup"(groupId, platform = "link") {
    check(groupId, String);
    check(platform, String);

    if (!this.userId) {
      throw new Meteor.Error("not-authorized", "You must be logged in");
    }

    // Verify group exists
    const group = StudyGroups.findOne(groupId);
    if (!group) {
      throw new Meteor.Error("not-found", "Study group not found");
    }

    const user = Meteor.users.findOne(this.userId);
    const username = user ? user.username : "Someone";

    // Log activity
    this.unblock();
    Meteor.call("groups.logActivity", groupId, "share", {
      username: username,
      platform: platform
    });

    // Generate share URL
    const groupUrl = Meteor.absoluteUrl(`study-groups/${group.slug || groupId}`);

    return {
      success: true,
      url: groupUrl,
      message: `Shared on ${platform}`
    };
  },

  /**
   * Remove bookmark
   * @param {String} groupId - Study group ID
   */
  "groups.removeBookmark"(groupId) {
    check(groupId, String);

    if (!this.userId) {
      throw new Meteor.Error("not-authorized", "You must be logged in");
    }

    const result = StudyGroupBookmarks.remove({
      studyGroupId: groupId,
      userId: this.userId
    });

    if (result === 0) {
      throw new Meteor.Error("not-bookmarked", "Group was not bookmarked");
    }

    return true;
  },

  /**
   * Check if group is bookmarked by current user
   * @param {String} groupId - Study group ID
   */
  "groups.isBookmarked"(groupId) {
    check(groupId, String);

    if (!this.userId) {
      return false;
    }

    // Check if StudyGroupBookmarks collection exists
    if (typeof StudyGroupBookmarks === "undefined") {
      return false;
    }

    const bookmark = StudyGroupBookmarks.findOne({
      studyGroupId: groupId,
      userId: this.userId
    });

    return !!bookmark;
  },

  /**
   * Invite members to group via email
   * @param {String} groupId - Study group ID
   * @param {Array} emails - Array of email addresses
   */
  "groups.inviteMembers"(groupId, emails) {
    check(groupId, String);
    check(emails, [String]);

    if (!this.userId) {
      throw new Meteor.Error("not-authorized", "You must be logged in");
    }

    // Verify user is organizer
    const group = StudyGroups.findOne(groupId);
    if (!group) {
      throw new Meteor.Error("not-found", "Study group not found");
    }

    const member = group.members ? group.members.find(m => m.id === this.userId) : null;

    if (!member || !["owner", "admin"].includes(member.role)) {
      throw new Meteor.Error("not-authorized", "Only organizers can invite members");
    }

    const user = Meteor.users.findOne(this.userId);
    const inviterName = user ? user.username : "Someone";

    // Generate invite link
    const inviteLink = Meteor.absoluteUrl(`study-groups/${group.slug || groupId}`);

    // Send emails
    let successCount = 0;
    emails.forEach(email => {
      try {
        Email.send({
          to: email,
          from: "noreply@codebuddies.org",
          subject: `${inviterName} invited you to join ${group.title}`,
          html: `
            <h2>You've been invited!</h2>
            <p>${inviterName} has invited you to join the study group <strong>${
            group.title
          }</strong> on CodeBuddies.</p>
            ${group.tagline ? `<p>${group.tagline}</p>` : ""}
            <p><a href="${inviteLink}" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Join Group</a></p>
            <p>Or copy this link: ${inviteLink}</p>
          `
        });
        successCount++;
      } catch (error) {
        console.error("Failed to send invite to", email, error);
      }
    });

    // Log activity
    this.unblock();
    Meteor.call("groups.logActivity", groupId, "invite", {
      inviterName: inviterName,
      emailCount: emails.length
    });

    return {
      success: true,
      sent: successCount,
      total: emails.length
    };
  },

  /**
   * Generate shareable invite link
   * @param {String} groupId - Study group ID
   */
  "groups.generateInviteLink"(groupId) {
    check(groupId, String);

    if (!this.userId) {
      throw new Meteor.Error("not-authorized", "You must be logged in");
    }

    // Verify group exists
    const group = StudyGroups.findOne(groupId);
    if (!group) {
      throw new Meteor.Error("not-found", "Study group not found");
    }

    // Generate unique token
    const token = Random.id(20);

    // Store invite link
    if (typeof GroupInviteLinks !== "undefined") {
      GroupInviteLinks.insert({
        studyGroupId: groupId,
        token: token,
        createdBy: this.userId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        uses: 0,
        maxUses: null // Unlimited
      });
    }

    return {
      link: Meteor.absoluteUrl(`invite/${token}`),
      token: token
    };
  }
});

// ============================================
// CLEANUP TASKS
// ============================================

/**
 * Clean up old presence records
 * Run this periodically (e.g., every 5 minutes)
 */
if (Meteor.isServer) {
  Meteor.setInterval(() => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Mark users as offline if they haven't pinged in 5 minutes
    AppStats.update(
      {
        isOnline: true,
        lastSeen: { $lt: fiveMinutesAgo }
      },
      {
        $set: { isOnline: false }
      },
      { multi: true }
    );
  }, 5 * 60 * 1000); // Every 5 minutes
}

// ============================================
// INDEXES (for performance)
// ============================================
// Note: Indexes should be created manually via MongoDB shell if needed
// to avoid startup crashes and conflicts with existing data.
//
// Recommended indexes:
// db.app_stats.createIndex({ studyGroupId: 1, isOnline: 1, lastSeen: -1 })
// db.app_stats.createIndex({ userId: 1, studyGroupId: 1 })
// db.activities.createIndex({ studyGroupId: 1, timestamp: -1 })
// db.activities.createIndex({ userId: 1, timestamp: -1 })

// Export for testing
if (typeof module !== "undefined") {
  module.exports = {
    // Methods are automatically available via Meteor.call
  };
}
