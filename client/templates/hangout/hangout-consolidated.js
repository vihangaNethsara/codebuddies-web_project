// Hangout Application - Consolidated JavaScript for Meteor
import QuillEditor from "../../libs/QuillEditor";

// Main Hangout Template
Template.hangout.onCreated(function() {
  let instance = this;
  var title = "CodeBuddies | Hangout";
  DocHead.setTitle(title);
  instance.subscribe("hangoutById", FlowRouter.getParam("hangoutId"));
});

Template.hangout.helpers({
  formatDescription: ({ description_in_quill_delta, description }) => {
    if (description_in_quill_delta) {
      return QuillEditor.generateHTMLForDeltas(description_in_quill_delta);
    } else {
      return description;
    }
  },
  hangout: function() {
    return Hangouts.findOne({ _id: FlowRouter.getParam("hangoutId") });
  },
  encodedText: function(str) {
    return encodeURIComponent(str);
  }
});

Template.hangout.events({
  "click #hide-sidebar": function() {
    $(".hangout-sidebar").hide();
    $(".hangout-body")
      .removeClass("col-md-9")
      .addClass("col-md-10 col-md-offset-1");
    $("#show-sidebar").fadeIn();
  },
  "click #show-sidebar": function() {
    $(".hangout-sidebar").show();
    $(".hangout-body")
      .removeClass("col-md-10 col-md-offset-1")
      .addClass("col-md-9");
    $("#show-sidebar").hide();
  },
  "click .join-hangout": function() {
    const data = {
      hangoutId: this._id,
      hostId: this.host.id
    };
    Meteor.call("addUserToHangout", data, function(error, result) {
      if (result) {
        swal({
          title: TAPi18n.__("you_are_awesome"),
          text: TAPi18n.__("looking_forward_to_see_you"),
          confirmButtonText: TAPi18n.__("ok"),
          type: "info"
        });
      }
    });
  },
  "click #leave-hangout": function() {
    if (this.host.id == Meteor.userId()) {
      swal({
        title: TAPi18n.__("remove_owner_from_hangout"),
        confirmButtonText: TAPi18n.__("ok"),
        type: "warning"
      });
    } else {
      const data = {
        hangoutId: this._id,
        hostId: this.host.id
      };
      Meteor.call("removeUserFromHangout", data, function(error, result) {
        if (result) console.log("removed");
      });
    }
  },
  "click #hangout-faq-popup": function() {
    Modal.show("hangoutFAQModal");
  }
});

// Hangout Cards Template
Template.hangoutCards.onCreated(function() {
  var instance = this;
  instance.limit = new ReactiveVar(12);
  instance.flag = new ReactiveVar(false);

  instance.autorun(function() {
    var limit = instance.limit.get();
    instance.subscribe("hangouts", limit);
  });

  instance.loadHangouts = function(flag = 1) {
    return Hangouts.find({}, { sort: { start: flag } });
  };

  const now = new Date();
  instance.liveHangoutsCount = function() {
    return Hangouts.find({ end: { $gte: now } }).count() || 0;
  };

  instance.pastHangoutsCount = function() {
    return Hangouts.find({ end: { $lt: now } }).count() || 0;
  };

  instance.addMoreHangouts = function() {
    if (Hangouts.find().count() === instance.limit.get()) {
      instance.limit.set(instance.limit.get() + 9);
    } else {
      if (Hangouts.find().count() < instance.limit.get()) {
        instance.flag.set(true);
      }
    }
  };
});

Template.hangoutCards.helpers({
  hangouts: function(flag) {
    return Template.instance().loadHangouts(flag);
  },
  status: function() {
    return Template.instance().flag.get();
  },
  liveHangoutsCount: function() {
    return Template.instance().liveHangoutsCount();
  },
  pastHangoutsCount: function() {
    return Template.instance().pastHangoutsCount();
  }
});

Template.hangoutCards.events({
  "click #loadMore": function(event, template) {
    template.addMoreHangouts();
  }
});

// Create Hangout Modal
Template.createHangoutModal.onCreated(function() {
  this.subscribe("myStudyGroups");
});

