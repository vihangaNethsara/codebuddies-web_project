Template.login.events({
  "submit .login-form"(event) {
    event.preventDefault();
    const email = event.target.email.value.trim();
    const password = event.target.password.value;

    Meteor.loginWithPassword(email, password, err => {
      if (err) {
        console.error("Login failed:", err.reason);
        return;
      }
      // Redirect handled by Accounts.onLogin (below). Fallback:
      const user = Meteor.user();
      if (user && user.username) {
        FlowRouter.go(`/profile/${user.username}/${user._id}`);
      } else {
        FlowRouter.go("/");
      }
    });
  }
});

Template.signup.events({
  "submit .signup-form"(event) {
    event.preventDefault();
    const email = event.target.email.value.trim();
    const password = event.target.password.value;
    const username = event.target.username.value.trim();
    const name = (event.target.name.value || username).trim();

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
          console.error("Signup failed:", error.reason);
          return;
        }
        Meteor.loginWithPassword(email, password, err => {
          if (err) {
            console.error("Auto-login failed:", err.reason);
            FlowRouter.go("/login");
            return;
          }
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
