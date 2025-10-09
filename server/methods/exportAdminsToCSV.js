import { Meteor } from "meteor/meteor";
import { Roles } from "meteor/alanning:roles";
// Helper to convert array of objects to CSV
function arrayToCSV(data) {
  if (!data.length) return "";
  const keys = Object.keys(data[0]);
  const header = keys.join(",");
  const rows = data.map(row => keys.map(k => '"' + String(row[k]).replace(/"/g, '""') + '"').join(","));
  return [header, ...rows].join("\r\n");
}

// Meteor method to get admin users as CSV string
Meteor.methods({
  exportAdminsToCSV() {
    if (!this.userId || !Roles.userIsInRole(this.userId, "admin")) {
      throw new Meteor.Error("not-authorized");
    }
    const users = Meteor.users
      .find({ roles: "admin" }, { fields: { _id: 1, username: 1, emails: 1, profile: 1 } })
      .fetch();
    // Flatten emails and profile for CSV
    const data = users.map(u => ({
      id: u._id,
      username: u.username || "",
      email: u.emails && u.emails[0] ? u.emails[0].address : "",
      name: u.profile && u.profile.name ? u.profile.name : ""
    }));
    return arrayToCSV(data);
  }
});