Template.createHangoutModal.onRendered(function() {
  var start = this.$("#start-date-time-picker");
  var templateInstance = Template.instance();
  var editorHostElement = templateInstance.$("[data-editor-host]").get(0);

  templateInstance.editor = QuillEditor.createEditor({
    container: editorHostElement
  });

  start.datetimepicker({
    ignoreReadonly: true,
    widgetPositioning: { horizontal: "auto", vertical: "bottom" },
    minDate: new Date()
  });

  $("#d1,#d2,#d3").hide();

  $("#sId").hover(
    function() {
      $("#d1").show();
    },
    function() {
      $("#d1").hide();
    }
  );

  $("#tId").hover(
    function() {
      $("#d2").show();
    },
    function() {
      $("#d2").hide();
    }
  );

  $("#cId").hover(
    function() {
      $("#d3").show();
    },
    function() {
      $("#d3").hide();
    }
  );

  const instance = this;
  instance.studyGroupId = FlowRouter.getParam("studyGroupId");
  instance.autorun(() => {
    let roles = Meteor.user().roles;
    let studyGroupsKeys = [];
    Object.entries(roles).forEach(([key, value]) => {
      if (value.includes("owner") || value.includes("admin") || (value.includes("moderator") && key !== "CB")) {
        studyGroupsKeys.push(key);
      } else if (value.includes("member") && key !== "CB") {
        if (StudyGroups.findOne({ _id: key }) && StudyGroups.findOne({ _id: key }).exempt_from_default_permission) {
          studyGroupsKeys.push(key);
        }
      }
    });

    let studyGroups = [{ id: "CB", text: "CodeBuddies Default" }];
    StudyGroups.find({ _id: { $in: studyGroupsKeys } }).forEach(sg => {
      studyGroups.push({ id: sg._id, text: sg.title });
    });

    Meteor.setTimeout(function() {
      instance.$(".study-group-single", studyGroups).select2({
        placeholder: "Select a group you organize",
        data: studyGroups
      });

      if (typeof instance.studyGroupId !== "undefined" && instance.studyGroupId !== "") {
        instance
          .$(".study-group-single")
          .val(instance.studyGroupId)
          .trigger("change");
      }
    }, 1500);
  });
});

Template.createHangoutModal.events({
  "click input#external-checkbox": function(event) {
    $("#external-fields").toggle();
  },
  "click #create-hangout": function(e, template) {
    const templateInstance = template;
    const topic = $("#topic").val();
    const description = QuillEditor.generatePlainTextFromDeltas(templateInstance.editor.getContents());
    const description_in_quill_delta = templateInstance.editor.getContents();
    const start = $("#start-date-time").val();
    const startDate = new Date(start);
    const duration = Number($("#end-date-time").val()) || 1440;
    const end = new Date(startDate.getTime() + 1000 * 60 * duration);
    const groupId = $(".study-group-single").val();
    const externalCheckbox = $('input[name="externalCheckbox"]').prop("checked");
    const externalButtonText = $('input[name="externalButtonText"]').val();
    const externalURL = $('input[name="externalURL"]').val();
    const type = $('input[name="hangout-type"]:checked').val();

    const data = {
      topic: topic,
      slug: topic.replace(/\s+/g, "-").toLowerCase(),
      description: description,
      description_in_quill_delta: description_in_quill_delta,
      start: new Date(start),
      end: end,
      duration: duration,
      type: type,
      groupId: groupId,
      externalCheckbox: externalCheckbox,
      externalButtonText: externalButtonText,
      externalURL: externalURL,
      // Include session token for custom auth support
      sessionToken: Session.get("userSessionToken")
    };

    if ($.trim(start) == "") {
      swal({ title: TAPi18n.__("select_start_time"), confirmButtonText: TAPi18n.__("ok"), type: "error" });
      return;
    }
    if ($.trim(topic) == "") {
      $("#topic").focus();
      swal({ title: TAPi18n.__("enter_topic"), confirmButtonText: TAPi18n.__("ok"), type: "error" });
      return;
    }
    if ($.trim(description) == "") {
      swal({ title: TAPi18n.__("enter_description"), confirmButtonText: TAPi18n.__("ok"), type: "error" });
      return;
    }
    if ($.trim(groupId) == "") {
      $(".study-group-single").focus();
      swal({ title: TAPi18n.__("select_study_group"), confirmButtonText: TAPi18n.__("ok"), type: "error" });
    }
    if (externalCheckbox == true && $.trim(externalButtonText) == "") {
      $("#externalButtonText").focus();
      swal({ title: TAPi18n.__("external_button_text"), confirmButtonText: TAPi18n.__("ok"), type: "error" });
      return;
    }
    if (externalCheckbox == true && $.trim(externalURL) == "") {
      $("#externalURL").focus();
      swal({ title: TAPi18n.__("external_URL"), confirmButtonText: TAPi18n.__("ok"), type: "error" });
      return;
    }

    Meteor.call("createHangout", data, function(err, result) {
      if (result) {
        Modal.hide();
        swal({
          title: TAPi18n.__("hangout_created_title"),
          text: TAPi18n.__("hangout_created_message"),
          confirmButtonText: TAPi18n.__("ok"),
          type: "success",
          closeOnConfirm: true
        });
        FlowRouter.go("hangouts");
      } else {
        console.log(err);
      }
    });
  }
});

// Edit Hangout Modal
Template.editHangoutModal.rendered = function() {
  var templateInstance = Template.instance();
  var editorHostElement = templateInstance.$("[data-editor-host]").get(0);
  var start = this.$("#start-date-time-picker");

  templateInstance.editor = QuillEditor.createEditor({
    container: editorHostElement
  });

  templateInstance.editor.setContents(
    templateInstance.data.hangout.data.description_in_quill_delta || templateInstance.data.hangout.data.description
  );

  start.datetimepicker({ ignoreReadonly: true });

  const external_fields = $("#external-fields");
  if ($("input#external-checkbox").is(":checked") === true) {
    external_fields.show();
  } else {
    external_fields.hide();
  }
};

