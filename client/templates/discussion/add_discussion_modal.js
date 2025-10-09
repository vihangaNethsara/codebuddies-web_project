import discussion_tags from "/imports/data/discussion_tags.js";
import slack_channels from "/imports/data/slack_channels.js";

Template.addDiscussionModal.onCreated(function() {
  const instance = this;
  instance.processing = new ReactiveVar(false);
  instance.discussionDescriptionPreview = new ReactiveVar("");
  console.log(discussion_tags.length);
  Meteor.setTimeout(function() {
    const tags = discussion_tags;
    instance.$(".discussion-tags-multiple", tags).select2({
      placeholder: "Tags (required)",
      data: tags,
      tags: false,
      tokenSeparators: [","],
      allowClear: true
    });

    const channels = slack_channels;
    instance.$(".slack-channel", channels).select2({
      placeholder: "Channel (optional)",
      data: channels,
      tags: false,
      allowClear: true
    });
  }, 500);
});

Template.addDiscussionModal.helpers({
  processing: function() {
    return Template.instance().processing.get();
  },
  discussionDescriptionPreview: function() {
    return Template.instance().discussionDescriptionPreview.get();
  }
});

Template.addDiscussionModal.events({
  "change #discussionDescription": function(event, template) {
    event.preventDefault();
    template.discussionDescriptionPreview.set($.trim(template.find("#discussionDescription").value));
  },
  "submit .addDiscussion": function(event, template) {
    event.preventDefault();

    // Reset form styling
    $(".form-control").css({ border: "1px solid #cccccc" });
    $(".select2-container").css({ border: "none" });

    // Validation
    if ($.trim(template.find("#discussionTopic").value) == "") {
      $("#discussionTopic").css({ border: "#FF0000 1px solid" });
      return Bert.alert("Please enter a discussion topic", "warning", "growl-top-right");
    }

    if (!$(".discussion-tags-multiple").val() || $(".discussion-tags-multiple").val().length < 1) {
      $(".discussion-tags-multiple")
        .parent()
        .find(".select2-container")
        .css({ border: "#FF0000 1px solid" });
      return Bert.alert("Please select at least one tag", "warning", "growl-top-right");
    }

    if ($.trim(template.find("#discussionDescription").value) == "") {
      $("#discussionDescription").css({ border: "#FF0000 1px solid" });
      return Bert.alert("Please enter a description for your discussion", "warning", "growl-top-right");
    }

    // Prepare data
    const data = {
      topic: $.trim(template.find("#discussionTopic").value),
      description: $.trim(template.find("#discussionDescription").value),
      groupId: this._id,
      groupTitle: this.title,
      groupSlug: this.slug,
      tags: $(".discussion-tags-multiple").val(),
      channel: $(".slack-channel").val() || "#announcements"
    };

    console.log("Creating discussion with data:", data);
    template.processing.set(true);

    Meteor.call("discussions.insert", data, function(error, result) {
      if (error) {
        template.processing.set(false);
        console.error("Discussion creation error:", error);
        Bert.alert(error.reason || error.message || "Failed to create discussion", "danger", "growl-top-right");
      }
      if (result) {
        template.processing.set(false);
        Bert.alert("Discussion Created!", "success", "growl-top-right");

        // Clear form fields
        template.find("#discussionTopic").value = "";
        template.find("#discussionDescription").value = "";
        $(".discussion-tags-multiple")
          .val(null)
          .trigger("change");
        $(".slack-channel")
          .val(null)
          .trigger("change");
        template.discussionDescriptionPreview.set("");

        Modal.hide();

        // The discussion will automatically appear due to Meteor's reactivity
        // But we can scroll to top to make it more visible since newest discussions appear first
        setTimeout(function() {
          window.scrollTo(0, 0);
        }, 100);
      }
    });
  }
});
