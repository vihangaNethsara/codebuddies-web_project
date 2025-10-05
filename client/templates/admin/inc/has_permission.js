"use strict";

Template.hasPermission.helpers({
  target: function() {
    // Enhanced permission checking with better logging
    const meteorUserId = Meteor.userId();
    const customUserId = UserManager ? UserManager.getUserId() : null;
    const loggedInUserId = meteorUserId || customUserId;

    console.log("hasPermission: Checking permissions for user:", loggedInUserId);

    if (!loggedInUserId) {
      console.log("hasPermission: No authenticated user found - showing unauthorised");
      return "unauthorised";
    }

    if (!Roles || typeof Roles.userIsInRole !== "function") {
      console.error("hasPermission: Roles package not available - showing unauthorised");
      return "unauthorised";
    }

    const hasPermission = Roles.userIsInRole(loggedInUserId, ["admin", "moderator"], "CB");
    console.log(`hasPermission: User ${loggedInUserId} has admin/moderator role:`, hasPermission);

    if (!hasPermission) {
      console.log("hasPermission: User lacks required permissions - showing unauthorised");
      return "unauthorised";
    }

    const targetTemplate = this.targetTemplate || "unauthorised";
    console.log("hasPermission: Allowing access to template:", targetTemplate);
    return targetTemplate;
  }
});
