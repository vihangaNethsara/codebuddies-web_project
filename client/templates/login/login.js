Template.login.helpers({
  error: function() {
    return Session.get("loginError");
  },
  isLoading: function() {
    return Session.get("loggingIn");
  }
});

Template.login.events({
  "submit .login-form": function(e, template) {
    e.preventDefault();

    Session.set("loginError", null);
    Session.set("loggingIn", true);

    const usernameOrEmail = template.find("#usernameOrEmail").value.trim();
    const password = template.find("#password").value;

    if (!usernameOrEmail || !password) {
      Session.set("loginError", "Please enter username/email and password");
      Session.set("loggingIn", false);
      return;
    }

    UserManager.login(usernameOrEmail, password, function(error, user) {
      Session.set("loggingIn", false);

      if (error) {
        Session.set("loginError", error.reason || "Login failed");
      } else {
        Session.set("loginError", null);
        FlowRouter.go("/"); // Redirect to home page
      }
    });
  },

  // Add existing social login handlers
  "click .signInSlack": function(e) {
    e.preventDefault();
    // Your existing Slack login logic
  },

  "click .signInGithub": function(e) {
    e.preventDefault();
    // Your existing GitHub login logic
  }
});
