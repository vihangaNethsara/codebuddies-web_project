// Publish problem reports for admins/moderators
Meteor.publish("problemReports", function() {
  if (!this.userId) {
    return this.ready();
  }

  if (Roles.userIsInRole(this.userId, ["admin", "moderator"], "CB")) {
    return ProblemReports.find(
      {},
      {
        sort: { createdAt: -1 }
      }
    );
  } else {
    // Regular users can only see their own reports
    return ProblemReports.find(
      { userId: this.userId },
      {
        sort: { createdAt: -1 }
      }
    );
  }
});
