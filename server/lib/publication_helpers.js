/**
 * Publication Helpers
 *
 * Utilities to help publications work with both Meteor's auth and custom auth
 */

/**
 * Get the user ID in a publication context, supporting both auth systems
 * @returns {String|null} User ID from Meteor auth or custom auth
 */
getPublicationUserId = function() {
  // Try Meteor's built-in userId first
  if (this.userId) {
    return this.userId;
  }

  // Check if we have a custom session token in the connection
  if (this.connection && this.connection.sessionToken) {
    const session = UserSessions.findOne({ token: this.connection.sessionToken });
    if (session) {
      // Check if session is valid (not expired)
      const thirtyDaysAgo = moment()
        .subtract(30, "days")
        .toDate();
      if (session.lastUsed >= thirtyDaysAgo) {
        // Find linked Meteor user
        const customUser = CustomUsers.findOne(session.userId);
        if (customUser) {
          const meteorUser = Meteor.users.findOne({ "profile.customUserId": customUser._id });
          if (meteorUser) {
            return meteorUser._id;
          }
          // Return custom user ID as fallback
          return customUser._id;
        }
      }
    }
  }

  return null;
};

/**
 * Get the user object in a publication context
 * @returns {Object|null} User object
 */
getPublicationUser = function() {
  const userId = getPublicationUserId.call(this);
  if (!userId) return null;

  // Try Meteor.users first
  let user = Meteor.users.findOne(userId);
  if (user) return user;

  // Fall back to CustomUsers
  return CustomUsers.findOne(userId);
};

/**
 * Check if publication user has role
 * @param {Array|String} roles - Role(s) to check
 * @param {String} group - Role group (default: 'CB')
 * @returns {Boolean}
 */
publicationUserHasRole = function(roles, group = "CB") {
  const userId = getPublicationUserId.call(this);
  if (!userId) return false;

  return Roles.userIsInRole(userId, roles, group);
};
