// Publish problem reports for admins/moderators
Meteor.publish("problemReports", function() {
  const userId = getPublicationUserId.call(this);

  if (!userId) {
    return this.ready();
  }

  if (publicationUserHasRole.call(this, ["admin", "moderator"], "CB")) {
    return ProblemReports.find(
      {},
      {
        sort: { createdAt: -1 }
      }
    );
  } else {
    // Regular users can only see their own reports
    return ProblemReports.find(
      { userId: userId },
      {
        sort: { createdAt: -1 }
      }
    );
  }
});
