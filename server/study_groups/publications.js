Meteor.publish("myStudyGroups", function(limit) {
  const userId = getPublicationUserId.call(this);

  if (!userId) {
    return this.ready();
  }

  // Try to get user from either Meteor.users or CustomUsers
  let user = Meteor.users.findOne({ _id: userId }) || CustomUsers.findOne({ _id: userId });

  if (!user || !user.roles) {
    return this.ready();
  }

  let roles = user.roles;
  let studyGroups = [];
  for (let key in roles) {
    if (roles[key].length !== 0) {
      studyGroups.push(key);
    }
  }

  let query = new Object();
  query._id = { $in: studyGroups };
  query.visibility = { $ne: false };

  let projection = new Object();

  projection.fields = {
    title: 1,
    tagline: 1,
    slug: 1,
    members: 1,
    exempt_from_default_permission: 1
  };
  projection.limit = limit;

  let options = new Object();
  options.reactive = false;

  // console.log(StudyGroups.find({ _id : { $in : studyGroups}}).count());
  return StudyGroups.find(query, projection, options);
});

Meteor.publish("allStudyGroups", function(limit, studyGroupsFilter) {
  check(limit, Number);
  check(studyGroupsFilter, String);

  let query = new Object();
  query.visibility = { $ne: false };

  let projection = new Object();

  projection.fields = {
    title: 1,
    tagline: 1,
    slug: 1,
    createdAt: 1,
    updatedAt: 1,
    members: 1
  };
  projection.limit = limit;

  let options = new Object();
  options.reactive = false;

  switch (studyGroupsFilter) {
    case "new":
      projection.sort = { createdAt: 1, updatedAt: 1 };

      break;
    case "popular":
      break;
    default:
  }
  return StudyGroups.find(query, projection, options);
});

Meteor.publish("studyGroupById", function(studygroupId) {
  check(studygroupId, String);

  return StudyGroups.find({ _id: studygroupId });
});

Meteor.publish("studyGroupSearch", function(searchTerm) {
  check(searchTerm, String);
  if (_.isEmpty(searchTerm)) return this.ready();

  return StudyGroups.search(searchTerm);
});
