/**
 * ============================================
 * PREMIUM GROUP PAGE - Publications
 * ============================================
 * Reactive data subscriptions for real-time updates
 * ============================================
 */

import { Meteor } from "meteor/meteor";
import { check } from "meteor/check";

// ============================================
// PUBLICATIONS
// ============================================

/**
 * Publish single study group with all details
 */
Meteor.publish("singleStudyGroup", function(groupId) {
  check(groupId, String);

  return StudyGroups.find(
    { _id: groupId },
    {
      fields: {
        // Include all fields for the group
        title: 1,
        slug: 1,
        tagline: 1,
        description: 1,
        tags: 1,
        visibility: 1,
        archived: 1,
        createdAt: 1,
        updatedAt: 1,
        lastActivityAt: 1,
        members: 1,
        memberCount: 1,
        meetingTime: 1,
        timezone: 1,
        details: 1
      }
    }
  );
});

/**
 * Publish study group members with user details
 */
Meteor.publish("studyGroupMembers", function(groupId) {
  check(groupId, String);

  const group = StudyGroups.findOne(groupId);
  if (!group) {
    return this.ready();
  }

  // Get member IDs from group
  const memberIds = group.members ? group.members.map(m => m.id) : [];

  return Meteor.users.find(
    { _id: { $in: memberIds } },
    {
      fields: {
        username: 1,
        "profile.firstName": 1,
        "profile.lastName": 1,
        "profile.avatar": 1,
        "profile.bio": 1,
        "profile.role": 1,
        createdAt: 1
      }
    }
  );
});

/**
 * Publish group presence (online members)
 */
Meteor.publish("groupPresence", function(groupId) {
  check(groupId, String);

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
        lastSeen: 1,
        status: 1
      }
    }
  );
});

/**
 * Publish group hangouts
 */
Meteor.publish("groupHangouts", function(groupId) {
  check(groupId, String);

  return Hangouts.find(
    {
      study_group_id: groupId,
      // Show upcoming and recent hangouts (last 30 days)
      $or: [{ start: { $gte: new Date() } }, { start: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }]
    },
    {
      sort: { start: -1 },
      limit: 50
    }
  );
});

/**
 * Publish group resources
 */
Meteor.publish("groupResources", function(groupId) {
  check(groupId, String);

  return Resources.find(
    { studyGroupId: groupId },
    {
      sort: { createdAt: -1 },
      limit: 100
    }
  );
});

/**
 * Publish group activity feed
 */
Meteor.publish("groupActivity", function(groupId, limit = 20) {
  check(groupId, String);
  check(limit, Number);

  // Find activities related to this group
  return Activities.find(
    { "study_group.id": groupId },
    {
      sort: { created_at: -1 },
      limit: Math.min(limit, 50) // Max 50 activities
    }
  );
});

/**
 * Publish user's bookmark status for group
 */
Meteor.publish("groupBookmarkStatus", function(groupId) {
  check(groupId, String);

  if (!this.userId) {
    return this.ready();
  }

  // Return bookmark if exists (we'll create collection if needed)
  if (typeof StudyGroupBookmarks !== "undefined") {
    return StudyGroupBookmarks.find({
      studyGroupId: groupId,
      userId: this.userId
    });
  }

  return this.ready();
});

/**
 * Publish group discussions (if collection exists)
 */
Meteor.publish("groupDiscussions", function(groupId, limit = 10) {
  check(groupId, String);
  check(limit, Number);

  return Discussions.find(
    { studyGroupId: groupId },
    {
      sort: { createdAt: -1 },
      limit: Math.min(limit, 20)
    }
  );
});

/**
 * Publish group statistics
 */
Meteor.publish("groupStats", function(groupId) {
  check(groupId, String);

  // Return aggregated stats (you can enhance this)
  const group = StudyGroups.findOne(groupId);
  if (!group) {
    return this.ready();
  }

  // Count various metrics
  const stats = {
    _id: groupId,
    memberCount: group.members ? group.members.length : 0,
    hangoutCount: Hangouts.find({ study_group_id: groupId }).count(),
    resourceCount: Resources.find({ studyGroupId: groupId }).count(),
    activityCount: Activities.find({ "study_group.id": groupId }).count(),
    updatedAt: new Date()
  };

  // You could store this in a GroupStats collection for caching
  return this.ready();
});

/**
 * Publish member roles in group
 */
Meteor.publish("groupMemberRoles", function(groupId) {
  check(groupId, String);

  const group = StudyGroups.findOne(groupId);
  if (!group || !group.members) {
    return this.ready();
  }

  // Return user data with roles
  const memberIds = group.members.map(m => m.id);

  return Meteor.users.find(
    { _id: { $in: memberIds } },
    {
      fields: {
        username: 1,
        "profile.avatar": 1
      }
    }
  );
});

/**
 * Publish upcoming group hangouts (for sidebar widget)
 */
Meteor.publish("upcomingGroupHangouts", function(groupId, limit = 3) {
  check(groupId, String);
  check(limit, Number);

  return Hangouts.find(
    {
      study_group_id: groupId,
      start: { $gte: new Date() }
    },
    {
      sort: { start: 1 },
      limit: Math.min(limit, 5)
    }
  );
});

/**
 * Publish recent group activity (for sidebar widget)
 */
Meteor.publish("recentGroupActivity", function(groupId, limit = 5) {
  check(groupId, String);
  check(limit, Number);

  return Activities.find(
    { "study_group.id": groupId },
    {
      sort: { created_at: -1 },
      limit: Math.min(limit, 10)
    }
  );
});
