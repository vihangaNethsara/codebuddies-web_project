import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { Roles } from "meteor/alanning:roles";

// Single onCreateUser hook (only once in entire codebase)
Accounts.onCreateUser((options, user) => {
  user.profile = options.profile || user.profile || {};
  if (!user.profile.name && user.username) {
    user.profile.name = user.username;
  }
  if (!user.profile.memberSince) {
    user.profile.memberSince = new Date();
  }
  if (typeof user.profile.completed === "undefined") {
    user.profile.completed = false;
  }

  // Provide a default role placeholder so later migration / roles lib can adjust.
  // (Roles.addUsersToRoles will still normalize it after insertion.)
  if (!user.roles) {
    user.roles = ["member"];
  }

  return user;
});

Meteor.startup(() => {
  const cursor = Meteor.users.find(
    {
      "services.password": { $exists: true },
      $or: [{ roles: { $exists: false } }, { roles: { $size: 0 } }]
    },
    { fields: { _id: 1 } }
  );

  cursor.forEach(u => {
    Roles.addUsersToRoles(u._id, ["member"]);
  });
});
