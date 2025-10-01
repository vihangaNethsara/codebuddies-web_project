if (Meteor.isClient) {
  Meteor.startup(function() {
    $("head").append('<script src="https://meet.jit.si/external_api.js"></script>');

    if (!Meteor.settings.public.isModeDebug) {
      console = console || {};
      console.log = function() {};
    }

    const defaultLang = "en";
    const localStorageLang = localStorage.getItem("languageCode");
    const browserLang = (window.navigator.userLanguage || window.navigator.language || "").slice(0, 2);
    TAPi18n.setLanguage(localStorageLang || browserLang || defaultLang)
      .fail(console.log)
      .always(() => localStorage.setItem("languageCode", TAPi18n.getLanguage()));
  });
}

Template.registerHelper("equals", function(a, b) {
  return a === b;
});

Template.registerHelper("cleanDateFormatCalendar", function(date) {
  return moment(date).calendar();
});

Template.registerHelper("relativeTime", function(date) {
  return moment(date)
    .startOf("minute")
    .fromNow();
});

Template.registerHelper("isUserCommentAuthor", function(authorId) {
  const currentUserId = Meteor.userId() || (UserManager ? UserManager.getUserId() : null);
  const isAuthor = currentUserId === authorId;
  console.log(`isUserCommentAuthor: User ${currentUserId} is author of comment by ${authorId}:`, isAuthor);
  return isAuthor;
});

Template.registerHelper("totalVotes", function(upvote = 0, downvote = 0) {
  return upvote - downvote;
});

Template.registerHelper("getHangoutTypeSign", function(hangoutType) {
  if (hangoutType == "silent") {
    return "fa-microphone-slash text-danger-color";
  } else if (hangoutType == "teaching") {
    return "fa-user text-warning-color";
  } else if (hangoutType == "collaboration") {
    return "fa-users text-success-color";
  }
});

Template.registerHelper("getHangoutGoogleCalendarDate", function(date) {
  const tz = TimezonePicker.detectedZone();
  return moment(date)
    .tz(tz)
    .format("YYYYMMDD");
});

Template.registerHelper("getHangoutGoogleCalendarTime", function(date) {
  const tz = TimezonePicker.detectedZone();
  return moment(date)
    .tz(tz)
    .format("HHmmss");
});

Template.registerHelper("getHangoutStartDateTime", function(date) {
  const tz = TimezonePicker.detectedZone();
  return moment(date)
    .tz(tz)
    .format("dddd MMMM Do YYYY, h:mm a z");
});

Template.registerHelper("getHangoutStartDateDay", function(date) {
  const tz = TimezonePicker.detectedZone();
  return moment(date)
    .tz(tz)
    .format("dddd MMMM Do YYYY");
});

Template.registerHelper("getHangoutStartTime", function(date) {
  const tz = TimezonePicker.detectedZone();
  return moment(date)
    .tz(tz)
    .format("h:mm a z");
});

Template.registerHelper("getHangoutEndDateTime", function(date) {
  const tz = TimezonePicker.detectedZone();
  return moment(date)
    .tz(tz)
    .format("MMMM Do h:mm a z");
});

Template.registerHelper("getHangoutEndTime", function(date) {
  const tz = TimezonePicker.detectedZone();
  return moment(date)
    .tz(tz)
    .format("h:mm a z");
});

Template.registerHelper("isHangoutUpcoming", function(startDate) {
  return startDate > new Date() ? true : false;
});

Template.registerHelper("isHangoutInProgress", function(startDate, endDate) {
  return startDate <= new Date() && endDate >= new Date() ? true : false;
});

Template.registerHelper("isHangoutCompleted", function(endDate) {
  return endDate < new Date() ? true : false;
});

Template.registerHelper("isAttending", function(users) {
  const currentUserId = Meteor.userId() || (UserManager ? UserManager.getUserId() : null);
  if (!currentUserId) {
    console.log("isAttending: No authenticated user");
    return false;
  }
  const isAttending = users.indexOf(currentUserId) !== -1;
  console.log(`isAttending: User ${currentUserId} is attending:`, isAttending);
  return isAttending;
});

