import { Template } from "meteor/templating";
import { ReactiveVar } from "meteor/reactive-var";
import { Meteor } from "meteor/meteor";
import "./report-problem.html";

// Main template helpers and events
Template.reportProblem.onCreated(function() {
  const instance = this;
  instance.showSuccess = new ReactiveVar(false);

  // Subscribe to user's problem reports - wait for auth to be ready
  instance.autorun(function() {
    // CRITICAL FIX: Skip while logging in to prevent reactive loops
    if (Meteor.loggingIn()) {
      return;
    }

    // Only subscribe if user is authenticated
    const userId = Meteor.userId() || (UserManager && UserManager.getUserId());
    if (userId) {
      instance.subscribe("problemReports");
    }
  });
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
    // CRITICAL FIX: Don't call reactive functions while logging in
    if (Meteor.loggingIn()) {
      return null;
    }

    // Use fallback pattern for dual auth system
    return Meteor.user() || (typeof UserManager !== "undefined" && UserManager.currentUser()) || null;
  },

  getUserFullName: function() {
    // CRITICAL FIX: Don't call reactive functions while logging in
    if (Meteor.loggingIn()) {
      return "Loading...";
    }

    // Use fallback pattern for dual auth system
    const user = Meteor.user() || (typeof UserManager !== "undefined" && UserManager.currentUser()) || null;
    if (user && user.profile) {
      return user.profile.name || user.profile.displayName || user.username || "Anonymous User";
    }
    return "Anonymous User";
  },

  getUserEmail: function() {
    // CRITICAL FIX: Don't call reactive functions while logging in
    if (Meteor.loggingIn()) {
      return "Loading...";
    }

    // Use fallback pattern for dual auth system
    const user = Meteor.user() || (typeof UserManager !== "undefined" && UserManager.currentUser()) || null;
    if (user && user.emails && user.emails.length > 0) {
      return user.emails[0].address;
    }
    if (user && user.email) {
      return user.email; // Custom auth user might have email directly
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

    template.isSubmitting.set(true);

    // This is what actually sends data to the database
    const formData = {
      problemType: event.target.problemType.value,
      problemDescription: event.target.problemDescription.value,
      systemInfo: event.target.systemInfo.value,
      priority: event.target.priority.value,
      sessionToken: Session.get("userSessionToken"), // Support dual auth
      attachedFiles: template.uploadedFiles.get()
    };

    // Call the Meteor method to insert into database
    Meteor.call("problemReports.insert", formData, function(error, result) {
      template.isSubmitting.set(false);

      if (error) {
        sAlert.error("Failed to submit report: " + error.reason);
      } else {
        sAlert.success("Report submitted successfully!");
        $("#reportProblemModal").modal("hide");

        // Reset form
        event.target.reset();
        template.uploadedFiles.set([]);

        // Show success message on main page
        Template.instance().showSuccess.set(true);
        setTimeout(function() {
          Template.instance().showSuccess.set(false);
        }, 5000);
      }
    });
  },

  'click .close, click [data-dismiss="modal"]': function(event, template) {
    // Reset form when modal is closed
    template.uploadedFiles.set([]);
    template.isSubmitting.set(false);
  }
});
