FlowRouter.notFound = {
  action() {
    BlazeLayout.render("layout", { top: "header", main: "pageNotFound" });
  }
};

// Make sure you have a root route like this:
FlowRouter.route("/", {
  name: "home",
  action: function() {
    BlazeLayout.render("layout", {
      top: "header",
      main: "home"
    });
  }
});

FlowRouter.route("/hangouts", {
  name: "hangouts",
  action: function(params, queryParams) {
    BlazeLayout.render("layout", {
      top: "header",
      main: "hasBlocked",
      targetTemplate: "homeLoggedIn",
      footer: "footer"
    });
  }
});

FlowRouter.route("/hangout/:hangoutId", {
  name: "hangout",
  action: function(params, queryParams) {
    Meteor.call("incHangoutViewCount", params.hangoutId);
    BlazeLayout.render("layout", {
      top: "header",
      main: "hasBlocked",
      targetTemplate: "hangout",
      footer: "footer"
    });
  }
});

// @todo : make use of json for contributors
FlowRouter.route("/about", {
  name: "about",
  action: function(params, queryParams) {
    BlazeLayout.render("layout", {
      top: "header",
      main: "about",
      footer: "footer"
    });
  },
  triggersEnter: [
    function() {
      $("body").addClass("body-about");
    }
  ],
  triggersExit: [
    function() {
      $("body").removeClass("body-about");
    }
  ]
});

FlowRouter.route("/faq", {
  name: "faq",
  action: function(params, queryParams) {
    BlazeLayout.render("layout", {
      top: "header",
      main: "faq",
      footer: "footer"
    });
  }
});

FlowRouter.route("/coworking", {
  name: "coworking",
  action: function(params, queryParams) {
    BlazeLayout.render("layout", {
      top: "header",
      main: "coworking",
      footer: "footer"
    });
  },
  subscriptions: function(params, queryParams) {
    this.register("status", Meteor.subscribe("userStatus"));
  }
});

FlowRouter.route("/silent", {
  name: "silent",
  action: function(params, queryParams) {
    BlazeLayout.render("layout", {
      top: "header",
      main: "coworking",
      footer: "footer"
    });
  },
  subscriptions: function(params, queryParams) {
    this.register("status", Meteor.subscribe("userStatus"));
  }
});

FlowRouter.route("/hangout-faq", {
  name: "hangout-faq",
  action: function(params, queryParams) {
    BlazeLayout.render("layout", {
      top: "header",
      main: "hangoutFAQModal",
      footer: "footer"
    });
  }
});

// @todo : wip display learnings
FlowRouter.route("/learnings", {
  name: "learnings",
  action: function(params, queryParams) {
    BlazeLayout.render("layout", {
      top: "header",
      main: "learnings",
      footer: "footer"
    });
  }
});

FlowRouter.route("/privacy", {
  name: "privacyPolicy",
  action: function(params, queryParams) {
    BlazeLayout.render("layout", {
      top: "header",
      main: "privacyPolicy",
      footer: "footer"
    });
  }
});

FlowRouter.route("/terms-of-service", {
  name: "termsOfService",
  action: function(params, queryParams) {
    BlazeLayout.render("layout", {
      top: "header",
      main: "termsOfService",
      footer: "footer"
    });
  }
});

FlowRouter.route("/profile/:name/:userId", {
  name: "profile",
  triggersEnter: [
    function(context, redirect) {
      // Enhanced authentication check
      if (!Meteor.userId() && !(UserManager && UserManager.isLoggedIn())) {
        console.log("Profile access denied - not authenticated");
        redirect("/login");
        return;
      }
      console.log("Profile access granted");
    }
  ],
  action: function(params, queryParams) {
    BlazeLayout.render("layout", {
      top: "header",
      main: "hasBlocked",
      targetTemplate: "profile",
      footer: "footer"
    });
  }
});