Template.editHangoutModal.events({
  "click input#external-checkbox": function(event) {
    $("#external-fields").toggle();
  },
  "click #edit-hangout": function() {
    var templateInstance = Template.instance();
    const topic = $("#topic").val();
    const description = QuillEditor.generatePlainTextFromDeltas(templateInstance.editor.getContents());
    const description_in_quill_delta = templateInstance.editor.getContents();
    const start = $("#start-date-time").val();
    const startDate = new Date(start);
    const duration = Number($("#end-date-time").val()) || 1440;
    const end = new Date(startDate.getTime() + 1000 * 60 * duration);
    const type = $('input[name="hangout-type"]:checked').val();
    const externalCheckbox = $('input[name="externalCheckbox"]').prop("checked");
    const externalButtonText = $('input[name="externalButtonText"]').val();
    const externalURL = $('input[name="externalURL"]').val();

    const data = {
      topic: topic,
      slug: topic.replace(/\s+/g, "-").toLowerCase(),
      description: description,
      description_in_quill_delta: description_in_quill_delta,
      start: new Date(start),
      end: new Date(end),
      duration: duration,
      type: type,
      hangoutId: Session.get("hangoutId"),
      externalCheckbox: externalCheckbox,
      externalButtonText: externalButtonText,
      externalURL: externalURL
    };

    Meteor.call("editHangout", data, function(err, result) {
      if (result) {
        Modal.hide();
        swal({
          title: TAPi18n.__("hangout_edited_title"),
          text: TAPi18n.__("hangout_created_message"),
          confirmButtonText: TAPi18n.__("ok"),
          type: "success",
          closeOnConfirm: true
        });
      }
    });
  }
});

// Clone Hangout Modal
Template.cloneHangoutModal.onCreated(function() {
  this.subscribe("myStudyGroups");
});

Template.cloneHangoutModal.onRendered(function() {
  var templateInstance = Template.instance();
  var editorHostElement = templateInstance.$("[data-editor-host]").get(0);
  var start = this.$("#start-date-time-picker");

  templateInstance.editor = QuillEditor.createEditor({
    container: editorHostElement
  });

  templateInstance.editor.setContents(
    templateInstance.data.hangout.data.description_in_quill_delta || templateInstance.data.hangout.data.description
  );

  start.datetimepicker({
    ignoreReadonly: true,
    widgetPositioning: { horizontal: "auto", vertical: "bottom" },
    minDate: new Date()
  });

  const external_fields = $("#external-fields");
  if ($("input#external-checkbox").is(":checked") === true) {
    external_fields.show();
  } else {
    external_fields.hide();
  }

  const instance = this;
  instance.autorun(() => {
    let roles = Meteor.user().roles;
    let studyGroupsKeys = [];
    Object.entries(roles).forEach(([key, value]) => {
      if (value.includes("owner") || value.includes("admin") || (value.includes("moderator") && key !== "CB")) {
        studyGroupsKeys.push(key);
      } else if (value.includes("member") && key !== "CB") {
        if (StudyGroups.findOne({ _id: key }) && StudyGroups.findOne({ _id: key }).exempt_from_default_permission) {
          studyGroupsKeys.push(key);
        }
      }
    });

    let studyGroups = [{ id: "CB", text: "CodeBuddies Default" }];
    StudyGroups.find({ _id: { $in: studyGroupsKeys } }).forEach(sg => {
      studyGroups.push({ id: sg._id, text: sg.title });
    });

    Meteor.setTimeout(function() {
      instance.$(".study-group-single", studyGroups).select2({
        placeholder: "Select a group you organize",
        data: studyGroups
      });

      const groupId = templateInstance.data.hangout.data.group.id || "";
      if (groupId !== "") {
        instance
          .$(".study-group-single")
          .val(groupId)
          .trigger("change");
      }
    }, 1500);
  });
});

Template.cloneHangoutModal.events({
  "click input#external-checkbox": function(event) {
    $("#external-fields").toggle();
  },
  "click #clone-hangout": function(e) {
    var templateInstance = Template.instance();
    const topic = $("#topic").val();
    const description = QuillEditor.generatePlainTextFromDeltas(templateInstance.editor.getContents());
    const description_in_quill_delta = templateInstance.editor.getContents();
    const start = $("#start-date-time").val();
    const startDate = new Date(start);
    const duration = Number($("#end-date-time").val()) || 1440;
    const end = new Date(startDate.getTime() + 1000 * 60 * duration);
    const type = $('input[name="hangout-type"]:checked').val();
    const groupId = $(".study-group-single").val();
    const externalCheckbox = $('input[name="externalCheckbox"]').prop("checked");
    const externalButtonText = $('input[name="externalButtonText"]').val();
    const externalURL = $('input[name="externalURL"]').val();

    const data = {
      topic: topic,
      slug: topic.replace(/\s+/g, "-").toLowerCase(),
      description: description,
      description_in_quill_delta: description_in_quill_delta,
      start: new Date(start),
      end: new Date(end),
      duration: duration,
      type: type,
      groupId: groupId,
      externalCheckbox: externalCheckbox,
      externalButtonText: externalButtonText,
      externalURL: externalURL,
      // Include session token for custom auth support
      sessionToken: Session.get("userSessionToken")
    };

    if ($.trim(start) == "") {
      swal({ title: TAPi18n.__("select_start_time"), confirmButtonText: TAPi18n.__("ok"), type: "error" });
      return;
    }
    if ($.trim(topic) == "") {
      $("#topic").focus();
      swal({ title: TAPi18n.__("enter_topic"), confirmButtonText: TAPi18n.__("ok"), type: "error" });
      return;
    }
    if ($.trim(groupId) == "") {
      $(".study-group-single").focus();
      swal({ title: TAPi18n.__("select_study_group"), confirmButtonText: TAPi18n.__("ok"), type: "error" });
    }
    if ($.trim(description) == "") {
      swal({ title: TAPi18n.__("enter_description"), confirmButtonText: TAPi18n.__("ok"), type: "error" });
      return;
    }

    Meteor.call("createHangout", data, function(err, result) {
      if (result) {
        Modal.hide();
        swal({
          title: TAPi18n.__("hangout_created_title"),
          text: TAPi18n.__("hangout_created_message"),
          confirmButtonText: TAPi18n.__("ok"),
          type: "success",
          closeOnConfirm: true
        });
        FlowRouter.go("hangouts");
      }
    });
  }
});

