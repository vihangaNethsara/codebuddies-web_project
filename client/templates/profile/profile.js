Template.profile.onCreated(function() {
  var username = FlowRouter.getParam("name");
  var userId = FlowRouter.getParam("userId");
  var title = username + " | Profile";
  DocHead.setTitle(title);

  // Subscribe to user data to ensure getUserDetails method has access to the user
  this.autorun(() => {
    this.subscribe("userStatus");
    this.subscribe("userProfile", userId);
    // Also subscribe to current user data if logged in
    if (Meteor.userId()) {
      this.subscribe("currentUserData");
    }
  });
});

Template.profile.helpers({
  userInfo: function() {
    var userId = FlowRouter.getParam("userId");
    console.log("Getting user details for userId:", userId);

    // Try ReactiveMethod first
    var reactiveResult = ReactiveMethod.call("getUserDetails", userId);
    console.log("ReactiveMethod result:", reactiveResult);

    // Fallback to direct subscription data if ReactiveMethod doesn't work
    if (!reactiveResult) {
      var directResult = Meteor.users.findOne(userId);
      console.log("Direct subscription result:", directResult);
      return directResult;
    }

    return reactiveResult;
  },
  hangoutsJoinedCount: function() {
    var userId = FlowRouter.getParam("userId");
    return ReactiveMethod.call("getHangoutsJoinedCount", userId);
  },
  editMode: function() {
    return Session.get("editMode");
  },
  isCurrentUserProfile: function(currentUser) {
    return currentUser && currentUser._id == FlowRouter.getParam("userId");
  }
});

Template.profile.events({
  "click .editProfile": function() {
    Session.set("editMode", true);
  },
  "click #cancelProfileEdit": function() {
    Session.set("editMode", false);
  },
  "click .downloadData": function() {
    const csvString = Papa.unparse(Meteor.users.find({}).fetch()); // unparse generates CSV from your Object
    const a = document.createElement("a"); // create a simple link to a resource where your payload is your encoded CSV
    a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csvString)}`;
    a.download = "my_codebuddies_data.csv";
    a.click();
  },
  "click .loadConversation": function() {
    const data = {
      userId: FlowRouter.getParam("userId")
    };
    Meteor.call("conversation.getId", data, function(error, result) {
      if (error) {
        console.log("error", error);
      }
      if (result) {
        FlowRouter.go(`/conversation/${result}`);
      }
    });
  }
});