// Fixed: Updated profile route to redirect to user's profile after manual login
FlowRouter.route("/profile/", {
  name: "myProfile",
  triggersEnter: [
    function(context, redirect) {
      const meteorUserId = Meteor.userId();
      const customUserId = UserManager ? UserManager.getUserId() : null;
      const currentUserId = meteorUserId || customUserId;

      console.log("My profile route - Meteor User:", meteorUserId, "Custom User:", customUserId);

      if (!currentUserId) {
        console.log("My profile access denied - redirecting to login");
        redirect("/login");
        return;
      }

      // Get user object to redirect to proper profile URL
      const meteorUser = Meteor.user();
      const customUser = UserManager ? UserManager.currentUser() : null;
      const user = meteorUser || customUser;

      if (user && user.username) {
        console.log("Redirecting to full profile URL for user:", user.username);
        redirect(`/profile/${user.username}/${user._id}`);
      } else {
        console.log("User found but missing username - redirecting to home");
        redirect("/");
      }
    }
  ],
  action: function(params, queryParams) {
    // This shouldn't be reached due to redirect above
    BlazeLayout.render("layout", {
      top: "header",
      main: "userProfile",
      footer: "footer"
    });
  }
});

FlowRouter.route("/profile/:name/:userId/account-settings", {
  name: "account",
  triggersEnter: [
    function(context, redirect) {
      const meteorUserId = Meteor.userId();
      const customUserId = UserManager ? UserManager.getUserId() : null;
      const currentUserId = meteorUserId || customUserId;

      console.log("Account settings access check - Current User:", currentUserId, "Route User:", context.params.userId);

      if (!currentUserId) {
        console.log("Account settings access denied - not authenticated");
        redirect("/login");
        return;
      }

      // Only allow access to own account settings (or admin)
      const isOwnAccount = currentUserId === context.params.userId;
      const isAdmin = Roles && Roles.userIsInRole && Roles.userIsInRole(currentUserId, ["admin", "moderator"], "CB");

      if (!isOwnAccount && !isAdmin) {
        console.log("Account settings access denied - not owner or admin");
        redirect("/");
        return;
      }

      console.log("Account settings access granted");
    }
  ],
  action: function(params, queryParams) {
    BlazeLayout.render("layout", {
      top: "header",
      main: "hasBlocked",
      targetTemplate: "userAccountSettings",
      footer: "footer"
    });
  }
});

FlowRouter.route("/notifications", {
  name: "user notification",
  triggersEnter: [
    function(context, redirect) {
      if (!Meteor.userId()) {
        redirect("/login");
      }
    }
  ],
  action: function(params, queryParams) {
    BlazeLayout.render("layout", {
      top: "header",
      main: "hasBlocked",
      targetTemplate: "rsvp",
      footer: "footer"
    });
  }
});

FlowRouter.route("/my-study-groups", {
  name: "my study groups",
  triggersEnter: [
    function(context, redirect) {
      if (!Meteor.userId()) {
        redirect("/login");
      }
    }
  ],
  action: function(params, queryParams) {
    BlazeLayout.render("layout", {
      top: "header",
      main: "hasBlocked",
      targetTemplate: "myStudyGroups",
      footer: "footer"
    });
  }
});

FlowRouter.route("/study-groups", {
  name: "all study groups",
  action: function(params, queryParams) {
    BlazeLayout.render("layout", {
      top: "header",
      main: "hasBlocked",
      targetTemplate: "allStudyGroups",
      footer: "footer"
    });
  }
});

FlowRouter.route("/study-groups/owners-guide", {
  name: "study group owners guide",
  action: function(params, queryParams) {
    BlazeLayout.render("layout", {
      top: "header",
      main: "studyGroupOwnersGuide",
      footer: "footer"
    });
  }
});

FlowRouter.route("/welcome", {
  name: "welcome",
  action: function(params, queryParams) {
    BlazeLayout.render("layout", {
      top: "header",
      main: "welcome",
      footer: "footer"
    });
  },
  triggersEnter: [
    function() {
      $(window).scrollTop(0);
    }
  ]
});

