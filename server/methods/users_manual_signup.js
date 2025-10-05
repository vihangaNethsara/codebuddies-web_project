import { Accounts } from "meteor/accounts-base";
import { Meteor } from "meteor/meteor";
import { Roles } from "meteor/alanning:roles";
import { check, Match } from "meteor/check";

if (!Meteor.server.method_handlers["users.manualSignup"]) {
  Meteor.methods({
    "users.manualSignup"(data) {
      check(data, {
        email: String,
        password: String,
        username: String,
        profile: Match.ObjectIncluding({
          name: String
        })
      });

      if (Accounts.findUserByEmail(data.email)) {
        throw new Meteor.Error("email-exists", "Email already registered");
      }
      if (Meteor.users.findOne({ username: data.username })) {
        throw new Meteor.Error("username-exists", "Username already taken");
      }

      const userId = Accounts.createUser({
        email: data.email,
        password: data.password,
        username: data.username,
        profile: {
          ...data.profile,
          memberSince: new Date()
        }
      });

      // Normalize roles structure via roles package
      Roles.addUsersToRoles(userId, ["member"]);

      return { userId };
    }
  });
}
