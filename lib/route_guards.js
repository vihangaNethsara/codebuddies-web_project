/**
 * Route Guards for Authentication
 *
 * Utilities for protecting routes and redirecting unauthenticated users
 */

/**
 * Check if user is authenticated (works with both Meteor and custom auth)
 * @returns {Boolean}
 */
isAuthenticated = function() {
  // Check Meteor auth first
  if (Meteor.userId()) {
    return true;
  }

  // Check custom auth via UserManager
  if (typeof UserManager !== "undefined" && UserManager.isLoggedIn()) {
    return true;
  }

  // Check session storage for custom auth (fallback)
  if (typeof Session !== "undefined") {
    const sessionToken = Session.get("userSessionToken");
    const currentUser = Session.get("currentUser");
    if (sessionToken && currentUser) {
      return true;
    }
  }

  return false;
};

/**
 * Check if authentication is in progress
 * @returns {Boolean}
 */
isAuthenticating = function() {
  // Check if Meteor is logging in
  if (Meteor.loggingIn()) {
    return true;
  }

  // Check if we have session data but Meteor.userId() is not ready yet
  if (typeof Session !== "undefined") {
    const sessionToken = Session.get("userSessionToken");
    const currentUser = Session.get("currentUser");
    if (sessionToken && currentUser && !Meteor.userId()) {
      return true; // Custom auth ready but Meteor auth syncing
    }
  }

  return false;
};

/**
 * Get current user ID from either auth system
 * @returns {String|null}
 */
getCurrentUserId = function() {
  return Meteor.userId() || (UserManager && UserManager.getUserId()) || null;
};

/**
 * Get current user object from either auth system
 * @returns {Object|null}
 */
getCurrentUserObject = function() {
  return Meteor.user() || (UserManager && UserManager.currentUser()) || null;
};

/**
 * Route guard: Require authentication
 * Redirect to login page if not authenticated
 * Brief wait during authentication to allow it to complete
 */
requireAuth = function(context, redirect) {
  // Check if authentication is in progress
  if (isAuthenticating()) {
    console.log("Authentication in progress, waiting briefly...");

    // Wait a short moment for auth to complete
    // This is better than blocking the route entirely
    Meteor.setTimeout(function() {
      if (!isAuthenticated()) {
        console.log("Auth required after wait - redirecting to login");
        redirect("/login");
      }
    }, 100);

    return; // Allow a brief moment for auth to stabilize
  }

  // Only redirect if definitely not authenticated
  if (!isAuthenticated()) {
    console.log("Auth required - redirecting to login");
    redirect("/login");
  }
};

/**
 * Route guard: Require authentication for specific user profile
 * Ensures user can only access their own profile or redirects to login
 */
requireAuthForProfile = function(context, redirect) {
  // Don't redirect if login is in progress
  if (isAuthenticating()) {
    console.log("Authentication in progress for profile, waiting...");
    return;
  }

  const currentUserId = getCurrentUserId();
  const profileUserId = context.params.userId;

  if (!currentUserId) {
    console.log("Profile access denied - not authenticated");
    redirect("/login");
    return;
  }

  // Allow admins to view any profile
  const user = getCurrentUserObject();
  if (user && user.roles && user.roles.CB && user.roles.CB.includes("admin")) {
    return;
  }

  // Regular users can only view their own profile
  if (currentUserId !== profileUserId) {
    console.log("Profile access denied - not your profile");
    redirect("/");
  }
};

/**
 * Route guard: Redirect to home if already authenticated
 * Used for login/register pages
 */
redirectIfAuth = function(context, redirect) {
  if (isAuthenticated()) {
    console.log("Already authenticated - redirecting to home");
    redirect("/");
  }
};
