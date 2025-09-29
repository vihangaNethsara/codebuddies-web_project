"use strict";

Template.hasPermission.helpers({
  target: function() {
    var loggedInUserId = Meteor.userId();

    if (!loggedInUserId) {
      return "unauthorised";
    }

    if (!Roles || typeof Roles.userIsInRole !== "function") {
      return "unauthorised";
    }

    if (!Roles.userIsInRole(loggedInUserId, ["admin", "moderator"], "CB")) {
      return "unauthorised";
    }

    return this.targetTemplate || "unauthorised";
  }
});
