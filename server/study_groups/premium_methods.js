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
   * Add bookmark with notification
   * @param {String} groupId - Study group ID
   */
  "groups.addBookmarkWithNotification"(groupId) {
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
      throw new Meteor.Error("already-bookmarked", "Group already bookmarked");
    }

    // Add bookmark
    StudyGroupBookmarks.insert({
      studyGroupId: groupId,
      userId: this.userId,
      createdAt: new Date()
    });

    // Create notification for group organizers
    const organizers = StudyGroupMembers.find({
      studyGroupId: groupId,
      role: { $in: ["owner", "admin"] }
    }).fetch();

    const user = Meteor.users.findOne(this.userId);
    const username = user ? user.username : "Someone";

    organizers.forEach(organizer => {
      if (typeof Notifications !== "undefined") {
        Notifications.insert({
          userId: organizer.userId,
          type: "group_bookmark",
          message: `${username} bookmarked ${group.title}`,
          groupId: groupId,
          createdAt: new Date(),
          read: false
        });
      }
    });

    // Log activity
    Meteor.call("groups.logActivity", groupId, "bookmark", {
      username: username
    });

    return true;
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
   * Check if group is bookmarked
   * @param {String} groupId - Study group ID
   */
  "groups.isBookmarked"(groupId) {
    check(groupId, String);

    if (!this.userId) {
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
    const member = StudyGroupMembers.findOne({
      studyGroupId: groupId,
      userId: this.userId
    });

    if (!member || !["owner", "admin"].includes(member.role)) {
      throw new Meteor.Error("not-authorized", "Only organizers can invite members");
    }

    // Get group details
    const group = StudyGroups.findOne(groupId);
    if (!group) {
      throw new Meteor.Error("not-found", "Study group not found");
    }

    const user = Meteor.users.findOne(this.userId);
    const inviterName = user ? user.username : "Someone";

    // Generate invite link
    const inviteLink = Meteor.absoluteUrl(`study-groups/${groupId}`);

    // Send emails
    const successCount = 0;
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
// PUBLICATIONS
// ============================================

if (Meteor.isServer) {
  /**
   * Publish group presence data
   */
  Meteor.publish("groupPresence", function(groupId) {
    check(groupId, String);

    if (!this.userId) {
      return this.ready();
    }

    // Only show presence from last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    return AppStats.find(
      {
        studyGroupId: groupId,
        isOnline: true,
        lastSeen: { $gte: twoMinutesAgo }
      },
      {
        fields: {
          userId: 1,
          studyGroupId: 1,
          isOnline: 1,
          status: 1,
          lastSeen: 1
        }
      }
    );
  });

  /**
   * Publish group activity feed
   */
  Meteor.publish("groupActivity", function(groupId, limit = 20) {
    check(groupId, String);
    check(limit, Number);

    if (typeof GroupActivities === "undefined") {
      return this.ready();
    }

    return GroupActivities.find(
      { studyGroupId: groupId },
      {
        sort: { timestamp: -1 },
        limit: Math.min(limit, 100) // Cap at 100
      }
    );
  });

  /**
   * Publish group statistics
   */
  Meteor.publish("groupStats", function(groupId) {
    check(groupId, String);

    if (!this.userId) {
      return this.ready();
    }

    // Return aggregated stats
    // This is a simplified version - you may want to use aggregation pipeline
    return StudyGroups.find(groupId, {
      fields: {
        _id: 1,
        title: 1,
        memberCount: 1,
        hangoutCount: 1,
        resourceCount: 1,
        activityCount: 1,
        lastActivityAt: 1
      }
    });
  });

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
