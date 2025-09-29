import { Template } from "meteor/templating";
import { ReactiveVar } from "meteor/reactive-var";
import { Meteor } from "meteor/meteor";
import "./report-problem.html";

// Main template helpers and events
Template.reportProblem.onCreated(function() {
  this.showSuccess = new ReactiveVar(false);

  // Subscribe to user's problem reports
  this.subscribe("problemReports");
});

Template.reportProblem.helpers({
  showSuccess: function() {
    return Template.instance().showSuccess.get();
  }
});

Template.reportProblem.events({
  "click .open-report-modal": function(event, template) {
    $("#reportProblemModal").modal("show");
  }
});

// Modal template helpers and events
Template.reportProblemModal.onCreated(function() {
  this.isSubmitting = new ReactiveVar(false);
  this.uploadedFiles = new ReactiveVar([]);
});

Template.reportProblemModal.helpers({
  currentUser: function() {
    return Meteor.user();
  },

  getUserFullName: function() {
    const user = Meteor.user();
    if (user && user.profile) {
      return user.profile.name || user.username || "Anonymous User";
    }
    return "Anonymous User";
  },

  getUserEmail: function() {
    const user = Meteor.user();
    if (user && user.emails && user.emails.length > 0) {
      return user.emails[0].address;
    }
    return "No email provided";
  },

  getSystemInfo: function() {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const language = navigator.language;
    const screenRes = screen.width + "x" + screen.height;

    return `Browser: ${userAgent}\nPlatform: ${platform}\nLanguage: ${language}\nScreen Resolution: ${screenRes}\nTimezone: ${
      Intl.DateTimeFormat().resolvedOptions().timeZone
    }`;
  },

  isSubmitting: function() {
    return Template.instance().isSubmitting.get();
  },

  uploadedFiles: function() {
    return Template.instance().uploadedFiles.get();
  }
});

Template.reportProblemModal.events({
  "change #fileUpload": function(event, template) {
    const files = event.target.files;
    const fileList = [];

    for (let i = 0; i < files.length && i < 3; i++) {
      const file = files[i];
      if (file.size <= 5 * 1024 * 1024) {
        // 5MB limit
        fileList.push({
          name: file.name,
          size: (file.size / 1024).toFixed(1) + " KB",
          type: file.type
        });
      }
    }

    template.uploadedFiles.set(fileList);
  },

  "submit .report-problem-form": function(event, template) {
    event.preventDefault();

    // This is what actually sends data to the database
    const formData = {
      problemType: event.target.problemType.value,
      problemDescription: event.target.problemDescription.value,
      systemInfo: event.target.systemInfo.value,
      priority: event.target.priority.value,
      attachedFiles: template.uploadedFiles.get()
    };

    // Call the Meteor method to insert into database
    Meteor.call("problemReports.insert", formData, function(error, result) {
      if (error) {
        sAlert.error("Failed to submit report");
      } else {
        sAlert.success("Report submitted successfully!");
      }
    });
  },

  'click .close, click [data-dismiss="modal"]': function(event, template) {
    // Reset form when modal is closed
    template.uploadedFiles.set([]);
    template.isSubmitting.set(false);
  }
});
