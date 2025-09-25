FlowRouter.route("/signup", {
  name: "signup",
  action: function() {
    console.log("Signup route accessed");

    if (UserManager.isLoggedIn()) {
      console.log("User already logged in, redirecting to home");
      FlowRouter.go("/");
    } else {
      console.log("Rendering signup template");

      // Use your existing layout structure - check what layout CodeBuddies uses
      BlazeLayout.render("layout", {
        // or 'main_layout' - check your existing routes
        main: "signup"
      });
    }
  }
});

FlowRouter.route("/login", {
  name: "login",
  action: function() {
    console.log("Login route accessed");

    if (UserManager.isLoggedIn()) {
      FlowRouter.go("/");
    } else {
      BlazeLayout.render("layout", {
        // or 'main_layout'
        main: "login"
      });
    }
  }
});
