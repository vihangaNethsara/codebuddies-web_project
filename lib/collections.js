Learnings = new Mongo.Collection("learnings");
Hangouts = new Mongo.Collection("hangouts");
Notifications = new Mongo.Collection("notifications");
RSVPnotifications = new Mongo.Collection("rsvp-notifications");
Comments = new Mongo.Collection("comments");
ArchivedUsers = new Mongo.Collection("archived-users");
StudyGroups = new Mongo.Collection("study_groups");
Resources = new Mongo.Collection("resources");
Activities = new Mongo.Collection("activities");
Availabilities = new Mongo.Collection("availabilities");
AppStats = new Mongo.Collection("app_stats");
Discussions = new Mongo.Collection("discussions");
DiscussionResponses = new Mongo.Collection("discussion_responses");
Conversations = new Mongo.Collection("conversations");
Messages = new Mongo.Collection("messages");

CustomUsers = new Mongo.Collection("custom_users");
UserSessions = new Mongo.Collection("user_sessions");

// Premium Group Page Collection
StudyGroupBookmarks = new Mongo.Collection("study_group_bookmarks");

// Add these after your existing collections
if (Meteor.isServer) {
  // Publications for user data
  Meteor.publish("currentUserData", function() {
    if (this.userId) {
      return [CustomUsers.find({ _id: this.userId }), UserSessions.find({ userId: this.userId })];
    }
    return this.ready();
  });

  Meteor.publish("userProfiles", function() {
    return CustomUsers.find(
      { isActive: true },
      {
        fields: {
          "profile.firstName": 1,
          "profile.lastName": 1,
          "profile.displayName": 1,
          "profile.programmingLevel": 1,
          "profile.interests": 1,
          "profile.joinDate": 1,
          username: 1,
          isActive: 1,
          "profile.avatar": 1
        }
      }
    );
  });

  // Server-side methods for user management
  Meteor.methods({
    "customUsers.register": function(userData) {
      check(userData, {
        username: String,
        email: String,
        password: String,
        firstName: String,
        lastName: String,
        programmingLevel: String,
        interests: String,
        timezone: String
      });

      // Validation
      if (userData.username.length < 3) {
        throw new Meteor.Error("invalid-username", "Username must be at least 3 characters long");
      }

      if (userData.password.length < 6) {
        throw new Meteor.Error("invalid-password", "Password must be at least 6 characters long");
      }

      // Check if user already exists
      const existingUser = CustomUsers.findOne({
        $or: [{ email: userData.email.toLowerCase() }, { username: userData.username.toLowerCase() }]
      });

      if (existingUser) {
        if (existingUser.email === userData.email.toLowerCase()) {
          throw new Meteor.Error("email-exists", "An account with this email already exists");
        } else {
          throw new Meteor.Error("username-exists", "This username is already taken");
        }
      }

      // Hash password using Node.js crypto
      const crypto = Npm.require("crypto");
      const salt = crypto.randomBytes(16).toString("hex");
      const hashedPassword = crypto.pbkdf2Sync(userData.password, salt, 10000, 64, "sha512").toString("hex");

      // Create user object with CodeBuddies-specific fields
      const userId = CustomUsers.insert({
        username: userData.username.toLowerCase(),
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        salt: salt,
        profile: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          displayName: userData.firstName + " " + userData.lastName,
          programmingLevel: userData.programmingLevel,
          interests: userData.interests
            .split(",")
            .map(i => i.trim())
            .filter(i => i !== ""),
          timezone: userData.timezone,
          joinDate: new Date(),
          emailVerified: false,
          isNewUser: true,
          loginCount: 0,
          lastLoginAt: null,
          avatar: null,
          bio: "",
          location: "",
          github: "",
          website: "",
          twitter: ""
        },
        isActive: true,
        createdAt: new Date(),
        // CodeBuddies specific fields
        totalHangoutsJoined: 0,
        totalHangoutsOrganized: 0,
        totalStudyGroupsJoined: 0,
        reputation: 0,
        badges: [],
        preferences: {
          emailNotifications: true,
          hangoutReminders: true,
          studyGroupUpdates: true
        },
        roles: { CB: ["user"] }
      });

      // Log activity
      if (Activities) {
        Activities.insert({
          userId: userId,
          type: "user_registered",
          data: {
            username: userData.username,
            programmingLevel: userData.programmingLevel
          },
          createdAt: new Date()
        });
      }

      // Update app stats
      if (AppStats) {
        const today = moment().format("YYYY-MM-DD");
        AppStats.upsert(
          { date: today },
          {
            $inc: {
              "stats.newUsers": 1,
              "stats.totalUsers": 1
            },
            $set: { date: today }
          }
        );
      }

      return userId;
    },

    "customUsers.login": function(loginData) {
      check(loginData, {
        usernameOrEmail: String,
        password: String
      });

      // Find user by username or email
      const user = CustomUsers.findOne({
        $or: [
          { email: loginData.usernameOrEmail.toLowerCase() },
          { username: loginData.usernameOrEmail.toLowerCase() }
        ],
        isActive: true
      });

      if (!user) {
        throw new Meteor.Error("invalid-credentials", "Invalid username/email or password");
      }

      // Verify password
      const crypto = Npm.require("crypto");
      const hashedPassword = crypto.pbkdf2Sync(loginData.password, user.salt, 10000, 64, "sha512").toString("hex");

      if (hashedPassword !== user.password) {
        throw new Meteor.Error("invalid-credentials", "Invalid username/email or password");
      }

      // Create session
      const sessionToken = crypto.randomBytes(32).toString("hex");
      const sessionId = UserSessions.insert({
        userId: user._id,
        token: sessionToken,
        createdAt: new Date(),
        lastUsed: new Date(),
        userAgent: this.connection.httpHeaders["user-agent"] || "Unknown",
        ipAddress: this.connection.clientAddress || "Unknown",
        roles: user.roles // Store roles in session
      });

      // Update user login info
      CustomUsers.update(user._id, {
        $set: {
          "profile.lastLoginAt": new Date(),
          "profile.isNewUser": false
        },
        $inc: {
          "profile.loginCount": 1
        }
      });

      // Log activity
      if (Activities) {
        Activities.insert({
          userId: user._id,
          type: "user_login",
          data: {
            username: user.username,
            loginCount: user.profile.loginCount + 1
          },
          createdAt: new Date()
        });
      }

      return {
        userId: user._id,
        sessionToken: sessionToken,
        user: user
      };
    },

    "customUsers.logout": function(sessionToken) {
      check(sessionToken, String);

      const session = UserSessions.findOne({ token: sessionToken });
      if (session) {
        // Log activity
        if (Activities) {
          Activities.insert({
            userId: session.userId,
            type: "user_logout",
            data: {},
            createdAt: new Date()
          });
        }

        // Remove session
        UserSessions.remove({ token: sessionToken });
      }

      return true;
    },

    "customUsers.getCurrentUser": function(sessionToken) {
      check(sessionToken, String);

      const session = UserSessions.findOne({ token: sessionToken });
      if (!session) {
        return null;
      }

      // Check if session is expired (optional - 30 days)
      const thirtyDaysAgo = moment()
        .subtract(30, "days")
        .toDate();
      if (session.lastUsed < thirtyDaysAgo) {
        UserSessions.remove(session._id);
        return null;
      }

      // Update session last used
      UserSessions.update(session._id, {
        $set: { lastUsed: new Date() }
      });

      const user = CustomUsers.findOne(session.userId);
      return user;
    },

    "customUsers.updateProfile": function(userId, profileData) {
      check(userId, String);
      check(profileData, {
        firstName: Match.Optional(String),
        lastName: Match.Optional(String),
        bio: Match.Optional(String),
        location: Match.Optional(String),
        github: Match.Optional(String),
        website: Match.Optional(String),
        twitter: Match.Optional(String),
        interests: Match.Optional([String]),
        timezone: Match.Optional(String)
      });

      const user = CustomUsers.findOne(userId);
      if (!user) {
        throw new Meteor.Error("user-not-found", "User not found");
      }

      const updateData = {};
      Object.keys(profileData).forEach(key => {
        if (profileData[key] !== undefined) {
          updateData[`profile.${key}`] = profileData[key];
        }
      });

      if (profileData.firstName || profileData.lastName) {
        const firstName = profileData.firstName || user.profile.firstName;
        const lastName = profileData.lastName || user.profile.lastName;
        updateData["profile.displayName"] = firstName + " " + lastName;
      }

      CustomUsers.update(userId, { $set: updateData });

      // Log activity
      if (Activities) {
        Activities.insert({
          userId: userId,
          type: "profile_updated",
          data: { updatedFields: Object.keys(profileData) },
          createdAt: new Date()
        });
      }

      return true;
    },

    "problemReports.insert": function(reportData) {
      check(reportData, {
        problemType: String,
        problemDescription: String,
        systemInfo: Match.Optional(String),
        priority: String,
        attachedFiles: Match.Optional([
          {
            name: String,
            size: String,
            type: String
          }
        ])
      });

      // Manual validation
      const validTypes = ["technical", "account", "payment", "bug", "feature", "login", "hangout", "other"];
      if (!validTypes.includes(reportData.problemType)) {
        throw new Meteor.Error("invalid-problem-type", "Invalid problem type selected");
      }

      const validPriorities = ["low", "medium", "high", "urgent"];
      if (!validPriorities.includes(reportData.priority)) {
        throw new Meteor.Error("invalid-priority", "Invalid priority level selected");
      }

      if (!reportData.problemDescription || reportData.problemDescription.trim().length < 10) {
        throw new Meteor.Error("description-too-short", "Problem description must be at least 10 characters");
      }

      if (reportData.problemDescription.length > 2000) {
        throw new Meteor.Error("description-too-long", "Problem description must be less than 2000 characters");
      }

      if (reportData.systemInfo && reportData.systemInfo.length > 500) {
        throw new Meteor.Error("system-info-too-long", "System information must be less than 500 characters");
      }

      try {
        const reportId = ProblemReports.insert({
          userId: this.userId || null,
          problemType: reportData.problemType,
          problemDescription: reportData.problemDescription.trim(),
          systemInfo: reportData.systemInfo || null,
          priority: reportData.priority,
          attachedFiles: reportData.attachedFiles || [],
          status: "open",
          createdAt: new Date(),
          updatedAt: null,
          adminNotes: null
        });

        // Send notification email to admins (optional)
        if (Meteor.isServer) {
          Meteor.call("sendAdminNotification", reportId);
        }

        return {
          success: true,
          reportId: reportId,
          message: "Problem report submitted successfully!"
        };
      } catch (error) {
        console.error("Error inserting problem report:", error);
        throw new Meteor.Error("insert-failed", "Failed to submit problem report. Please try again.");
      }
    },

    "problemReports.updateStatus": function(reportId, status) {
      check(reportId, String);
      check(status, String);

      if (!this.userId || !Roles.userIsInRole(this.userId, ["admin", "moderator"], "CB")) {
        throw new Meteor.Error("access-denied", "You do not have permission to update problem reports");
      }

      const validStatuses = ["open", "in-progress", "resolved", "closed"];
      if (!validStatuses.includes(status)) {
        throw new Meteor.Error("invalid-status", "Invalid status provided");
      }

      return ProblemReports.update(reportId, {
        $set: {
          status: status,
          updatedAt: new Date()
        }
      });
    },

    sendAdminNotification: function(reportId) {
      if (!Meteor.isServer) return;

      const report = ProblemReports.findOne(reportId);
      if (!report) return;

      // Add your email notification logic here
      console.log(`New problem report submitted: ${reportId} - Priority: ${report.priority}`);
    }
  });

  // Clean up old sessions periodically
  Meteor.setInterval(function() {
    const thirtyDaysAgo = moment()
      .subtract(30, "days")
      .toDate();
    UserSessions.remove({ lastUsed: { $lt: thirtyDaysAgo } });
  }, 24 * 60 * 60 * 1000); // Run daily
}

if (Meteor.isClient) {
  Meteor.subscribe("userProfiles");
}

// Problem Reports Collection
ProblemReports = new Mongo.Collection("problemReports");

ProblemReports.allow({
  insert: function(userId, doc) {
    return !!userId; // Only logged in users can insert
  },
  update: function(userId, doc, fields, modifier) {
    return Roles.userIsInRole(userId, ["admin", "moderator"], "CB");
  },
  remove: function(userId, doc) {
    return Roles.userIsInRole(userId, ["admin"], "CB");
  }
});
