Meteor.startup(function() {
  if (typeof StudyGroups !== "undefined") {
    StudyGroups._ensureIndex({ title: 1 });
  }
});