Template.registerHelper("upcomingTime", function(start) {
  return start > new Date()
    ? TAPi18n.__("upcoming_time", { time: moment(start).fromNow() })
    : "The hangout has started!";
});

Template.registerHelper("isHangoutEndTimeTBA", function(start, end) {
  const duration = (end - start) / (1000 * 60 * 60 * 24);
  return duration === 1 ? true : false;
});

Template.registerHelper("isOwnerOfTheGroup", function(userId, groupId) {
  const loggedInUserId = Meteor.userId() || (UserManager ? UserManager.getUserId() : null);

  if (!loggedInUserId) {
    console.log("isOwnerOfTheGroup: No authenticated user");
    return false;
  }

  const isOwner = loggedInUserId !== userId && Roles.userIsInRole(loggedInUserId, ["owner"], groupId);
  console.log(`isOwnerOfTheGroup: User ${loggedInUserId} is owner of group ${groupId}:`, isOwner);
  return isOwner;
});

Template.registerHelper("canUpdateUserRoleForGroup", function(subjectId, groupId, subjectRole) {
  const loggedInUserId = Meteor.userId() || (UserManager ? UserManager.getUserId() : null);

  if (!loggedInUserId) {
    console.log("canUpdateUserRoleForGroup: No authenticated user");
    return false;
  }

  const canUpdate =
    loggedInUserId !== subjectId &&
    (subjectRole !== "owner" && subjectRole !== "admin") &&
    Roles.userIsInRole(loggedInUserId, ["owner", "admin"], groupId);

  console.log(`canUpdateUserRoleForGroup: User ${loggedInUserId} can update role for ${subjectId}:`, canUpdate);
  return canUpdate;
});

Template.registerHelper("isOrganizers", function(role) {
  return ["owner", "admin", "moderator"].indexOf(role) < 0 ? false : true;
});

Template.registerHelper("slotDayString", function(day) {
  switch (day) {
    case 0:
      return "MON";
      break;
    case 1:
      return "TUE";
      break;
    case 2:
      return "WED";
      break;
    case 3:
      return "THU";
      break;
    case 4:
      return "FRI";
      break;
    case 5:
      return "SAT";
      break;
    case 6:
      return "SUN";
      break;
    default:
      return "NaN";
  }
});

Template.registerHelper("isAuthor", function(userId) {
  const currentUserId = Meteor.userId() || (UserManager ? UserManager.getUserId() : null);
  const isAuthor = currentUserId === userId;
  console.log(`isAuthor: User ${currentUserId} is author of content by ${userId}:`, isAuthor);
  return isAuthor;
});

Template.registerHelper("inList", function(list, item) {
  if (list) {
    return list.indexOf(item) != -1;
  }
  return false;
});

Template.registerHelper("isInCollection", function(collection) {
  const currentUserId = Meteor.userId() || (UserManager ? UserManager.getUserId() : null);
  if (!currentUserId) {
    console.log("isInCollection: No authenticated user");
    return false;
  }

  const actor = _.find(collection, function(item) {
    return item.id === currentUserId;
  });
  const isInCollection = !!actor;
  console.log(`isInCollection: User ${currentUserId} is in collection:`, isInCollection);
  return isInCollection;
});

Template.registerHelper("truncateIt", function(text, length) {
  return text.truncate(length);
});

Template.registerHelper("instance", function() {
  return Template.instance();
});

Template.registerHelper("relativeTimeInMinute", function(date) {
  return moment(date)
    .startOf("minute")
    .fromNow();
});

Template.registerHelper("exceptMe", function(id) {
  const currentUserId = Meteor.userId() || (UserManager ? UserManager.getUserId() : null);
  if (!currentUserId) {
    console.log("exceptMe: No authenticated user");
    return true; // Show all if not logged in
  }

  const isNotMe = id !== currentUserId;
  console.log(`exceptMe: ID ${id} is not current user ${currentUserId}:`, isNotMe);
  return isNotMe;
});
