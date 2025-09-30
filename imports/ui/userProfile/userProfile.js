Template.userProfile.onCreated(function() {
  // Subscribe to user data
  this.autorun(() => {
    if (Meteor.userId()) {
      this.subscribe("userData");
    }
  });
});

Template.userProfile.helpers({
  currentUser: function() {
    return Meteor.user();
  },

  userEmail: function() {
    const user = Meteor.user();
    if (user && user.emails && user.emails.length > 0) {
      return user.emails[0].address;
    }
    return null;
  },

  isLoggedIn: function() {
    return !!Meteor.userId();
  },

  isLoggingIn: function() {
    return Meteor.loggingIn();
  },

  userAvatar: function() {
    const user = Meteor.user();
    if (user && user.profile && user.profile.avatar) {
      return user.profile.avatar.default || user.profile.avatar;
    }
    return null;
  },

  memberSince: function() {
    const user = Meteor.user();
    if (user && user.createdAt) {
      return moment(user.createdAt).format("MMMM YYYY");
    }
    return null;
  }
});

Template.userProfile.events({
  "click .auth-actions .btn": function(e) {
    // Let the default link behavior work
  }
});