FlowRouter.route("/study-group/:studyGroupSlug/:studyGroupId", {
  name: "study group",
  action: function(params, queryParams) {
    BlazeLayout.render("layout", {
      top: "header",
      main: "hasBlocked",
      targetTemplate: "singleStudyGroup",
      footer: "footer"
    });
  },
  subscriptions: function(params, queryParams) {
    this.register("status", Meteor.subscribe("userStatus"));
  }
});

FlowRouter.route("/discussion/:discussionId", {
  name: "discussion",
  action: function(params, queryParams) {
    Meteor.call("discussions.incViewCount", params.discussionId);
    BlazeLayout.render("layout", {
      top: "header",
      main: "hasBlocked",
      targetTemplate: "discussion",
      footer: "footer"
    });
  }
});

FlowRouter.route("/discussions", {
  name: "discussions",
  action: function(params, queryParams) {
    BlazeLayout.render("layout", {
      top: "header",
      main: "hasBlocked",
      targetTemplate: "allDiscussions",
      footer: "footer"
    });
  }
});

FlowRouter.route("/unsubscribe/:unsubscribeLinkId", {
  name: "unsubscribe me",
  action: function(params, queryParams) {
    BlazeLayout.render("layout", {
      top: "header",
      main: "hasBlocked",
      targetTemplate: "unsubscribeFromMailingList",
      footer: "footer"
    });
  }
});

FlowRouter.route("/sponsor", {
  name: "Sponsor us!",
  action: function(params, queryParams) {
    BlazeLayout.render("layout", {
      top: "header",
      main: "sponsorUs",
      footer: "footer"
    });
  }
});

FlowRouter.route("/goodbye", {
  name: "goodbye",
  action: function(params, queryParams) {
    BlazeLayout.render("layout", { top: "header", main: "goodbye" });
  }
});

FlowRouter.route("/slack", {
  name: "slack",
  action: function(params, queryParams) {
    BlazeLayout.render("layout", {
      top: "header",
      main: "slack",
      footer: "footer"
    });
  }
});

FlowRouter.route("/inbox", {
  name: "inbox",
  triggersEnter: [
    function(context, redirect) {
      if (!Meteor.userId()) {
        redirect("/login");
      }
    }
  ],
  action: function(params, queryParams) {
    BlazeLayout.render("layout", {
      top: "header",
      main: "hasBlocked",
      targetTemplate: "inbox"
      // footer: "footer"
    });
  }
});

FlowRouter.route("/conversation/:conversationId", {
  name: "conversation",
  triggersEnter: [
    function(context, redirect) {
      if (!Meteor.userId()) {
        redirect("/login");
      }
    }
  ],
  action: function(params, queryParams) {
    BlazeLayout.render("layout", {
      top: "header",
      main: "hasBlocked",
      targetTemplate: "conversation"
      // footer: "footer"
    });
  }
});

var sys = FlowRouter.group({
  prefix: "/admin",
  triggersEnter: [
    function(context, redirect) {
      const meteorUserId = Meteor.userId();
      const customUserId = UserManager ? UserManager.getUserId() : null;
      const currentUserId = meteorUserId || customUserId;

      console.log("=== ADMIN ACCESS DEBUG ===");
      console.log("Admin area access check for:", context.path);
      console.log("Meteor User ID:", meteorUserId);
      console.log("Custom User ID:", customUserId);
      console.log("Current User ID:", currentUserId);
      console.log("UserManager exists:", !!UserManager);
      console.log("UserManager.isLoggedIn():", UserManager ? UserManager.isLoggedIn() : "N/A");

      if (!currentUserId) {
        console.log("❌ Admin access denied - not authenticated, redirecting to login");
        redirect("/login");
        return;
      }

      // Check for admin/moderator role in both systems
      let hasAdminRole = false;

      // Check Meteor Users collection first
      if (meteorUserId && Roles && Roles.userIsInRole) {
        hasAdminRole = Roles.userIsInRole(meteorUserId, ["admin", "moderator"], "CB");
        console.log("Meteor user admin check:", hasAdminRole);
      }

      // If not admin in Meteor system, check CustomUsers collection
      if (!hasAdminRole && customUserId) {
        const customUser = UserManager ? UserManager.currentUser() : null;
        console.log("Custom user object:", customUser);
        if (customUser) {
          // Check if user has admin flag or roles
          const hasAdminFlag = customUser.isAdmin;
          const hasAdminInRoles = customUser.roles && customUser.roles.CB && customUser.roles.CB.includes("admin");
          hasAdminRole = hasAdminFlag || hasAdminInRoles;
          console.log("Custom user admin flag:", hasAdminFlag);
          console.log("Custom user admin in roles:", hasAdminInRoles);
          console.log("Custom user admin check result:", hasAdminRole);
          console.log("Custom user roles:", customUser.roles);
        } else {
          console.log("❌ Custom user object is null");
        }
      }

      if (!hasAdminRole) {
        console.log("❌ Admin access denied - insufficient permissions, redirecting to home");
        console.log("Final hasAdminRole:", hasAdminRole);
        redirect("/");
        return;
      }

      console.log("✅ Admin access granted for user:", currentUserId);
      console.log("========================");
    }
  ]
});