// Hangout Action Buttons
Template.hangoutActionButtons.helpers({
  icsDownloadLink: function(hangout) {
    const nowDate = new Date();
    const startDate = Blaze._globalHelpers.getHangoutGoogleCalendarDate(hangout.start);
    const startTime = Blaze._globalHelpers.getHangoutGoogleCalendarTime(hangout.start);
    const endDate = Blaze._globalHelpers.getHangoutGoogleCalendarDate(hangout.end);
    const endTime = Blaze._globalHelpers.getHangoutGoogleCalendarTime(hangout.end);
    const currentDate = Blaze._globalHelpers.getHangoutGoogleCalendarDate(nowDate);
    const currentTime = Blaze._globalHelpers.getHangoutGoogleCalendarTime(nowDate);
    const start = `${startDate}T${startTime}`;
    const end = `${endDate}T${endTime}`;
    const current = `${currentDate}T${currentTime}`;
    const SEPARATOR = navigator.appVersion.indexOf("Win") !== -1 ? "\r\n" : "\n";

    let topic = hangout.topic;
    const group = (hangout && hangout.group) || null;
    if (group && group.title) {
      topic += `(${group.title})`;
    }
    const location = `https://meet.jit.si/cb${hangout._id}`;
    const uid = `${Date.now()}@codebuddies.org`;
    const calendarDetails = [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      "CLASS:PUBLIC",
      `DESCRIPTION:${hangout.description}`,
      `DTSTAMP;VALUE=DATE-TIME:${current}`,
      `DTSTART;VALUE=DATE-TIME:${start}`,
      `DTEND;VALUE=DATE-TIME:${end}`,
      `LOCATION:${location}`,
      `URL:${location}`,
      `SUMMARY;LANGUAGE=en-us:${topic}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT"
    ].join(SEPARATOR);
    const calendarEvent = `BEGIN:VCALENDAR${SEPARATOR}PRODID:Calendar${SEPARATOR}VERSION:2.0${SEPARATOR}${calendarDetails}${SEPARATOR}END:VCALENDAR`;
    return `data:text/calendar;charset=utf8,${encodeURIComponent(calendarEvent)}`;
  },
  googleCalendarUrl: function(hangout) {
    const { _id: id, topic, description, group, start, end } = hangout;
    const startDate = Blaze._globalHelpers.getHangoutGoogleCalendarDate(start);
    const startTime = Blaze._globalHelpers.getHangoutGoogleCalendarTime(start);
    const endDate = Blaze._globalHelpers.getHangoutGoogleCalendarDate(end);
    const endTime = Blaze._globalHelpers.getHangoutGoogleCalendarTime(end);
    const groupTitle = group ? `(${group.title})` : "";
    const calendarUrl = `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(
      topic
    )} ${groupTitle}&details=${encodeURIComponent(description)}`;
    const location = `https://meet.jit.si/cb${id}`;
    const dates = `${startDate}T${startTime}/${endDate}T${endTime}`;
    return `${calendarUrl}&location=${location}&dates=${dates}`;
  }
});

