// Enhanced authentication helpers with proper error handling and logging
// This file provides unified authentication checking across the app

// Global authentication helpers
Template.registerHelper("isAuthenticated", function() {
  const meteorUser = Meteor.user();
  const customUser = UserManager ? UserManager.currentUser() : null;

  console.log("Auth Check - Meteor User:", !!meteorUser, "Custom User:", !!customUser);

  return !!(meteorUser || customUser);
});

Template.registerHelper("getCurrentUser", function() {
  // Try Meteor's built-in user first, then fallback to custom
  const meteorUser = Meteor.user();
  if (meteorUser) {
    console.log("Using Meteor user:", meteorUser._id);
    return meteorUser;
  }

  const customUser = UserManager ? UserManager.currentUser() : null;
  if (customUser) {
    console.log("Using custom user:", customUser._id);
    return customUser;
  }

  console.log("No authenticated user found");
  return null;
});

Template.registerHelper("getCurrentUserId", function() {
  // Try Meteor's built-in user ID first
  const meteorUserId = Meteor.userId();
  if (meteorUserId) {
    console.log("Using Meteor userId:", meteorUserId);
    return meteorUserId;
  }

  // Fallback to custom user manager
  const customUserId = UserManager ? UserManager.getUserId() : null;
  if (customUserId) {
    console.log("Using custom userId:", customUserId);
    return customUserId;
  }

  console.log("No user ID found");
  return null;
});

Template.registerHelper("hasRole", function(role, scope = "CB") {
  const userId =
    (Template.instance().data && Template.instance().data.userId) ||
    Meteor.userId() ||
    (UserManager ? UserManager.getUserId() : null);

  if (!userId) {
    console.log("hasRole: No user ID available");
    return false;
  }

  if (!Roles || typeof Roles.userIsInRole !== "function") {
    console.log("hasRole: Roles package not available");
    return false;
  }

  const hasRole = Roles.userIsInRole(userId, [role], scope);
  console.log(`hasRole: User ${userId} has role '${role}' in scope '${scope}':`, hasRole);

  return hasRole;
});

Template.registerHelper("hasAnyRole", function(roles, scope = "CB") {
  const userId =
    (Template.instance().data && Template.instance().data.userId) ||
    Meteor.userId() ||
    (UserManager ? UserManager.getUserId() : null);

  if (!userId) {
    console.log("hasAnyRole: No user ID available");
    return false;
  }

  if (!Roles || typeof Roles.userIsInRole !== "function") {
    console.log("hasAnyRole: Roles package not available");
    return false;
  }

  const roleArray = Array.isArray(roles) ? roles : [roles];
  const hasAnyRole = Roles.userIsInRole(userId, roleArray, scope);
  console.log(`hasAnyRole: User ${userId} has any of roles [${roleArray.join(", ")}] in scope '${scope}':`, hasAnyRole);

  return hasAnyRole;
});

Template.registerHelper("isAdmin", function() {
  return Template.instance().view.templateContentBlock.helpers.hasAnyRole.call(this, ["admin"], "CB");
});

Template.registerHelper("isModerator", function() {
  return Template.instance().view.templateContentBlock.helpers.hasAnyRole.call(this, ["admin", "moderator"], "CB");
});

Template.registerHelper("canAccessAdmin", function() {
  const userId = Meteor.userId() || (UserManager ? UserManager.getUserId() : null);

  if (!userId) {
    console.log("canAccessAdmin: No authenticated user");
    return false;
  }

  if (!Roles || typeof Roles.userIsInRole !== "function") {
    console.log("canAccessAdmin: Roles package not available");
    return false;
  }

  const canAccess = Roles.userIsInRole(userId, ["admin", "moderator"], "CB");
  console.log(`canAccessAdmin: User ${userId} can access admin:`, canAccess);

  return canAccess;
});

// Enhanced logging for debugging auth issues
Template.registerHelper("debugAuth", function() {
  if (Meteor.settings.public.isModeDebug) {
    console.log("=== Auth Debug Info ===");
    console.log("Meteor.userId():", Meteor.userId());
    console.log("Meteor.user():", Meteor.user());
    console.log("UserManager.isLoggedIn():", UserManager ? UserManager.isLoggedIn() : "N/A");
    console.log("UserManager.currentUser():", UserManager ? UserManager.currentUser() : "N/A");
    console.log("Session currentUser:", Session.get("currentUser"));
    console.log("=======================");
  }
  return "";
});
