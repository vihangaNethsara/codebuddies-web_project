// Create this file: client/lib/userManager.js
UserManager = {
  currentUser: function() {
    return Session.get("currentUser");
  },

  isLoggedIn: function() {
    return !!this.currentUser();
  },

  getUserId: function() {
    const user = this.currentUser();
    return user ? user._id : null;
  },

  register: function(userData, callback) {
    console.log("UserManager.register called with:", userData);

    Meteor.call("customUsers.register", userData, function(error, userId) {
      console.log("Registration result:", { error, userId });
      if (callback) callback(error, userId);
    });
  },

  login: function(usernameOrEmail, password, callback) {
    console.log("UserManager.login called");

    Meteor.call(
      "customUsers.login",
      {
        usernameOrEmail: usernameOrEmail,
        password: password
      },
      function(error, result) {
        console.log("Login result:", { error, result: result ? "success" : "failed" });

        if (error) {
          callback(error);
        } else {
          Session.set("userSessionToken", result.sessionToken);
          Session.set("currentUser", result.user);
          localStorage.setItem("codebuddies_session", result.sessionToken);
          callback(null, result.user);
        }
      }
    );
  },

  logout: function(callback) {
    console.log("UserManager.logout called");

    const sessionToken = Session.get("userSessionToken");
    if (sessionToken) {
      Meteor.call("customUsers.logout", sessionToken, function(error) {
        Session.set("userSessionToken", null);
        Session.set("currentUser", null);
        localStorage.removeItem("codebuddies_session");
        console.log("Logout completed");
        if (callback) callback(error);
      });
    } else if (callback) {
      callback();
    }
  },

  init: function() {
    console.log("UserManager.init called");

    const savedToken = localStorage.getItem("codebuddies_session");
    if (savedToken) {
      console.log("Found saved token, attempting to restore session");

      Meteor.call("customUsers.getCurrentUser", savedToken, function(error, user) {
        if (!error && user) {
          console.log("Session restored for user:", user.username);
          Session.set("userSessionToken", savedToken);
          Session.set("currentUser", user);
        } else {
          console.log("Could not restore session:", error);
          localStorage.removeItem("codebuddies_session");
        }
      });
    }
  }
};

// Initialize when client starts
Meteor.startup(function() {
  console.log("Starting UserManager initialization");
  UserManager.init();
});
