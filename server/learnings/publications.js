import { Match } from "meteor/check";

Meteor.publish("learnings", function(limit) {
  check(limit, Number);
  return Learnings.find({}, { sort: { created_at: -1 }, limit: limit });
});

Meteor.publish("learningsByUserId", function(limit, userId) {
  check(limit, Number);
  check(userId, Match.Maybe(String));

  if (!userId) {
    return this.ready();
  }

  if (this.userId) {
    return Learnings.find({ userId: userId }, { sort: { created_at: -1 }, limit: limit });
  } else {
    this.ready();
  }
});

Meteor.publish("learningsByHangoutId", function(limit, hangoutId) {
  check(hangoutId, String);
  check(limit, Number);

  return Learnings.find(
    { hangout_id: { $exists: true, $not: { $ne: hangoutId } } },
    { sort: { created_at: -1 }, limit: limit }
  );
});

Meteor.publish("learningsByStudyGroupId", function(limit, studyGroupId) {
  check(studyGroupId, String);
  check(limit, Number);

  return Learnings.find(
    { study_group_id: { $exists: true, $not: { $ne: studyGroupId } } },
    { sort: { created_at: -1 }, limit: limit }
  );
});
