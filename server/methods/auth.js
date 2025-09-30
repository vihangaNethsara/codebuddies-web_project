import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { check } from "meteor/check";

Meteor.methods({
  "users.manualLogin"(email, password) {
    check(email, String);
    check(password, String);

    // Find user by email
    const user = Accounts.findUserByEmail(email);
    if (!user) {
      throw new Meteor.Error("invalid-credentials", "Invalid email or password");
    }

    // Check password
    const result = Accounts._checkPassword(user, password);
    if (result.error) {
      throw new Meteor.Error("invalid-credentials", "Invalid email or password");
    }

    // Create login token
    const stampedToken = Accounts._generateStampedLoginToken();
    const hashStampedToken = Accounts._hashStampedToken(stampedToken);

    // Update user with login token
    Meteor.users.update(user._id, {
      $push: {
        "services.resume.loginTokens": hashStampedToken
      }
    });

    // Return login token for client
    return {
      userId: user._id,
      token: stampedToken.token,
      username: user.username,
      profile: user.profile
    };
  },

  "users.manualSignup"(email, password, username, profile) {
    check(email, String);
    check(password, String);
    check(username, String);
    check(profile, Object);

    // Check if user already exists
    if (Accounts.findUserByEmail(email)) {
      throw new Meteor.Error("email-exists", "User with this email already exists");
    }

    if (Meteor.users.findOne({ username: username })) {
      throw new Meteor.Error("username-exists", "Username already taken");
    }

    // Create user
    const userId = Accounts.createUser({
      email: email,
      password: password,
      username: username,
      profile: profile
    });

    // Set additional fields that OAuth users have
    Meteor.users.update(userId, {
      $set: {
        "profile.memberSince": new Date(),
        roles: ["member"], // Default role
        "status.online": true,
        "status.lastActivity": new Date()
      }
    });

    return { userId: userId };
  }
});
