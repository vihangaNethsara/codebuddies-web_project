/**
 * Client-side Authentication Helpers
 *
 * These helpers work with both Meteor's built-in auth and the custom auth system
 * Use these instead of directly calling Meteor.user() or Meteor.userId()
 */

/**
 * Get current user ID - works with both auth systems
 * @returns {String|null}
 */
Template.registerHelper("currentUserId", function() {
  return Meteor.userId() || (UserManager && UserManager.getUserId()) || null;
});

/**
 * Get current user object - works with both auth systems
 * @returns {Object|null}
 */
Template.registerHelper("currentUser", function() {
  return Meteor.user() || (UserManager && UserManager.currentUser()) || null;
});

/**
 * Check if user is logged in - works with both auth systems
 * @returns {Boolean}
 */
Template.registerHelper("isLoggedIn", function() {
  return !!(Meteor.userId() || (UserManager && UserManager.isLoggedIn()));
});

/**
 * Get username - works with both auth systems
 * @returns {String|null}
 */
Template.registerHelper("currentUsername", function() {
  const user = Meteor.user() || (UserManager && UserManager.currentUser());
  return user ? user.username : null;
});

/**
 * Check if current user is the owner of an item
 * @param {String} ownerId - The ID of the item's owner
 * @returns {Boolean}
 */
Template.registerHelper("isOwner", function(ownerId) {
  const currentUserId = Meteor.userId() || (UserManager && UserManager.getUserId());
  return currentUserId === ownerId;
});

/**
 * Check if user has a specific role
 * @param {String|Array} role - Role(s) to check
 * @param {String} group - Role group (optional)
 * @returns {Boolean}
 */
Template.registerHelper("hasRole", function(role, group) {
  const userId = Meteor.userId() || (UserManager && UserManager.getUserId());
  if (!userId) return false;

  group = group || "CB";
  return Roles.userIsInRole(userId, role, group);
});