Template.hangoutActionButtons.events({
  "click .clone-hangout": function(e, hangout) {
    if (Meteor.userId()) {
      Session.set("hangoutId", hangout.data._id);
      Modal.show("cloneHangoutModal", { hangout });
      $("#clone-hangout-modal input#external-checkbox").prop("checked", hangout.data.externalCheckbox);
      $("#clone-hangout-modal #externalButtonText").val(hangout.data.externalButtonText);
      $("#clone-hangout-modal #externalURL").val(hangout.data.externalURL);
      $("#clone-hangout-modal #topic").val(hangout.data.topic);
      $("#clone-hangout-modal input[value=" + hangout.data.type + "]").prop("checked", true);
    }
  },
  "click .edit-hangout": function(e, hangout) {
    var start_time_reverted = moment(hangout.data.start).format("MM/DD/YYYY h:mm A");
    var hangoutDuration = hangout.data.duration;

    console.log(hangout.data._id + " this is an edited hangout id");
    Session.set("hangoutId", hangout.data._id);
    Modal.show("editHangoutModal", { hangout });
    $("#edit-hangout-modal #topic").val(hangout.data.topic);
    $("#edit-hangout-modal input[value=" + hangout.data.type + "]").prop("checked", true);
    $("#edit-hangout-modal input#external-checkbox").prop("checked", hangout.data.externalCheckbox);
    $("#edit-hangout-modal #externalButtonText").val(hangout.data.externalButtonText);
    $("#edit-hangout-modal #externalURL").val(hangout.data.externalURL);
    $("#edit-hangout-modal #start-date-time").val(start_time_reverted);
    $("#edit-hangout-modal #end-date-time").val(hangoutDuration);
    $("#edit-hangout-modal #group").val(hangout.data.group.title);
  },
  "click .delete-hangout": function(e, hangout) {
    const data = {
      hangoutId: this._id,
      hostId: this.host.id,
      hostUsername: this.host.name
    };

    swal({
      type: "warning",
      title: TAPi18n.__("delete_hangout_confirm"),
      text: TAPi18n.__("delete_hangout_text"),
      cancelButtonText: TAPi18n.__("no_delete_hangout"),
      confirmButtonText: TAPi18n.__("yes_delete_hangout"),
      confirmButtonColor: "#d9534f",
      showCancelButton: true,
      closeOnConfirm: false
    }).then(result => {
      swal.disableButtons();
      if (result.value) {
        Meteor.call("deleteHangout", data, function(error) {
          swal("Poof!", "Your hangout has been successfully deleted!", "success");
        });
      } else if (result.dismiss === "cancel" || result.dismiss === "esc" || result.dismiss === "overlay") {
        swal("Phew!", "No changes made", "info");
      } else {
        swal("Oops! Something went wrong", error.error, +"\n Try again", "error");
      }
    });
  },
  "click .create-hangout-popup": function() {
    Modal.show("createHangoutModal");
  },
  "click #end-hangout": function() {
    const data = {
      hangoutId: this._id
    };

    swal({
      type: "warning",
      title: TAPi18n.__("end_hangout_confirm"),
      cancelButtonText: TAPi18n.__("no_end_hangout"),
      confirmButtonText: TAPi18n.__("yes_end_hangout"),
      confirmButtonColor: "#d9534f",
      showCancelButton: true,
      closeOnConfirm: false
    }).then(result => {
      swal.disableButtons();
      if (result.value) {
        Meteor.call("endHangout", data, function(error) {
          swal("Poof!", "Your hangout has been successfully deleted!", "success");
        });
      } else if (result.dismiss === "cancel" || result.dismiss === "esc" || result.dismiss === "overlay") {
        swal("Phew!", "No changes made", "info");
      } else {
        swal("Oops! Something went wrong", error.error, +"\n Try again", "error");
      }
    });
  }
});

// Hangout Action Bar
Template.hangoutActionBar.events({
  "click .report-hangout": function(e, hangout) {
    if (Meteor.userId()) {
      const hangoutId = hangout.data._id;
      Session.set("hangoutId", hangoutId);
      Modal.show("reportHangoutModal");
    }
  },
  "click .clone-hangout": function(e, hangout) {
    if (Meteor.userId()) {
      Session.set("hangoutId", hangout.data._id);
      Modal.show("cloneHangoutModal", { hangout });
      $("#clone-hangout-modal input#external-checkbox").prop("checked", hangout.data.externalCheckbox);
      $("#clone-hangout-modal #externalButtonText").val(hangout.data.externalButtonText);
      $("#clone-hangout-modal #externalURL").val(hangout.data.externalURL);
      $("#clone-hangout-modal #topic").val(hangout.data.topic);
      $("#clone-hangout-modal input[value=" + hangout.data.type + "]").prop("checked", true);
    }
  },
  "click .edit-hangout": function(e, hangout) {
    var start_time_reverted = moment(hangout.data.start).format("MM/DD/YYYY h:mm A");
    var hangoutDuration = hangout.data.duration;

    console.log(hangout.data._id + " this is an edited hangout id");
    Session.set("hangoutId", hangout.data._id);
    Modal.show("editHangoutModal", { hangout });
    $("#edit-hangout-modal input#external-checkbox").prop("checked", hangout.data.externalCheckbox);
    $("#edit-hangout-modal #externalButtonText").val(hangout.data.externalButtonText);
    $("#edit-hangout-modal #externalURL").val(hangout.data.externalURL);
    $("#edit-hangout-modal #topic").val(hangout.data.topic);
    $("#edit-hangout-modal input[value=" + hangout.data.type + "]").prop("checked", true);
    $("#edit-hangout-modal #start-date-time").val(start_time_reverted);
    $("#edit-hangout-modal #end-date-time").val(hangoutDuration);
    $("#edit-hangout-modal #group").val(hangout.data.group.title);
  },
  "click .delete-hangout": function(e, hangout) {
    const data = {
      hangoutId: this._id,
      hostId: this.host.id,
      hostUsername: this.host.name
    };

    swal({
      type: "warning",
      title: TAPi18n.__("delete_hangout_confirm"),
      text: TAPi18n.__("delete_hangout_text"),
      cancelButtonText: TAPi18n.__("no_delete_hangout"),
      confirmButtonText: TAPi18n.__("yes_delete_hangout"),
      confirmButtonColor: "#d9534f",
      showCancelButton: true,
      closeOnConfirm: false
    }).then(result => {
      swal.disableButtons();
      if (result.value) {
        Meteor.call("deleteHangout", data, function(error) {
          swal("Poof!", "Your hangout has been successfully deleted!", "success");
        });
      } else if (result.dismiss === "cancel" || result.dismiss === "esc" || result.dismiss === "overlay") {
        swal("Phew!", "No changes made", "info");
      } else {
        swal("Oops! Something went wrong", error.error, +"\n Try again", "error");
      }
    });
  }
});

