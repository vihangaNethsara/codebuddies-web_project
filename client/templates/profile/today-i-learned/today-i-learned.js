Template.profileTodayILearned.onCreated(function() {
  var instance = this;

  // Initialize reactive variables
  instance.loaded = new ReactiveVar(0);
  instance.limit = new ReactiveVar(5);

  instance.autorun(function() {
    // Get the limit
    var limit = instance.limit.get();
    var userId = FlowRouter.getParam("userId");

    // Only subscribe if we have a valid userId
    if (!userId) {
      console.log("No userId found, skipping TodayILearned subscription");
      return;
    }

    console.log("Asking for " + limit + " TodayILearned entries for user:", userId);

    // Subscribe to the todayILearnedByUserId publication
    var subscription = instance.subscribe("todayILearnedByUserId", limit, userId);

    // If subscription is ready, set limit to newLimit
    if (subscription.ready()) {
      console.log("> Received " + limit + " TodayILearned entries. \n\n");
      instance.loaded.set(limit);
    } else {
      console.log("> TodayILearned subscription is not ready yet. \n\n");
    }
  });

  instance.todayILearnedForUser = function() {
    return TodayILearned.find(
      {},
      {
        limit: instance.loaded.get(),
        sort: { created_at: -1 }
      }
    );
  };
});

Template.profileTodayILearned.helpers({
  todayILearnedEntries: function() {
    return Template.instance().todayILearnedForUser();
  },
  hasMoreTodayILearned: function() {
    return (
      Template.instance()
        .todayILearnedForUser()
        .count() >= Template.instance().limit.get()
    );
  }
});

Template.profileTodayILearned.events({
  "click #load-more-til": function(event, instance) {
    event.preventDefault();

    // Get current value for limit
    var limit = instance.limit.get();

    // Increase limit by 5 and update it
    limit += 5;
    instance.limit.set(limit);
  }
});

Template.todayILearnedItem.helpers({
  canEdit: function() {
    // User can edit their own entries
    return this.userId === Meteor.userId();
  },
  formatDate: function(date) {
    if (!date) return "";
    return moment(date).format("MMM DD, YYYY");
  },
  formatTime: function(date) {
    if (!date) return "";
    return moment(date).format("h:mm A");
  }
});

Template.todayILearnedItem.events({
  "click .edit-til": function(event, template) {
    event.preventDefault();
    var entryId = $(event.currentTarget).data("id");
    var currentTitle = this.title;

    swal({
      title: "Edit Today I Learned",
      input: "textarea",
      inputValue: currentTitle,
      inputPlaceholder: "What did you learn?",
      showCancelButton: true,
      confirmButtonText: "Save",
      cancelButtonText: "Cancel",
      inputValidator: function(value) {
        return new Promise(function(resolve, reject) {
          if (value.trim()) {
            resolve();
          } else {
            resolve("Please enter what you learned");
          }
        });
      }
    }).then(function(result) {
      if (result.value) {
        Meteor.call(
          "editTodayILearned",
          {
            entryId: entryId,
            title: result.value.trim()
          },
          function(error, result) {
            if (error) {
              swal("Error", "Failed to update entry: " + error.message, "error");
            } else {
              swal("Success", "Entry updated successfully!", "success");
            }
          }
        );
      }
    });
  },

  "click .delete-til": function(event, template) {
    event.preventDefault();
    var entryId = $(event.currentTarget).data("id");

    swal({
      title: "Delete Today I Learned Entry?",
      text: "This action cannot be undone.",
      type: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel"
    }).then(function(result) {
      if (result.value) {
        Meteor.call("deleteTodayILearned", entryId, function(error, result) {
          if (error) {
            swal("Error", "Failed to delete entry: " + error.message, "error");
          } else {
            swal("Deleted!", "Entry has been deleted.", "success");
          }
        });
      }
    });
  }
});
