// Global template helpers
Template.registerHelper("currentUser", function() {
  return UserManager.currentUser();
});

Template.registerHelper("isLoggedIn", function() {
  return UserManager.isLoggedIn();
});

Template.registerHelper("userDisplayName", function() {
  const user = UserManager.currentUser();
  return user ? user.profile.displayName : "";
});

Template.registerHelper("currentUserId", function() {
  return UserManager.getUserId();
});

// Format date helper
Template.registerHelper("formatDate", function(date, format) {
  if (!date) return "";
  return moment(date).format(format || "MMM DD, YYYY");
});
