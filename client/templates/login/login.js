Template.login.helpers({
  error: function() {
    return Session.get("loginError");
  },
  isLoading: function() {
    return Session.get("loggingIn");
  }
});

Template.login.events({
  // Removed duplicate login form handler - now handled in client/helpers/auth.js

  // Social login handlers
  "click .signInSlack": function(e) {
    e.preventDefault();
    // Your existing Slack login logic
  },

  "click .signInGithub": function(e) {
    e.preventDefault();
    // Your existing GitHub login logic
  }
});
