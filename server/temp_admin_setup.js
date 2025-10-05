// Temporary method to make a user admin
// This file can be deleted after use

Meteor.methods({
  makeUserAdmin: function(userId) {
    check(userId, String);

    // Find the user first
    const user = Meteor.users.findOne(userId);
    if (!user) {
      throw new Meteor.Error("user-not-found", "User not found");
    }

    // Add admin role
    Roles.addUsersToRoles(userId, ["admin"], "CB");

    console.log(`Made user ${user.username} (${userId}) an admin`);

    return {
      success: true,
      message: `Successfully made ${user.username} an admin`,
      userId: userId,
      username: user.username
    };
  },

  forceSetCustomUserAdmin: function(userId) {
    check(userId, String);

    try {
      // Server-side update to CustomUsers collection
      const result = CustomUsers.update(userId, {
        $set: {
          isAdmin: true,
          "roles.CB": ["admin"],
          adminLevel: "full",
          adminSetAt: new Date()
        }
      });

      if (result === 0) {
        throw new Meteor.Error("user-not-found", "Custom user not found");
      }

      const user = CustomUsers.findOne(userId);
      console.log(`Server: Made custom user ${user.username} (${userId}) an admin`);

      return {
        success: true,
        message: `Successfully made custom user ${user.username} an admin`,
        userId: userId,
        username: user.username,
        updatedUser: user
      };
    } catch (error) {
      console.error("Error in forceSetCustomUserAdmin:", error);
      throw error;
    }
  },

  forceSetAdmin: function(userId) {
    // This method bypasses permission checks for initial setup
    check(userId, String);

    try {
      const user = Meteor.users.findOne(userId);
      if (!user) {
        throw new Meteor.Error("user-not-found", "User not found");
      }

      // Remove all existing roles first
      Roles.setUserRoles(userId, [], "CB");

      // Add admin role
      Roles.addUsersToRoles(userId, ["admin"], "CB");

      // Also add to global roles if needed
      Roles.addUsersToRoles(userId, ["admin"]);

      console.log(`Force set user ${user.username} (${userId}) as admin`);

      return {
        success: true,
        message: `Successfully force-set ${user.username} as admin`,
        userId: userId,
        username: user.username,
        newRoles: Roles.getRolesForUser(userId, "CB")
      };
    } catch (error) {
      console.error("Error in forceSetAdmin:", error);
      throw error;
    }
  },

  makeCustomUserAdmin: function(userId) {
    check(userId, String);

    try {
      // Find user in CustomUsers collection
      const user = CustomUsers.findOne(userId);
      if (!user) {
        throw new Meteor.Error("custom-user-not-found", "Custom user not found");
      }

      // Update roles in CustomUsers collection
      CustomUsers.update(userId, {
        $set: {
          "roles.CB": ["admin"],
          isAdmin: true
        }
      });

      console.log(`Made custom user ${user.username} (${userId}) an admin`);

      return {
        success: true,
        message: `Successfully made custom user ${user.username} an admin`,
        userId: userId,
        username: user.username
      };
    } catch (error) {
      console.error("Error in makeCustomUserAdmin:", error);
      throw error;
    }
  },

  createMeteorUserFromCustomUser: function(customUserId) {
    check(customUserId, String);

    try {
      // Find user in CustomUsers collection
      const customUser = CustomUsers.findOne(customUserId);
      if (!customUser) {
        throw new Meteor.Error("custom-user-not-found", "Custom user not found");
      }

      // Check if Meteor user already exists
      const existingMeteorUser = Meteor.users.findOne({
        $or: [{ username: customUser.username }, { "emails.address": customUser.email }]
      });

      if (existingMeteorUser) {
        // User exists, just add admin role
        Roles.addUsersToRoles(existingMeteorUser._id, ["admin"], "CB");
        console.log(`Added admin role to existing Meteor user ${existingMeteorUser._id}`);
        return {
          success: true,
          meteorUserId: existingMeteorUser._id,
          message: "Added admin role to existing Meteor user"
        };
      }

      // Create new Meteor user
      const meteorUserId = Accounts.createUser({
        username: customUser.username,
        email: customUser.email,
        password: "temp123", // Temporary password
        profile: customUser.profile || {}
      });

      // Add admin role
      Roles.addUsersToRoles(meteorUserId, ["admin"], "CB");

      console.log(`Created Meteor user ${meteorUserId} from custom user ${customUserId}`);

      return {
        success: true,
        meteorUserId: meteorUserId,
        customUserId: customUserId,
        message: `Successfully created Meteor user and made admin`
      };
    } catch (error) {
      console.error("Error in createMeteorUserFromCustomUser:", error);
      throw error;
    }
  }
});