// Hangout Frame (Jitsi Integration)
Template.hangoutFrame.onCreated(function() {
  let instance = this;
  instance.room = new ReactiveVar(`cb${instance.data._id || instance.data.hroom}`);
  instance.autorun(() => {
    instance.subscribe("hangoutParticipants", instance.room.get());
  });

  instance.loadJitsi = function(data) {
    const domain = "meet.jit.si";
    let room = "cb" + data.room;
    let width = "100%";
    let height = 550;
    let configOverwrite = { startWithVideoMuted: true };
    let interfaceConfigOverwrite = {};
    let htmlElement = document.getElementById("hangout-container");

    instance.api = new JitsiMeetExternalAPI(
      domain,
      room,
      width,
      height,
      htmlElement,
      configOverwrite,
      interfaceConfigOverwrite
    );
    instance.api.executeCommand("displayName", data.username);
    instance.api.executeCommand("toggleChat");
    instance.api.executeCommand("avatarUrl", data.avatar);

    $("[id^=" + "jitsiConference" + "]").css("width", "100%");
    $("[id^=" + "jitsiConference" + "]").length == 1 ? $(".load-hangout").hide() : $("#load-hangout").show();

    instance.api.on("readyToClose", () => {
      Bert.alert({ type: "success", message: "Thanks for joining the hangout!", hideDelay: 3500 });
      FlowRouter.go("all study groups");
    });

    Meteor.call("joinParticipant", room, function(error, result) {
      if (error) {
        return Bert.alert(error.reason, "danger", "growl-top-right");
      }
    });
  };

  instance.disposeJitsi = function() {
    instance.api.dispose();
  };
});

Template.hangoutFrame.onRendered(function() {
  if ((!!window.chrome && !!window.chrome.webstore) || typeof InstallTrigger !== "undefined") {
    $("p.chrome-firefox-warning").hide();
  } else {
    $("p.chrome-firefox-warning").show();
  }
  $("head").append('<script src="https://apis.google.com/js/platform.js" async defer></script>');
});

Template.hangoutFrame.events({
  "click .load-hangout": function(event, template) {
    const data = {
      room: this._id || template.data.hroom,
      username: (Meteor.user() && Meteor.user().username) || template.data.huser,
      type: template.data.htype || this.type,
      avatar: template.data.havatar || Meteor.user().profile.avatar.default
    };
    return template.loadJitsi(data);
  },
  "click #joinHere": function(event, template) {
    const hangout_id = `cb${this._id || template.data.hroom}`;
    Meteor.call("joinParticipant", hangout_id, function(error, result) {
      if (error) {
        return Bert.alert(error.reason, "danger", "growl-top-right");
      }
    });
  }
});

Template.hangoutFrame.helpers({
  numParticipants: function() {
    const appState = AppStats.findOne({ _id: Template.instance().room.get() });
    const isCoworkingPg = window.location.pathname.indexOf("coworking") > -1;
    if (appState && appState.participants && !isCoworkingPg) {
      return appState.participants.length;
    }
    return 0;
  },
  room: function() {
    return Template.instance().room.get();
  }
});

Template.hangoutFrame.onDestroyed(function() {
  const hangoutId = Template.instance().room.get();
  if (hangoutId) {
    Meteor.call("leaveParticipant", hangoutId);
  }
});

// Hangout Item
Template.hangoutItem.rendered = function() {
  //$('head').append('<script src="https://apis.google.com/js/platform.js" async defer></script>');
};

Template.registerHelper("hangoutOwner", function(ownerid) {
  if (Meteor.userId() === ownerid) {
    return true;
  } else {
    return false;
  }
});

Template.hangoutItem.helpers({
  getDescriptionTruncated: function(description) {
    if (description.length > 201) {
      return description.substring(0, 201) + "...";
    } else {
      return description.substring(0, 201);
    }
  }
});

