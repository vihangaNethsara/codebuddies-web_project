// Consolidated login form handler with proper error handling
Template.login.events({
  "submit .login-form"(event, template) {
    event.preventDefault();

    console.log("Login form submitted");

    // Clear any previous errors
    Session.set("loginError", null);
    Session.set("loggingIn", true);

    // Use template.find() for more reliable field access
    const emailField =
      template.find("#usernameOrEmail") || template.find("#email") || template.find("input[name='email']");
    const passwordField = template.find("#password") || template.find("input[name='password']");

    if (!emailField || !passwordField) {
      console.error("Login form fields not found");
      Session.set("loginError", "Login form is missing required fields");
      Session.set("loggingIn", false);
      return;
    }

    const email = emailField.value ? emailField.value.trim() : "";
    const password = passwordField.value || "";

    console.log("Login attempt for:", email);

    if (!email || !password) {
      Session.set("loginError", "Please enter email/username and password");
      Session.set("loggingIn", false);
      return;
    }

    // Try custom UserManager first (if available), then fallback to Meteor
    if (UserManager && typeof UserManager.login === "function") {
      console.log("Using UserManager login");
      UserManager.login(email, password, function(error, user) {
        Session.set("loggingIn", false);

        if (error) {
          console.error("UserManager login failed:", error);
          Session.set("loginError", error.reason || error.message || "Login failed");
        } else {
          console.log("UserManager login successful:", user);
          Session.set("loginError", null);

          // Redirect to profile or home
          if (user && user.username) {
            FlowRouter.go(`/profile/${user.username}/${user._id}`);
          } else {
            FlowRouter.go("/");
          }
        }
      });
    } else {
      console.log("Using Meteor loginWithPassword");
      Meteor.loginWithPassword(email, password, err => {
        Session.set("loggingIn", false);

        if (err) {
          console.error("Meteor login failed:", err);
          Session.set("loginError", err.reason || err.message || "Login failed");
        } else {
          console.log("Meteor login successful");
          Session.set("loginError", null);

          // Redirect handled by Accounts.onLogin or manual redirect
          const user = Meteor.user();
          if (user && user.username) {
            FlowRouter.go(`/profile/${user.username}/${user._id}`);
          } else {
            FlowRouter.go("/");
          }
        }
      });
    }
  }
});

Template.signup.events({
  "submit .signup-form"(event, template) {
    event.preventDefault();

    console.log("Signup form submitted");

    // Clear any previous errors
    Session.set("signupError", null);
    Session.set("signingUp", true);

    // Use template.find() for more reliable field access
    const emailField = template.find("#email") || template.find("input[name='email']");
    const passwordField = template.find("#password") || template.find("input[name='password']");
    const usernameField = template.find("#username") || template.find("input[name='username']");
    const nameField = template.find("#name") || template.find("input[name='name']");

    if (!emailField || !passwordField || !usernameField) {
      console.error("Signup form fields not found");
      Session.set("signupError", "Signup form is missing required fields");
      Session.set("signingUp", false);
      return;
    }

    const email = emailField.value ? emailField.value.trim() : "";
    const password = passwordField.value || "";
    const username = usernameField.value ? usernameField.value.trim() : "";
    const name = nameField ? (nameField.value ? nameField.value.trim() : username) : username;

    console.log("Signup attempt for:", email, username);

    if (!email || !password || !username) {
      Session.set("signupError", "Please fill in all required fields");
      Session.set("signingUp", false);
      return;
    }

    Meteor.call(
      "users.manualSignup",
      {
        email,
        password,
        username,
        profile: { name }
      },
      error => {
        if (error) {
          console.error("Signup failed:", error);
          Session.set("signupError", error.reason || error.message || "Signup failed");
          Session.set("signingUp", false);
          return;
        }

        console.log("Signup successful, attempting auto-login");
        Meteor.loginWithPassword(email, password, err => {
          Session.set("signingUp", false);

          if (err) {
            console.error("Auto-login failed:", err);
            Session.set("signupError", "Account created, please login manually");
            FlowRouter.go("/login");
            return;
          }

          console.log("Auto-login successful");
          const user = Meteor.user();
          if (user && user.username) {
            FlowRouter.go(`/profile/${user.username}/${user._id}`);
          } else {
            FlowRouter.go("/");
          }
        });
      }
    );
  }
});

// Unified redirect for ALL successful logins (OAuth + password)
Accounts.onLogin(() => {
  const user = Meteor.user();
  if (user && user.username) {
    const target = `/profile/${user.username}/${user._id}`;
    if (FlowRouter.current().path !== target) {
      FlowRouter.go(target);
    }
  }
});
