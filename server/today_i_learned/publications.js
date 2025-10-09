import { Match } from "meteor/check";

// Publications for TodayILearned collection
Meteor.publish("todayILearnedByUserId", function(limit, userId) {
  check(limit, Number);
  check(userId, Match.Maybe(String));

  if (!userId) {
    return this.ready();
  }

  return TodayILearned.find(
    { userId: userId },
    {
      limit: limit,
      sort: { created_at: -1 },
      fields: {
        title: 1,
        userId: 1,
        username: 1,
        created_at: 1,
        updated_at: 1,
        kudos: 1,
        likedBy: 1
      }
    }
  );
});

Meteor.publish("todayILearnedGeneral", function(limit) {
  check(limit, Number);

  return TodayILearned.find(
    {},
    {
      limit: limit,
      sort: { created_at: -1 },
      fields: {
        title: 1,
        userId: 1,
        username: 1,
        created_at: 1,
        updated_at: 1,
        kudos: 1,
        likedBy: 1
      }
    }
  );
});

// Publish current user's TIL entries
Meteor.publish("myTodayILearned", function(limit) {
  check(limit, Number);

  if (!this.userId) {
    return this.ready();
  }

  return TodayILearned.find(
    { userId: this.userId },
    {
      limit: limit,
      sort: { created_at: -1 }
    }
  );
});
