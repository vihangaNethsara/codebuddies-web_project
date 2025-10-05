import { Meteor } from "meteor/meteor";
import { Roles } from "meteor/alanning:roles";

Meteor.startup(() => {
  Meteor.users
    .find(
      {
        "services.password": { $exists: true },
        $or: [
          { roles: { $exists: false } },
          { roles: { $type: "array", $size: 0 } }, // legacy plain array
          { roles: { __global_roles__: { $exists: false } } }
        ]
      },
      { fields: { _id: 1, roles: 1 } }
    )
    .forEach(u => {
      Roles.addUsersToRoles(u._id, ["member"]);
    });
});