Template.hangoutItem.events({
  "click .join-hangout": function() {
    console.log("clicked on join hangout");
    const data = {
      hangoutId: this._id,
      hostId: this.host.id
    };
    Meteor.call("addUserToHangout", data, function(error, result) {
      if (result) {
        swal({
          title: TAPi18n.__("you_are_awesome"),
          text: TAPi18n.__("looking_forward_to_see_you"),
          confirmButtonText: TAPi18n.__("ok"),
          type: "info"
        });
      }
    });
  },
  "click #leave-hangout": function() {
    if (this.host.id == Meteor.userId()) {
      swal({
        title: TAPi18n.__("remove_owner_from_hangout"),
        confirmButtonText: TAPi18n.__("ok"),
        type: "warning"
      });
    } else {
      const data = {
        hangoutId: this._id,
        hostId: this.host.id
      };
      Meteor.call("removeUserFromHangout", data, function(error, result) {
        if (result) console.log("removed");
      });
    }
  }
});

// Hangout Card
Template.hangoutCard.onRendered(function() {
  $(function() {
    $('[data-toggle="popover"]').popover({ trigger: "hover", html: "true" });
  });
});

Template.hangoutCard.helpers({
  truncate: function(topic) {
    return topic.truncate();
  },
  getDescriptionTruncated: function(description) {
    if (description.length && description.length > 400) {
      return description.substring(0, 400) + "...";
    } else {
      return description.substring(0, 400);
    }
  }
});

Template.hangoutCard.events({
  "click .join-hangout": function() {
    console.log("clicked on join hangout");
    const data = {
      hangoutId: this._id,
      hostId: this.host.id
    };
    Meteor.call("addUserToHangout", data, function(error, result) {
      if (result) {
        swal({
          title: TAPi18n.__("you_are_awesome"),
          text: TAPi18n.__("looking_forward_to_see_you"),
          confirmButtonText: TAPi18n.__("ok"),
          type: "info"
        });
      }
    });
  },
  "click #leave-hangout": function() {
    if (this.host.id == Meteor.userId()) {
      swal({
        title: TAPi18n.__("remove_owner_from_hangout"),
        confirmButtonText: TAPi18n.__("ok"),
        type: "warning"
      });
    } else {
      const data = {
        hangoutId: this._id,
        hostId: this.host.id
      };
      Meteor.call("removeUserFromHangout", data, function(error, result) {
        if (result) console.log("removed");
      });
    }
  }
});

// Hangout Learnings
Template.hangoutLearnings.onCreated(function() {
  var instance = this;
  instance.loaded = new ReactiveVar(0);
  instance.limit = new ReactiveVar(5);

  instance.autorun(function() {
    var limit = instance.limit.get();
    console.log("Asking for " + limit + " learnings...");
    var hangoutId = FlowRouter.getParam("hangoutId");
    console.log(hangoutId);

    // Only subscribe if we have a valid hangoutId
    if (!hangoutId) {
      console.log("No hangoutId found, skipping learnings subscription");
      return;
    }

    var subscription = instance.subscribe("learningsByHangoutId", limit, hangoutId);
    if (subscription.ready()) {
      console.log("> Received " + limit + " learnings. \n\n");
      instance.loaded.set(limit);
    } else {
      console.log("> Subscription is not ready yet. \n\n");
    }
  });

  instance.learningsForHangout = function() {
    return Learnings.find({}, { limit: instance.loaded.get(), sort: { created_at: -1 } });
  };
});

Template.hangoutLearnings.helpers({
  learnings: function() {
    return Template.instance().learningsForHangout();
  },
  hasMoreLearnings: function() {
    return (
      Template.instance()
        .learningsForHangout()
        .count() >= Template.instance().limit.get()
    );
  }
});

Template.hangoutLearnings.events({
  "click #load-more-learnings": function(event, instance) {
    event.preventDefault();
    var limit = instance.limit.get();
    limit += 5;
    instance.limit.set(limit);
  }
});

// Hangout Learned
Template.registerHelper("learningOwner", function(ownerid) {
  if (Meteor.userId() === ownerid) {
    return true;
  } else {
    return false;
  }
});

Template.hangoutLearned.helpers({
  learnedCharacterCount: function() {
    return 280;
  }
});

Template.hangoutLearned.onRendered(function() {
  // Initially disable the submit button
  $("#submit-learning-btn").prop("disabled", true);

  // Add direct event binding as backup
  $(document).on("click", "#submit-learning-btn", function(e) {
    e.preventDefault();
    console.log("Direct jQuery click handler triggered!");
    alert("Direct click worked!");
    submitLearningEntry();
  });
});

Template.hangoutLearned.events({
  "keyup textarea#learned-text": function(event) {
    let learnedCounterValue = 280;
    let maxChars = 280;
    var currentLength = $("textarea#learned-text").val().length;
    learnedCounterValue = maxChars - currentLength;

    // Enable/disable submit button based on content
    const submitBtn = $("#submit-learning-btn");
    if ($.trim($("textarea#learned-text").val()) === "") {
      submitBtn.prop("disabled", true);
    } else {
      submitBtn.prop("disabled", false);
    }

    $(".learnedCharactersLeft")
      .text(learnedCounterValue)
      .append(" <small><em>(Hit enter or click Update)</em></small>");
  },
  "keydown textarea#learned-text": function(event) {
    // Prevent form submission if Shift+Enter is pressed (allow line breaks)
    if (event.which === 13 && event.shiftKey) {
      return true; // Allow the line break
    }
    // If just Enter (without Shift), prevent default and handle submission
    if (event.which === 13) {
      event.preventDefault();
      return false;
    }
  },
  "keypress textarea#learned-text": function(event) {
    if (event.which === 13) {
      submitLearningEntry();
    }
  },
  "click #submit-learning-btn": function(event, template) {
    event.preventDefault();
    console.log("Submit button clicked!"); // Debug log
    alert("Button clicked!"); // Simple test
    submitLearningEntry();
  }
});

