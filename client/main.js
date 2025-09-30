// Import the new userProfile
import "../imports/ui/userProfile";

Meteor.startup(function() {
  // Subscribe to user roles
  Meteor.subscribe("userRoles");

  // Subscribe to admin data if user is admin
  Tracker.autorun(function() {
    if (Roles.userIsInRole(Meteor.userId(), ["admin"], "CB")) {
      Meteor.subscribe("allUsersWithRoles");
    }
  });
});
