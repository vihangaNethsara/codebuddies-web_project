Template.header.onRendered(function() {
  this.subscribe("attendees", 10);
  this.subscribe("conversationsForCurrentUser");
});
Template.header.helpers({
  user: function() {
    return Meteor.user();
  },
  notificationCount: function() {
    return ReactiveMethod.call("notificationCount");
  },
  userNotificationCount: function() {
    return RSVPnotifications.find({ createorId: Meteor.userId(), seen: false }).count();
  },
  unreadConversationCount() {
    return Conversations.find({ "participants.id": Meteor.userId(), read_by: { $ne: Meteor.userId() } }).count();
    // const counter = Conversations.find(
    //   {"participants.id": Meteor.userId(), read_by: { $ne: Meteor.userId() }}
    // ).count()
    // console.log(counter);
  }
});

Template.header.events({
  "click .signInSlack": function(event) {
    var options = {
      requestPermissions: ["identity.basic", "identity.email"]
    };
    Meteor.loginWithSlack(options, function() {
      FlowRouter.go("hangouts");
    });
  },
  "click #signOut": function(event) {
    Meteor.logout(function(err) {
      FlowRouter.go("home");
    });
  },
  "click #newHangout": function(event) {
    Modal.show("createHangoutModal");
  },
  "click #newStudyGroup": function(event) {
    Modal.show("newStudyGroupModal");
  },
  "click #newDiscussion"(event, template) {
    const data = {
      _id: "CB",
      title: "CB",
      slug: "CB"
    };

    Modal.show("addDiscussionModal", data);
  },
  "click .signInGithub": function(event) {
    var options = { requestPermissions: ["user:email"] };

    Meteor.loginWithGithub(options, error => {
      if (error) {
        console.error(error.reason);
        return;
      }
      FlowRouter.go("hangouts");
    });
  }
});

// In your header.js file, add:
Template.header.events({
  "click #signOut": function(e) {
    e.preventDefault();

    // Check if it's a custom user
    if (UserManager.isLoggedIn()) {
      UserManager.logout(function() {
        FlowRouter.go("/");
      });
    } else {
      // Your existing logout logic for Meteor.logout()
      Meteor.logout();
      FlowRouter.go("/");
    }
  }
});
