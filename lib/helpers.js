// Global template helpers for CodeBuddies integration
Template.registerHelper("currentUser", function() {
  return UserManager.currentUser();
});

Template.registerHelper("isLoggedIn", function() {
  return UserManager.isLoggedIn();
});

Template.registerHelper("currentUserId", function() {
  return UserManager.getUserId();
});

Template.registerHelper("userDisplayName", function() {
  const user = UserManager.currentUser();
  return user ? user.profile.displayName : "";
});

Template.registerHelper("userStats", function() {
  return UserManager.getUserStats();
});

// Format date helper
Template.registerHelper("formatDate", function(date, format) {
  if (!date) return "";
  return moment(date).format(format || "MMM DD, YYYY");
});

// Check if user owns content
Template.registerHelper("isOwner", function(userId) {
  return UserManager.getUserId() === userId;
});
