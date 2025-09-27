import { Template } from "meteor/templating";
import { ReactiveVar } from "meteor/reactive-var";
import { Meteor } from "meteor/meteor";
import "./report-problem.html";

// Main template helpers and events
Template.reportProblem.onCreated(function() {
  this.showSuccess = new ReactiveVar(false);
});

Template.reportProblem.helpers({
  showSuccess() {
    return Template.instance().showSuccess.get();
  }
});

Template.reportProblem.events({
  "click .open-report-modal"(event, instance) {
    event.preventDefault();
    $("#reportProblemModal").modal("show");
  }
});

// Modal template helpers and events
Template.reportProblemModal.onCreated(function() {
  this.isSubmitting = new ReactiveVar(false);
  this.uploadedFiles = new ReactiveVar([]);
});

Template.reportProblemModal.helpers({
  isSubmitting() {
    return Template.instance().isSubmitting.get();
  },

  uploadedFiles() {
    return Template.instance().uploadedFiles.get();
  },

  getUserEmail() {
    const user = Meteor.user();
    if (user && user.emails && user.emails.length > 0) {
      return user.emails[0].address;
    }
    return "No email available";
  },

  getUserFullName() {
    const user = Meteor.user();
    if (user && user.profile) {
      const firstName = user.profile.firstname || "";
      const lastName = user.profile.lastname || "";
      return `${firstName} ${lastName}`.trim() || "No name available";
    }
    return "No name available";
  },

  getSystemInfo() {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const language = navigator.language;
    const screenRes = `${screen.width}x${screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return `Browser: ${userAgent}
Platform: ${platform}
Language: ${language}
Screen Resolution: ${screenRes}
Timezone: ${timezone}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}`;
  }
});

Template.reportProblemModal.events({
  "change #fileUpload"(event, instance) {
    const files = event.target.files;
    const fileArray = [];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const maxFiles = 3;

    if (files.length > maxFiles) {
      alert(`You can only upload up to ${maxFiles} files.`);
      event.target.value = "";
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.size > maxSize) {
        alert(`File "${file.name}" is too large. Maximum size is 5MB.`);
        event.target.value = "";
        return;
      }

      fileArray.push({
        name: file.name,
        size: `${(file.size / 1024).toFixed(2)} KB`,
        type: file.type
      });
    }

    instance.uploadedFiles.set(fileArray);
  },

  "submit .report-problem-form"(event, instance) {
    event.preventDefault();

    if (instance.isSubmitting.get()) {
      return;
    }

    const form = event.target;
    const formData = new FormData(form);

    // Get form values
    const problemType = formData.get("problemType");
    const problemDescription = formData.get("problemDescription").trim();
    const systemInfo = formData.get("systemInfo");
    const priority = formData.get("priority");
    const files = form.fileUpload.files;

    // Validation
    if (!problemType) {
      alert("Please select a problem type.");
      return;
    }

    if (!problemDescription || problemDescription === "Hello Admin, I need help with...") {
      alert("Please describe your problem.");
      return;
    }

    instance.isSubmitting.set(true);

    // Prepare report data
    const user = Meteor.user();
    const reportData = {
      problemType: problemType,
      description: problemDescription,
      systemInfo: systemInfo,
      priority: priority,
      timestamp: new Date(),
      userId: Meteor.userId(),
      userInfo: {
        username: user.username || "Unknown",
        email: user.emails && user.emails[0] ? user.emails[0].address : "No email",
        name: user.profile ? `${user.profile.firstname || ""} ${user.profile.lastname || ""}`.trim() : "No name"
      }
    };

    // Handle file uploads (for now, just log file info)
    if (files.length > 0) {
      reportData.attachments = [];
      for (let i = 0; i < files.length; i++) {
        reportData.attachments.push({
          name: files[i].name,
          size: files[i].size,
          type: files[i].type
        });
      }
    }

    // Log the report to console
    console.log("=== PROBLEM REPORT SUBMITTED ===");
    console.log("Report ID:", `RPT-${Date.now()}`);
    console.log("User:", reportData.userInfo.name, `(${reportData.userInfo.email})`);
    console.log("Username:", reportData.userInfo.username);
    console.log("Problem Type:", reportData.problemType);
    console.log("Priority:", reportData.priority);
    console.log("Description:", reportData.description);
    console.log("System Info:", reportData.systemInfo);
    if (reportData.attachments) {
      console.log("Attachments:", reportData.attachments.length, "files");
      reportData.attachments.forEach((file, index) => {
        console.log(`  File ${index + 1}:`, file.name, `(${(file.size / 1024).toFixed(2)} KB)`);
      });
    }
    console.log("Submitted at:", reportData.timestamp.toISOString());
    console.log("================================");

    // Simulate API delay
    Meteor.setTimeout(() => {
      instance.isSubmitting.set(false);
      $("#reportProblemModal").modal("hide");

      // Show success message in parent template
      const reportTemplate = Template.instance().view.parentView?.templateInstance();
      if (reportTemplate && reportTemplate.showSuccess) {
        reportTemplate.showSuccess.set(true);

        // Auto-hide success message after 5 seconds
        Meteor.setTimeout(() => {
          reportTemplate.showSuccess.set(false);
        }, 5000);
      }

      // Reset form
      form.reset();
      instance.uploadedFiles.set([]);
      $("#problemDescription").val("Hello Admin, I need help with...");
    }, 2000); // 2-second delay to simulate API call
  }
});
