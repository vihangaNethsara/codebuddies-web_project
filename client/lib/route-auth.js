// Enhanced route authentication helpers
// This file provides robust authentication and authorization checking for routes

// Check if user is authenticated (using either Meteor auth or UserManager)
const isAuthenticated = function() {
  const meteorUserId = Meteor.userId();
  const customUserId = UserManager ? UserManager.getUserId() : null;
  const isAuth = !!(meteorUserId || customUserId);

  console.log("Route auth check - Meteor User:", !!meteorUserId, "Custom User:", !!customUserId, "Result:", isAuth);
  return isAuth;
};

// Check if user has specific role
const hasRole = function(roles, scope = "CB") {
  if (!isAuthenticated()) {
    console.log("hasRole: User not authenticated");
    return false;
  }

  const userId = Meteor.userId() || (UserManager ? UserManager.getUserId() : null);

  if (!Roles || typeof Roles.userIsInRole !== "function") {
    console.error("hasRole: Roles package not available");
    return false;
  }

  const roleArray = Array.isArray(roles) ? roles : [roles];
  const hasRequiredRole = Roles.userIsInRole(userId, roleArray, scope);

  console.log(
    `Route role check - User: ${userId}, Roles: [${roleArray.join(", ")}], Scope: ${scope}, Result: ${hasRequiredRole}`
  );
  return hasRequiredRole;
};

// Authentication trigger for routes that require login
const requireAuth = function(context, redirect) {
  console.log("Checking authentication for route:", context.path);

  if (!isAuthenticated()) {
    console.log("Authentication required - redirecting to login");
    redirect("/login");
    return;
  }

  console.log("Authentication check passed");
};

// Admin role trigger for routes that require admin access
const requireAdmin = function(context, redirect) {
  console.log("Checking admin access for route:", context.path);

  if (!isAuthenticated()) {
    console.log("Admin access denied - not authenticated, redirecting to login");
    redirect("/login");
    return;
  }

  if (!hasRole(["admin", "moderator"])) {
    console.log("Admin access denied - insufficient permissions, redirecting to home");
    redirect("/");
    return;
  }

  console.log("Admin access check passed");
};

// Enhanced authentication trigger that works with both auth systems
const requireAuthEnhanced = function(context, redirect) {
  console.log("Enhanced auth check for route:", context.path);

  // Check Meteor authentication first
  if (Meteor.userId()) {
    console.log("Meteor authentication found");
    return;
  }

  // Check UserManager authentication
  if (UserManager && UserManager.isLoggedIn()) {
    console.log("UserManager authentication found");
    return;
  }

  // Check if we're in the middle of logging in
  if (Meteor.loggingIn()) {
    console.log("Login in progress, waiting...");
    return;
  }

  // Check session storage for custom auth
  const sessionToken = Session.get("userSessionToken");
  const currentUser = Session.get("currentUser");

  if (sessionToken && currentUser) {
    console.log("Session authentication found");
    return;
  }

  console.log("No authentication found - redirecting to login");
  redirect("/login");
};

// Profile ownership check
const requireProfileOwnership = function(context, redirect) {
  const routeUserId = context.params.userId;
  const currentUserId = Meteor.userId() || (UserManager ? UserManager.getUserId() : null);

  console.log("Profile ownership check - Route User:", routeUserId, "Current User:", currentUserId);

  if (!currentUserId) {
    console.log("Profile access denied - not authenticated");
    redirect("/login");
    return;
  }

  // Allow access if it's their own profile or if they're an admin
  if (currentUserId === routeUserId || hasRole(["admin", "moderator"])) {
    console.log("Profile access granted");
    return;
  }

  console.log("Profile access denied - not owner or admin");
  redirect("/");
};

// Export the functions for use in routes
window.routeAuth = {
  isAuthenticated,
  hasRole,
  requireAuth,
  requireAdmin,
  requireAuthEnhanced,
  requireProfileOwnership
};
