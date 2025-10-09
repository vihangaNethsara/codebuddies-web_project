/**
 * Authentication Bridge
 *
 * This module bridges the custom authentication system (UserManager/CustomUsers)
 * with Meteor's built-in authentication system to ensure Meteor.user() and
 * Meteor.userId() work correctly after custom login.
 */

// Client-side bridge
if (Meteor.isClient) {
  /**
   * Helper to get user ID from either Meteor or UserManager
   */
  getUserId = function() {
    return Meteor.userId() || (UserManager && UserManager.getUserId());
  };

  /**
   * Helper to get current user from either Meteor or UserManager
   */
  getCurrentUser = function() {
    return Meteor.user() || (UserManager && UserManager.currentUser());
  };

  /**
   * Helper to check if user is logged in
   */
  isUserLoggedIn = function() {
    return !!getUserId();
  };

  /**
   * Sync custom auth with Meteor's reactive user
   * This makes Meteor.userId() and Meteor.user() work with custom auth
   *
   * IMPORTANT: Limited to run only when needed to prevent infinite loops
   */
  let lastCustomUserId = null;
  let lastMeteorUserId = null;

  Tracker.autorun(function() {
    // Skip during login/logout transitions
    if (Meteor.loggingIn()) {
      return;
    }

    // Get current values
    const customUser = UserManager ? UserManager.currentUser() : null;
    const customUserId = customUser ? customUser._id : null;
    const meteorUserId = Meteor.userId();

    // Only update if values actually changed (prevents unnecessary updates)
    if (customUserId === lastCustomUserId && meteorUserId === lastMeteorUserId) {
      return;
    }

    // Update tracking variables
    lastCustomUserId = customUserId;
    lastMeteorUserId = meteorUserId;

    // If we have a custom user but no Meteor user, we need to sync
    if (customUser && !meteorUserId) {
      // Store custom user ID in a reactive var that templates can access
      Session.set("_customUserId", customUser._id);
    } else if (!customUser && !meteorUserId) {
      Session.set("_customUserId", null);
    }
  });
}

// Server-side bridge
if (Meteor.isServer) {
  /**
   * Verify session token and return user ID
   * This is used by the DDP connection method override
   */
  verifySessionToken = function(token) {
    if (!token) return null;

    const session = UserSessions.findOne({ token: token });
    if (!session) return null;

    // Check if session is expired (30 days)
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

    return session.userId;
  };

  /**
   * Override Meteor's userId() for custom auth support
   * This makes this.userId work in publications and methods with custom auth
   */
  const originalUserId = Meteor.userId;
  Meteor.userId = function() {
    // Try standard Meteor auth first
    let userId = originalUserId.call(this);
    if (userId) return userId;

    // Fall back to custom session token auth
    if (this.connection && this.connection.sessionToken) {
      return verifySessionToken(this.connection.sessionToken);
    }

    return null;
  };

  /**
   * Intercept DDP connections to extract custom session token
   * This allows publications and methods to access custom auth via this.userId
   */
  Meteor.onConnection(function(connection) {
    // Extract session token from headers or initial DDP message
    connection.sessionToken = null;

    const originalMethod = connection._send;
    connection._send = function(data) {
      // Look for session token in method calls
      if (data && data.msg === "method" && data.params) {
        const params = data.params;
        // Check if first parameter contains sessionToken
        if (params[0] && typeof params[0] === "object" && params[0].sessionToken) {
          connection.sessionToken = params[0].sessionToken;
        }
      }
      return originalMethod.call(this, data);
    };
  });

  /**
   * Server-side helper to get user from either system
   */
  getUserById = function(userId) {
    // Try Meteor.users first
    let user = Meteor.users.findOne(userId);
    if (user) return user;

    // Fall back to CustomUsers
    return CustomUsers.findOne(userId);
  };
}