// Global function to handle learning submission
function submitLearningEntry() {
  console.log("submitLearningEntry called"); // Debug log

  var learningStatus = $("#learned-text").val();
  if ($.trim(learningStatus) == "") {
    $("#learned-text").focus();
    // Use swal instead of TILAlert for now
    swal({
      title: "Please enter something you learned",
      type: "warning",
      confirmButtonText: "OK"
    });
    return;
  }

  // Check if user is logged in
  if (!Meteor.userId()) {
    swal({
      title: "Please log in",
      text: "You need to be logged in to save your learning",
      type: "error",
      confirmButtonText: "OK"
    });
    return;
  }

  // Check if user object exists
  if (!Meteor.user() || !Meteor.user().username) {
    swal({
      title: "User Error",
      text: "User information not available. Please refresh and try again.",
      type: "error",
      confirmButtonText: "OK"
    });
    return;
  }

  // Disable the submit button during submission
  const submitBtn = $("#submit-learning-btn");
  submitBtn.prop("disabled", true).html('<i class="fas fa-spinner fa-spin"></i> Saving...');

  let optInTweet = $("#chkOptInTweet").is(":checked");

  console.log("Saving learning:", learningStatus);
  console.log("User ID:", Meteor.userId());
  console.log("Username:", Meteor.user().username);

  // Save to both collections for comprehensive tracking
  // 1. Save to existing Learnings collection (for hangout-specific tracking)
  var hangoutData = {
    user_id: Meteor.userId(),
    username: Meteor.user().username,
    title: learningStatus,
    hangout_id: FlowRouter.getParam("hangoutId"),
    study_group_id: FlowRouter.getParam("studyGroupId"),
    optInTweet
  };

  // 2. Save to new TodayILearned collection (for profile display with date/time)
  var tilData = {
    user_id: Meteor.userId(),
    username: Meteor.user().username,
    title: learningStatus,
    optInTweet
  };

  // Call both methods with better error handling
  let hangoutSuccess = false;
  let tilSuccess = false;
  let callsCompleted = 0;

  const checkCompletion = function() {
    callsCompleted++;
    if (callsCompleted === 2) {
      // Re-enable the submit button
      submitBtn.prop("disabled", false).html('<i class="fas fa-paper-plane"></i> Update');

      // Both calls completed
      if (hangoutSuccess || tilSuccess) {
        // At least one succeeded
        if (typeof TILAlert !== "undefined") {
          TILAlert.success("✅ Your learning has been saved successfully!");
        } else {
          swal({
            title: "Success!",
            text: "Your learning has been saved successfully!",
            type: "success",
            timer: 2000,
            showConfirmButton: false
          });
        }
        $("#learned-text")
          .val("")
          .blur();
        $(".learnedCharactersLeft").text(280);
        submitBtn.prop("disabled", true);
      } else {
        // Both failed
        swal({
          title: "Error",
          text: "Failed to save your learning. Please try again.",
          type: "error",
          confirmButtonText: "OK"
        });
      }
    }
  };

  Meteor.call("addLearning", hangoutData, function(error, result) {
    if (error) {
      console.log("Hangout learning error:", error);
      hangoutSuccess = false;
    } else {
      console.log("Hangout learning saved successfully");
      hangoutSuccess = true;
    }
    checkCompletion();
  });

  Meteor.call("addTodayILearned", tilData, function(error, result) {
    if (error) {
      console.log("TodayILearned error:", error);
      tilSuccess = false;
    } else {
      console.log("TodayILearned saved successfully");
      tilSuccess = true;
    }
    checkCompletion();
  });
}

// Support Hangout Organizer
Template.supportHangoutOrganizer.helpers({
  supportLinks() {
    const organizerId = Template.instance().data.organizerId;
    if (organizerId) {
      console.log(ReactiveMethod.call("users.getSupportLink", organizerId));
      return ReactiveMethod.call("users.getSupportLink", organizerId);
    } else {
      return false;
    }
  }
});

Template.supportHangoutOrganizer.events({
  "click #editProfileInfo": function(event, template) {
    event.preventDefault();
    const actor = Meteor.user();
    FlowRouter.go(`/profile/${actor.username}/${actor._id}`);
    Session.set("editMode", true);
    $("html, body").animate({ scrollTop: 0 }, "slow");
  }
});

// Startup
Meteor.startup(function() {
  $("head").append('<link href="https://cdn.quilljs.com/1.0.3/quill.snow.css" rel="stylesheet">');
});
