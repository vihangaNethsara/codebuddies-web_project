// Import the new userProfile
import "../imports/ui/userProfile";

Meteor.startup(function() {
  // Subscribe to user roles - wait for auth to be ready
  Tracker.autorun(function() {
    // CRITICAL FIX: Skip while logging in to prevent reactive loops
    if (Meteor.loggingIn()) {
      return;
    }

    const userId = Meteor.userId();
    if (userId) {
      Meteor.subscribe("userRoles");
    }
  });

  // Subscribe to admin data if user is admin
  Tracker.autorun(function() {
    // CRITICAL FIX: Skip while logging in to prevent reactive loops
    if (Meteor.loggingIn()) {
      return;
    }

    if (Roles.userIsInRole(Meteor.userId(), ["admin"], "CB")) {
      Meteor.subscribe("allUsersWithRoles");
    }
  });
});