sys.route("/", {
  name: "admin",
  action: function() {
    BlazeLayout.render("sysLayout", {
      top: "sysHeader",
      main: "hasPermission",
      targetTemplate: "adminLanding"
    });
  }
});

sys.route("/dashboard", {
  name: "stats",
  action: function() {
    BlazeLayout.render("sysLayout", {
      top: "header",
      main: "hasPermission",
      targetTemplate: "dashboard"
    });
  }
});

sys.route("/dashboard/:sortUserAs", {
  name: "dashboard",
  action: function() {
    BlazeLayout.render("sysLayout", {
      top: "header",
      main: "hasPermission",
      targetTemplate: "sortUserAs"
    });
  }
});

sys.route("/manage-users", {
  name: "manage user",
  action: function() {
    BlazeLayout.render("sysLayout", {
      top: "header",
      main: "hasPermission",
      targetTemplate: "manageUser"
    });
  }
});

sys.route("/users/:role", {
  name: "user by role",
  action: function() {
    BlazeLayout.render("sysLayout", {
      top: "header",
      main: "hasPermission",
      targetTemplate: "usersByRole"
    });
  }
});

sys.route("/user/:userId", {
  name: "user by id",
  action: function() {
    BlazeLayout.render("sysLayout", {
      top: "header",
      main: "hasPermission",
      targetTemplate: "userById"
    });
  }
});

sys.route("/notifications", {
  name: "notifications",
  action: function() {
    BlazeLayout.render("sysLayout", {
      top: "header",
      main: "hasPermission",
      targetTemplate: "allNotification"
    });
  }
});

// Fixed: Removed duplicate routes and used consistent layout
FlowRouter.route("/login", {
  name: "login",
  action: function(params, queryParams) {
    if (Meteor.userId()) {
      // Redirect logged-in users to their profile
      const user = Meteor.user();
      if (user && user.username) {
        FlowRouter.go(`/profile/${user.username}/${user._id}`);
      } else {
        FlowRouter.go("/");
      }
    } else {
      BlazeLayout.render("layout", {
        top: "header",
        main: "login",
        footer: "footer"
      });
    }
  }
});

FlowRouter.route("/signup", {
  name: "signup",
  action: function(params, queryParams) {
    if (Meteor.userId()) {
      // Redirect logged-in users to their profile
      const user = Meteor.user();
      if (user && user.username) {
        FlowRouter.go(`/profile/${user.username}/${user._id}`);
      } else {
        FlowRouter.go("/");
      }
    } else {
      BlazeLayout.render("layout", {
        top: "header",
        main: "signup",
        footer: "footer"
      });
    }
  }
});

FlowRouter.route("/report-problem", {
  name: "reportProblem",
  action: function() {
    BlazeLayout.render("layout", {
      top: "header",
      main: "reportProblem",
      footer: "footer"
    });
  }
});
