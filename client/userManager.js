// Client-side user management that integrates with CodeBuddies
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

  login: function(usernameOrEmail, password, callback) {
    Meteor.call(
      "customUsers.login",
      {
        usernameOrEmail: usernameOrEmail,
        password: password
      },
      function(error, result) {
        if (error) {
          callback(error);
        } else {
          Session.set("userSessionToken", result.sessionToken);
          Session.set("currentUser", result.user); // includes roles
          localStorage.setItem("codebuddies_session", result.sessionToken);

          // CRITICAL: Also login to Meteor's auth system using the resume token
          // This makes Meteor.userId() and Meteor.user() work
          if (result.loginToken) {
            Meteor.loginWithToken(result.loginToken, function(meteorError) {
              if (meteorError) {
                console.error("Meteor login failed:", meteorError);
              } else {
                console.log("Successfully synced with Meteor auth");
              }
            });
          }

          callback(null, result.user);
        }
      }
    );
  },

  logout: function(callback) {
    const sessionToken = Session.get("userSessionToken");
    if (sessionToken) {
      Meteor.call("customUsers.logout", sessionToken, function(error) {
        Session.set("userSessionToken", null);
        Session.set("currentUser", null);
        localStorage.removeItem("codebuddies_session");

        // Also logout from Meteor's auth system
        Meteor.logout(function(meteorError) {
          if (meteorError) {
            console.error("Meteor logout failed:", meteorError);
          }
        });

        if (callback) callback(error);
      });
    } else {
      // Just logout from Meteor if no custom session
      Meteor.logout();
      if (callback) callback();
    }
  },

  register: function(userData, callback) {
    Meteor.call("customUsers.register", userData, function(error, userId) {
      if (callback) callback(error, userId);
    });
  },

  updateProfile: function(profileData, callback) {
    const userId = this.getUserId();
    if (!userId) {
      if (callback) callback(new Error("Not logged in"));
      return;
    }

    Meteor.call("customUsers.updateProfile", userId, profileData, function(error) {
      if (!error) {
        // Refresh current user data
        UserManager.refreshCurrentUser();
      }
      if (callback) callback(error);
    });
  },

  refreshCurrentUser: function() {
    const sessionToken = Session.get("userSessionToken");
    if (sessionToken) {
      Meteor.call("customUsers.getCurrentUser", sessionToken, function(error, user) {
        if (!error && user) {
          Session.set("currentUser", user);
        }
      });
    }
  },

  init: function() {
    const savedToken = localStorage.getItem("codebuddies_session");
    if (savedToken) {
      Meteor.call("customUsers.getCurrentUser", savedToken, function(error, user) {
        if (!error && user) {
          Session.set("userSessionToken", savedToken);
          Session.set("currentUser", user);
        } else {
          localStorage.removeItem("codebuddies_session");
        }
      });
    }
  },

  // Helper methods for CodeBuddies integration
  canJoinHangout: function(hangout) {
    const user = this.currentUser();
    if (!user) return false;

    // Add your hangout joining logic here
    return true;
  },

  canCreateStudyGroup: function() {
    const user = this.currentUser();
    if (!user) return false;

    // Add your study group creation logic here
    return true;
  },

  getUserStats: function() {
    const user = this.currentUser();
    if (!user) return null;

    return {
      hangoutsJoined: user.totalHangoutsJoined || 0,
      hangoutsOrganized: user.totalHangoutsOrganized || 0,
      studyGroupsJoined: user.totalStudyGroupsJoined || 0,
      reputation: user.reputation || 0,
      badges: user.badges || [],
      joinDate: user.profile.joinDate
    };
  }
};

// Initialize when client starts
Meteor.startup(function() {
  UserManager.init();
});
