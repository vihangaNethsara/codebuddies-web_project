import { Match } from "meteor/check";

Meteor.publish("userStatus", function() {
  if (this.userId) {
    return Meteor.users.find({ "status.online": true });
  } else {
    this.ready();
  }
});
Meteor.publish("allUsers", function() {
  if (Roles.userIsInRole(this.userId, ["admin", "moderator"], "CB")) {
    return Meteor.users.find(
      {},
      {
        fields: {
          createdAt: 1,
          email: 1,
          profile: 1,
          roles: 1,
          username: 1,
          status: 1,
          privacyResponse: 1
        }
      }
    );
  }
  this.ready();
});

Meteor.publish("studyGroupMemberDetail", function(groupId, userId) {
  check(groupId, String);
  check(userId, Match.Maybe(String));

  if (!userId) {
    return this.ready();
  }

  if (Roles.userIsInRole(this.userId, ["owner", "admin", "moderator"], groupId)) {
    return Meteor.users.find(
      { _id: userId },
      {
        fields: {
          createdAt: 1,
          email: 1,
          profile: 1,
          roles: 1,
          username: 1,
          status: 1
        }
      }
    );
  }
  this.ready();
});

// Publication for public user profiles
Meteor.publish("userProfile", function(userId) {
  check(userId, Match.Maybe(String));

  if (!userId) {
    return this.ready();
  }

  // Anyone can view public user profiles
  return Meteor.users.find(
    { _id: userId },
    {
      fields: {
        username: 1,
        profile: 1,
        createdAt: 1,
        status: 1
        // Exclude sensitive fields like emails, services, roles
      }
    }
  );
});

Meteor.publish(null, function() {
  if (this.userId) {
    return Meteor.users.find(
      { _id: this.userId },
      {
        fields: {
          createdAt: 1,
          email: 1,
          profile: 1,
          roles: 1,
          username: 1,
          status: 1,
          emails_preference: 1
        }
      }
    );
  }
  this.ready();
});
