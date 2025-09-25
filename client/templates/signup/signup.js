Template.signup.onCreated(function() {
  console.log("Signup template created");
});

Template.signup.helpers({
  error: function() {
    return Session.get("signupError");
  },
  success: function() {
    return Session.get("signupSuccess");
  },
  isLoading: function() {
    return Session.get("signingUp");
  }
});

Template.signup.events({
  "submit .signup-form": function(e, template) {
    e.preventDefault();
    console.log("Signup form submitted");

    // Clear previous messages
    Session.set("signupError", null);
    Session.set("signupSuccess", null);
    Session.set("signingUp", true);

    // Get form values
    const formData = {
      username: template.find("#username").value.trim(),
      email: template.find("#email").value.trim(),
      password: template.find("#password").value,
      confirmPassword: template.find("#confirmPassword").value,
      firstName: template.find("#firstName").value.trim(),
      lastName: template.find("#lastName").value.trim(),
      programmingLevel: template.find("#programmingLevel").value,
      interests: template.find("#interests").value.trim(),
      timezone: template.find("#timezone").value,
      agreeTerms: template.find("#agreeTerms").checked
    };

    console.log("Form data collected:", {
      ...formData,
      password: "[HIDDEN]",
      confirmPassword: "[HIDDEN]"
    });

    // Client-side validation
    const validationErrors = validateSignupForm(formData);
    if (validationErrors.length > 0) {
      console.log("Validation errors:", validationErrors);
      Session.set("signupError", validationErrors[0]);
      Session.set("signingUp", false);
      return;
    }

    console.log("Validation passed, calling UserManager.register");

    // Register user
    UserManager.register(
      {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        programmingLevel: formData.programmingLevel,
        interests: formData.interests || "",
        timezone: formData.timezone
      },
      function(error, userId) {
        console.log("Registration callback:", { error, userId });
        Session.set("signingUp", false);

        if (error) {
          console.error("Signup error:", error);
          Session.set("signupError", error.reason || "An error occurred during registration");
        } else {
          console.log("Registration successful!");
          Session.set("signupSuccess", "Welcome to CodeBuddies! Your account has been created successfully.");

          // Clear form
          template.find(".signup-form").reset();

          // Show success for a moment then redirect
          setTimeout(function() {
            FlowRouter.go("/login");
          }, 3000);
        }
      }
    );
  }
});

// Validation helper function
function validateSignupForm(data) {
  const errors = [];

  if (!data.username || data.username.length < 3) {
    errors.push("Username must be at least 3 characters long");
  }

  if (!data.email) {
    errors.push("Email address is required");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("Please enter a valid email address");
  }

  if (!data.password || data.password.length < 6) {
    errors.push("Password must be at least 6 characters long");
  }

  if (data.password !== data.confirmPassword) {
    errors.push("Passwords do not match");
  }

  if (!data.firstName || !data.lastName) {
    errors.push("First name and last name are required");
  }

  if (!data.programmingLevel) {
    errors.push("Please select your programming experience level");
  }

  if (!data.timezone) {
    errors.push("Please select your timezone");
  }

  if (!data.agreeTerms) {
    errors.push("You must agree to the Terms of Service and Privacy Policy");
  }

  return errors;
}
