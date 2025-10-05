import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { Roles } from "meteor/alanning:roles";
import { check } from "meteor/check";

Meteor.methods({
  createTestAdminUser() {
    // Only allow this in development
    if (!Meteor.settings.public.isModeDebug && process.env.NODE_ENV === "production") {
      throw new Meteor.Error("not-allowed", "Test admin creation only allowed in development");
    }

    console.log("Creating test admin user...");

    // Check if admin already exists
    const existingAdmin = Meteor.users.findOne({
      $or: [{ "emails.address": "admin@test.com" }, { username: "testadmin" }]
    });

    if (existingAdmin) {
      console.log("Test admin already exists:", existingAdmin._id);
      return {
        userId: existingAdmin._id,
        message: "Test admin already exists"
      };
    }

    // Create the test admin user
    const userId = Accounts.createUser({
      username: "testadmin",
      email: "admin@test.com",
      password: "admin123",
      profile: {
        name: "Test Admin",
        memberSince: new Date(),
        completed: true
      }
    });

    if (userId) {
      // Add admin role
      Roles.addUsersToRoles(userId, ["admin"], "CB");

      console.log("Test admin created successfully:", userId);

      return {
        userId: userId,
        message: "Test admin created successfully",
        credentials: {
          email: "admin@test.com",
          username: "testadmin",
          password: "admin123"
        }
      };
    } else {
      throw new Meteor.Error("creation-failed", "Failed to create test admin user");
    }
  },

  // Method to check a user's authentication status and roles
  getUserAuthStatus(userId) {
    check(userId, String);

    const user = Meteor.users.findOne(userId);
    if (!user) {
      throw new Meteor.Error("user-not-found", "User not found");
    }

    const roles = Roles.getRolesForUser(userId, "CB");

    return {
      userId: userId,
      username: user.username,
      email: user.emails && user.emails[0] && user.emails[0].address,
      roles: roles,
      isAdmin: Roles.userIsInRole(userId, ["admin"], "CB"),
      isModerator: Roles.userIsInRole(userId, ["moderator"], "CB"),
      canAccessAdmin: Roles.userIsInRole(userId, ["admin", "moderator"], "CB"),
      profile: user.profile,
      createdAt: user.createdAt
    };
  }
});
