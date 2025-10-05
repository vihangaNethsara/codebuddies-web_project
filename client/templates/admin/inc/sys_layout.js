Template.sysLayout.onCreated(function() {
  var title = "Administrative Area | CodeBuddies";
  DocHead.setTitle(title);

  // Make sure these subscriptions work
  this.subscribe("allUsers");
  this.subscribe("archivedUsers");
  this.subscribe("allNotifications"); // Add if missing
});
