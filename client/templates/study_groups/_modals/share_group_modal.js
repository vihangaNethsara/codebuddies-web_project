import { Template } from "meteor/templating";
import { Meteor } from "meteor/meteor";
import { $ } from "meteor/jquery";

import "./share_group_modal.html";

Template.share_group_modal.onRendered(function() {
  const instance = this;
  const group = StudyGroups.findOne(FlowRouter.getParam("_id"));
  const url = window.location.href;

  instance.$(".input-link").val(url);

  // If native share is available, show native button
  if (!navigator.share) {
    instance.$(".share-native").hide();
  }
});

Template.share_group_modal.events({
  "click .modal-close"(e) {
    e.preventDefault();
    $(".modal-backdrop").remove();
  },

  "click .copy-link, click .copy-inline"(e, instance) {
    e.preventDefault();
    const input = instance.$(".input-link")[0];
    if (!input) return;

    input.select();
    try {
      document.execCommand("copy");
      showToast("Link copied to clipboard!", "success");
      logActivity(FlowRouter.getParam("_id"), "share", { method: "clipboard" });
    } catch (err) {
      // fallback to navigator clipboard
      navigator.clipboard &&
        navigator.clipboard
          .writeText(input.value)
          .then(() => {
            showToast("Link copied to clipboard!", "success");
          })
          .catch(() => showToast("Failed to copy link", "error"));
    }
  },

  "click .share-native"(e) {
    e.preventDefault();
    const group = StudyGroups.findOne(FlowRouter.getParam("_id"));
    if (!group) return;

    const shareData = {
      title: group.title,
      text: group.tagline || `Check out ${group.title} on CodeBuddies`,
      url: window.location.href
    };

    navigator.share &&
      navigator
        .share(shareData)
        .then(() => {
          showToast("Shared successfully!", "success");
          logActivity(FlowRouter.getParam("_id"), "share", { method: "native" });
          $(".modal-backdrop").remove();
        })
        .catch(err => {
          showToast("Unable to share: " + (err.message || ""), "error");
        });
  },

  "click .social-btn"(e) {
    e.preventDefault();
    const platform = $(e.currentTarget).data("platform");
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(document.title || "Check this out");

    let shareUrl = "";
    switch (platform) {
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case "linkedin":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank", "noopener");
      logActivity(FlowRouter.getParam("_id"), "share", { method: platform });
    }
  }
});
