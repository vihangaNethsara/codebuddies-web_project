// Authentication testing and debugging helpers
// This file provides utilities to test and debug authentication issues

// Helper to test authentication status in browser console
window.authDebug = {
  // Test all authentication methods
  checkAuth: function() {
    console.log("=== Authentication Status Debug ===");
    console.log("1. Meteor.userId():", Meteor.userId());
    console.log("2. Meteor.user():", Meteor.user());
    console.log("3. Meteor.loggingIn():", Meteor.loggingIn());
    console.log("4. UserManager.isLoggedIn():", UserManager ? UserManager.isLoggedIn() : "N/A");
    console.log("5. UserManager.currentUser():", UserManager ? UserManager.currentUser() : "N/A");
    console.log("6. UserManager.getUserId():", UserManager ? UserManager.getUserId() : "N/A");
    console.log("7. Session currentUser:", Session.get("currentUser"));
    console.log("8. Session userSessionToken:", Session.get("userSessionToken"));
    console.log("9. localStorage session:", localStorage.getItem("codebuddies_session"));
    console.log("===================================");
  },

  // Test role checking
  checkRoles: function(userId = null) {
    const testUserId = userId || Meteor.userId() || (UserManager ? UserManager.getUserId() : null);

    if (!testUserId) {
      console.log("No user ID available for role checking");
      return;
    }

    console.log("=== Role Status Debug ===");
    console.log("User ID:", testUserId);

    if (Roles && typeof Roles.userIsInRole === "function") {
      console.log("Roles package available: YES");
      console.log("User roles in CB scope:", Roles.getRolesForUser(testUserId, "CB"));
      console.log("Is admin?", Roles.userIsInRole(testUserId, ["admin"], "CB"));
      console.log("Is moderator?", Roles.userIsInRole(testUserId, ["moderator"], "CB"));
      console.log("Is admin or moderator?", Roles.userIsInRole(testUserId, ["admin", "moderator"], "CB"));
    } else {
      console.log("Roles package available: NO");
    }
    console.log("========================");
  },

  // Test route access
  testRouteAccess: function() {
    console.log("=== Route Access Test ===");
    const routes = ["/profile/", "/admin", "/admin/dashboard", "/notifications", "/my-study-groups"];

    routes.forEach(route => {
      console.log(`Testing access to ${route}:`);
      if (route.startsWith("/admin")) {
        const hasAdminAccess = this.hasAdminAccess();
        console.log(`  Admin route - Access: ${hasAdminAccess ? "GRANTED" : "DENIED"}`);
      } else {
        const isAuth = this.isAuthenticated();
        console.log(`  Protected route - Access: ${isAuth ? "GRANTED" : "DENIED"}`);
      }
    });
    console.log("========================");
  },

  // Check if user is authenticated
  isAuthenticated: function() {
    const meteorUserId = Meteor.userId();
    const customUserId = UserManager ? UserManager.getUserId() : null;
    return !!(meteorUserId || customUserId);
  },

  // Check if user has admin access
  hasAdminAccess: function() {
    if (!this.isAuthenticated()) return false;

    const userId = Meteor.userId() || (UserManager ? UserManager.getUserId() : null);
    if (!Roles || !Roles.userIsInRole) return false;

    return Roles.userIsInRole(userId, ["admin", "moderator"], "CB");
  },

  // Create test admin user
  createTestAdmin: function() {
    if (!Meteor.isClient) {
      console.log("This function should be run in browser console");
      return;
    }

    console.log("Creating test admin user...");
    Meteor.call("createTestAdminUser", function(error, result) {
      if (error) {
        console.error("Failed to create test admin:", error);
      } else {
        console.log("Test admin created successfully:", result);
        console.log("You can now login with:");
        console.log("Email: admin@test.com");
        console.log("Password: admin123");
      }
    });
  },

  // Test login functionality
  testLogin: function(email = "admin@test.com", password = "admin123") {
    console.log("Testing login functionality...");

    if (UserManager && typeof UserManager.login === "function") {
      console.log("Testing UserManager login...");
      UserManager.login(email, password, function(error, user) {
        if (error) {
          console.error("UserManager login failed:", error);
        } else {
          console.log("UserManager login successful:", user);
          authDebug.checkAuth();
        }
      });
    } else {
      console.log("Testing Meteor login...");
      Meteor.loginWithPassword(email, password, function(error) {
        if (error) {
          console.error("Meteor login failed:", error);
        } else {
          console.log("Meteor login successful");
          authDebug.checkAuth();
        }
      });
    }
  },

  // Clear all authentication data
  clearAuth: function() {
    console.log("Clearing all authentication data...");
    Meteor.logout();
    if (UserManager && typeof UserManager.logout === "function") {
      UserManager.logout();
    }
    Session.set("currentUser", null);
    Session.set("userSessionToken", null);
    localStorage.removeItem("codebuddies_session");
    console.log("Authentication data cleared");
  }
};

// Auto-run basic checks when the file loads
Meteor.startup(function() {
  if (Meteor.isClient) {
    console.log("Authentication debug helpers loaded. Use authDebug.checkAuth() to test.");
  }
});
