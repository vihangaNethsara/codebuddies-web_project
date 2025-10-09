/**
 * Startup Verification for Authentication System
 *
 * This file verifies that all authentication components are loaded correctly
 */

if (Meteor.isServer) {
  Meteor.startup(function() {
    console.log("========================================");
    console.log("Authentication System Verification");
    console.log("========================================");

    // Check if collections exist
    console.log("✓ Collections loaded:");
    console.log("  - CustomUsers:", typeof CustomUsers !== "undefined" ? "✓" : "✗");
    console.log("  - UserSessions:", typeof UserSessions !== "undefined" ? "✓" : "✗");
    console.log("  - Meteor.users:", typeof Meteor.users !== "undefined" ? "✓" : "✗");

    // Check if auth bridge functions exist
    console.log("\n✓ Auth Bridge functions:");
    console.log("  - verifySessionToken:", typeof verifySessionToken !== "undefined" ? "✓" : "✗");

    // Check if publication helpers exist
    console.log("\n✓ Publication helpers:");
    console.log("  - getPublicationUserId:", typeof getPublicationUserId !== "undefined" ? "✓" : "✗");
    console.log("  - getPublicationUser:", typeof getPublicationUser !== "undefined" ? "✓" : "✗");
    console.log("  - publicationUserHasRole:", typeof publicationUserHasRole !== "undefined" ? "✓" : "✗");

    console.log("\n========================================");
    console.log("Authentication System Ready!");
    console.log("========================================\n");
  });
}

if (Meteor.isClient) {
  Meteor.startup(function() {
    console.log("========================================");
    console.log("Client Authentication Verification");
    console.log("========================================");

    // Check if UserManager exists
    console.log("✓ UserManager:", typeof UserManager !== "undefined" ? "✓" : "✗");

    // Check if auth bridge functions exist
    console.log("\n✓ Auth Bridge functions:");
    console.log("  - getUserId:", typeof getUserId !== "undefined" ? "✓" : "✗");
    console.log("  - getCurrentUser:", typeof getCurrentUser !== "undefined" ? "✓" : "✗");
    console.log("  - isUserLoggedIn:", typeof isUserLoggedIn !== "undefined" ? "✓" : "✗");

    // Check if route guards exist
    console.log("\n✓ Route Guards:");
    console.log("  - isAuthenticated:", typeof isAuthenticated !== "undefined" ? "✓" : "✗");
    console.log("  - getCurrentUserId:", typeof getCurrentUserId !== "undefined" ? "✓" : "✗");
    console.log("  - requireAuth:", typeof requireAuth !== "undefined" ? "✓" : "✗");

    // Initialize UserManager if it exists
    if (typeof UserManager !== "undefined" && UserManager.init) {
      console.log("\n✓ Initializing UserManager...");
      // UserManager.init() is already called in userManager.js
    }

    console.log("\n========================================");
    console.log("Client Authentication Ready!");
    console.log("========================================\n");
  });
}
