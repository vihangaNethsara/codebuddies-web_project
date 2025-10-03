Template.allStudyGroups.onCreated(function() {
  this.suggestions = new ReactiveVar([]);
  this.suggestionIndex = new ReactiveVar(-1);
  // Initialize reactive variables
  this.searchQuery = new ReactiveVar("");
  this.selectedFilter = new ReactiveVar("all");
  this.selectedTopics = new ReactiveVar([]);
  this.selectedTopic = new ReactiveVar(null);
  this.isLoading = new ReactiveVar(true);
  this.groupStats = new ReactiveVar({
    totalGroups: 0,
    activeGroups: 0,
    totalMembers: 0,
    groupGrowth: 0
  });
  this.viewMode = new ReactiveVar("grid");
  this.activeCategory = new ReactiveVar("all");
  this.selectedSkill = new ReactiveVar(null);

  // Initialize tooltips and popovers
  this.autorun(() => {
    if (this.subscriptionsReady()) {
      Meteor.defer(() => {
        $('[data-toggle="tooltip"]').tooltip();
        $('[data-toggle="popover"]').popover();
      });
    }
  });

  const title = "CodeBuddies | Study Groups";
  const metaInfo = {
    name: "description",
    content:
      "CodeBuddies is a community of independent code learners who enjoy sharing knowledge and helping each other learn faster. We come from all over the world; there are members living in the United States, Japan, Sweden, the United Kingdom, Russia, Australia, Canada, India, and more. Everyone is welcome, independent of previous knowledge."
  };

  DocHead.setTitle(title);
  DocHead.addMeta(metaInfo);

  let instance = this;
  instance.limit = new ReactiveVar(30);
  instance.flag = new ReactiveVar(false);
  instance.studyGroupsFilter = new ReactiveVar("new");

  instance.autorun(function() {
    let limit = instance.limit.get();
    let studyGroupsFilter = instance.studyGroupsFilter.get();
    instance.subscribe("allStudyGroups", limit, studyGroupsFilter);

    const hangoutIds = StudyGroups.find({}, { fields: { _id: 1 } }).map(x => `cb${x._id}`);
    instance.subscribe("allHangoutParticipants", hangoutIds);
  });

  instance.loadStudyGroups = function(flag = -1) {
    return StudyGroups.find({}, { sort: { updatedAt: flag } });
  };

  instance.addMoreStudyGroups = function() {
    if (StudyGroups.find().count() == instance.limit.get()) {
      instance.limit.set(instance.limit.get() + 9);
    } else {
      if (StudyGroups.find().count() < instance.limit.get()) {
        instance.flag.set(true);
      }
    }
  };
});

Template.allStudyGroups.helpers({
  suggestions() {
    return Template.instance().suggestions.get() || [];
  },
  activityStatus() {
    switch (this.activityLevel) {
      case "very-active":
        return "Very Active";
      case "active":
        return "Active";
      case "semi-active":
        return "Semi-Active";
      default:
        return "Inactive";
    }
  },

  isFeatured() {
    return this.members && this.members.length >= 10;
  },

  groupGrowth() {
    const stats = Template.instance().groupStats.get();
    return stats.groupGrowth;
  },

  isPositiveTrend() {
    return Template.instance().groupStats.get().groupGrowth > 0;
  },

  filteredGroups() {
    const instance = Template.instance();
    const searchQuery = instance.searchQuery.get();
    const selectedFilter = instance.selectedFilter.get();
    const selectedTopic = instance.selectedTopic.get();
    const activeCategory = instance.activeCategory.get();
    const selectedSkill = instance.selectedSkill.get();

    let groups = StudyGroups.find().fetch();

    // Apply search filter
    if (searchQuery) {
      const regex = new RegExp(searchQuery, "i");
      groups = groups.filter(group => {
        const tags = Array.isArray(group.tags) ? group.tags : group.tags ? [group.tags] : [];
        const tagsStr = tags.join(" ");
        return regex.test(group.title) || regex.test(group.description) || regex.test(tagsStr);
      });
    }

    // Apply selected filter
    if (selectedFilter !== "all") {
      switch (selectedFilter) {
        case "active":
          groups = groups.filter(g => g.activityLevel === "very-active" || g.activityLevel === "active");
          break;
        case "my":
          groups = groups.filter(g => g.members?.includes(Meteor.userId()));
          break;
        case "featured":
          groups = groups.filter(g => g.members?.length >= 10);
          break;
      }
    }

    // Apply single topic filter (from pill)
    if (selectedTopic) {
      groups = groups.filter(g => {
        const tags = Array.isArray(g.tags) ? g.tags : g.tags ? [g.tags] : [];
        return tags.includes(selectedTopic);
      });
    }

    // Apply category filter (categories derived from tags)
    if (activeCategory && activeCategory !== "all") {
      groups = groups.filter(g => {
        const tags = Array.isArray(g.tags) ? g.tags : g.tags ? [g.tags] : [];
        return tags.includes(activeCategory);
      });
    }

    // Apply skill filter
    if (selectedSkill) {
      groups = groups.filter(g => (g.skillLevel || "beginner") === selectedSkill);
    }

    return groups;
  },
  groupImage() {
    // Generate a unique but consistent image for each group based on its title
    const colors = ["4A90E2", "D0021B", "7ED321", "F5A623", "9013FE"];
    const colorIndex =
      Math.abs(this.title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
    return `https://dummyimage.com/600x400/${colors[colorIndex]}/ffffff&text=${encodeURIComponent(
      this.title.charAt(0)
    )}`;
  },
  memberCountText() {
    const count = (this.members && this.members.length) || 0;
    return count === 1 ? "1 member" : `${count} members`;
  },
  isTopicSelected(topic) {
    return Template.instance().selectedTopic.get() === topic;
  },
  viewMode() {
    return Template.instance().viewMode.get();
  },
  categories() {
    // derive categories from tags across groups
    const groups = StudyGroups.find().fetch();
    const map = {};
    groups.forEach(g => {
      // Ensure tags is an array
      const tags = Array.isArray(g.tags) ? g.tags : g.tags ? [g.tags] : [];
      tags.forEach(t => {
        if (t && typeof t === "string") {
          if (!map[t]) map[t] = { _id: t, name: t, icon: "fas fa-tag", groupCount: 0 };
          map[t].groupCount++;
        }
      });
    });
    return Object.values(map).sort((a, b) => b.groupCount - a.groupCount);
  },
  activeCategory() {
    return Template.instance().activeCategory.get();
  },
  isSkillSelected(skill) {
    return Template.instance().selectedSkill.get() === skill;
  },
  isViewMode(mode) {
    return Template.instance().viewMode.get() === mode;
  },
  firstFiveMembers() {
    // this refers to group context in #each
    const members = this.members || [];
    return members.slice(0, 5).map(id => {
      const u = Meteor.users.findOne(id) || {};
      return { profileImage: (u.profile && u.profile.avatar) || "/default-avatar.png", username: u.username || id };
    });
  },
  hasMoreMembers() {
    const members = this.members || [];
    return members.length > 5;
  },
  remainingMembers() {
    const members = this.members || [];
    return Math.max(0, members.length - 5);
  },
  upcomingEvents() {
    return this.events && this.events.length > 0;
  },
  firstTwoEvents() {
    return (this.events || []).slice(0, 2);
  },
  learningPath() {
    return this.learningPath;
  },
  progressPercentage() {
    const lp = this.learningPath;
    if (!lp || !lp.totalSteps) return 0;
    const percent = Math.round((lp.completedSteps || 0) / lp.totalSteps * 100);
    return percent;
  },
  progressStyle() {
    const lp = this.learningPath;
    if (!lp || !lp.totalSteps) return "width: 0%;";
    const percent = Math.round((lp.completedSteps || 0) / lp.totalSteps * 100);
    return "width: " + percent + "%;";
  },
  formatGroupStats() {
    return {
      members: this.members ? this.members.length : 0,
      discussions: Discussions.find({ studyGroupId: this._id }).count(),
      hangouts: Hangouts.find({ studyGroupId: this._id }).count()
    };
  },
  studyGroups: function() {
    return Template.instance().loadStudyGroups();
  },
  status: function() {
    return Template.instance().flag.get();
  },
  studyGroupsFilter: function() {
    console.log(Template.instance().studyGroupsFilter.get());
    return Template.instance().studyGroupsFilter.get();
  },
  sgSearchMode: function() {
    return Session.get("sgSearchMode");
  },
  numParticipants: function(studyGroupId) {
    const hangoutId = `cb${studyGroupId}`;
    const appState = AppStats.findOne({ _id: hangoutId });
    if (appState && appState.participants) {
      return appState.participants.length;
    }
    return 0;
  }
});

Template.allStudyGroups.events({
  "input .search-input": _.debounce(function(event, template) {
    const raw = event.target.value || "";
    const searchQuery = raw.trim().toLowerCase();
    template.searchQuery.set(searchQuery);

    // simple client-side suggestions: match categories, group titles, tags
    if (searchQuery.length >= 2) {
      const titles = StudyGroups.find({}, { fields: { title: 1, tags: 1 } }).fetch();
      const matches = [];
      const q = searchQuery;
      titles.forEach(g => {
        if (g.title && g.title.toLowerCase().indexOf(q) !== -1)
          matches.push({ type: "group", label: g.title, id: g._id });
        (g.tags || []).forEach(t => {
          if (t.toLowerCase().indexOf(q) !== -1) matches.push({ type: "tag", label: t });
        });
      });
      // include category names (derive from tags across groups)
      const groupsForCats = StudyGroups.find().fetch();
      const map = {};
      groupsForCats.forEach(g => {
        (g.tags || []).forEach(t => {
          if (!map[t]) map[t] = { _id: t, name: t };
          map[t].groupCount = (map[t].groupCount || 0) + 1;
        });
      });
      Object.values(map).forEach(c => {
        if (c.name.toLowerCase().indexOf(q) !== -1) matches.push({ type: "category", label: c.name, id: c._id });
      });

      // unique by label
      const unique = [];
      const seen = {};
      matches.forEach(m => {
        if (!seen[m.label]) {
          seen[m.label] = true;
          unique.push(m);
        }
      });
      template.suggestions.set(unique.slice(0, 8));
      template.suggestionIndex.set(-1);
    } else {
      template.suggestions.set([]);
      template.suggestionIndex.set(-1);
    }
  }, 200),

  "keydown #sg-search-input": function(event, template) {
    const key = event.which || event.keyCode;
    const idx = template.suggestionIndex.get();
    const suggestions = template.suggestions.get() || [];
    if (suggestions.length === 0) return;

    // Up (38), Down (40), Enter (13), Esc (27)
    if (key === 38) {
      event.preventDefault();
      const next = Math.max(-1, idx - 1);
      template.suggestionIndex.set(next);
    } else if (key === 40) {
      event.preventDefault();
      const next = Math.min(suggestions.length - 1, idx + 1);
      template.suggestionIndex.set(next);
    } else if (key === 13) {
      event.preventDefault();
      const sel = suggestions[idx] || suggestions[0];
      if (sel) {
        if (sel.type === "category") template.activeCategory.set(sel.id || sel.label);
        if (sel.type === "tag") template.selectedTopic.set(sel.label);
        if (sel.type === "group") {
          // navigate to group page
          FlowRouter.go("studyGroupDetails", { slug: sel.id });
        }
        template.suggestions.set([]);
      }
    } else if (key === 27) {
      template.suggestions.set([]);
      template.suggestionIndex.set(-1);
    }
  },

  "click .btn-tag": function(event, template) {
    // topic pill click - toggles topic filter
    const topic = event.currentTarget.getAttribute("data-topic");
    const currentTopic = template.selectedTopic.get();
    template.selectedTopic.set(currentTopic === topic ? null : topic);
  },
  "click #sg-search-button": function(event, template) {
    event.preventDefault();
    console.log("Search button clicked!");
    const searchInput = template.find("#sg-search-input");
    if (searchInput) {
      const query = searchInput.value.trim();
      console.log("Search query:", query);
      if (query) {
        template.searchQuery.set(query);
        // Show clear button
        $("#sg-clear-search").show();
        Bert.alert("Searching for: " + query, "info", "growl-top-right");
      }
    }
  },
  "click #sg-clear-search": function(event, template) {
    event.preventDefault();
    console.log("Clear button clicked!");
    template.searchQuery.set("");
    const searchInput = template.find("#sg-search-input");
    if (searchInput) searchInput.value = "";
    $("#sg-clear-search").hide();
    template.suggestions.set([]);
    Bert.alert("Search cleared", "info", "growl-top-right");
  },
  "click .btn-view-toggle": function(event, template) {
    event.preventDefault();
    event.stopPropagation();
    const view = event.currentTarget.getAttribute("data-view") || "grid";
    console.log("View toggle clicked! View:", view);

    // Set reactive state first
    template.viewMode.set(view);

    // Then update DOM after reactive update completes
    Meteor.defer(() => {
      // Update active state
      $(".btn-view-toggle").removeClass("active");
      $(".btn-view-toggle[data-view='" + view + "']").addClass("active");

      // Toggle list view class on groups-grid
      const grid = $(".groups-grid");
      if (view === "list") {
        grid.addClass("list-view");
        console.log("Switched to list view");
        Bert.alert("List view activated", "info", "growl-top-right");
      } else {
        grid.removeClass("list-view");
        console.log("Switched to grid view");
        Bert.alert("Grid view activated", "info", "growl-top-right");
      }
    });
  },
  "change #sg-sort": function(event, template) {
    const val = event.currentTarget.value;
    template.studyGroupsFilter.set(val);
  },
  "click .chip": function(event, template) {
    event.preventDefault();
    event.stopPropagation();
    const $el = $(event.currentTarget);
    const cat = $el.attr("data-category");
    const skill = $el.attr("data-skill");

    console.log("Chip clicked! Category:", cat, "Skill:", skill);

    if (cat) {
      const currentCat = template.activeCategory.get();
      // Toggle category
      if (currentCat === cat) {
        template.activeCategory.set("all");
        console.log("Category deselected:", cat);
        Bert.alert("Filter removed: " + cat, "info", "growl-top-right");
      } else {
        template.activeCategory.set(cat);
        console.log("Category selected:", cat);
        Bert.alert("Filtering by: " + cat, "info", "growl-top-right");
      }

      // Force visual update after state change
      Meteor.defer(() => {
        $(".chip[data-category]").removeClass("active");
        if (template.activeCategory.get() !== "all") {
          $(".chip[data-category='" + template.activeCategory.get() + "']").addClass("active");
        }
      });
    }

    if (skill) {
      const cur = template.selectedSkill.get();
      const newSkill = cur === skill ? null : skill;
      template.selectedSkill.set(newSkill);

      console.log(newSkill ? "Skill selected: " + newSkill : "Skill deselected");
      Bert.alert(newSkill ? "Filtering by skill: " + newSkill : "Skill filter removed", "info", "growl-top-right");

      // Force visual update after state change
      Meteor.defer(() => {
        $(".chip[data-skill]").removeClass("active");
        if (newSkill) {
          $(".chip[data-skill='" + newSkill + "']").addClass("active");
        }
      });
    }
  },
  "click .category-filters .btn-tag": function(event, template) {
    const cat = event.currentTarget.getAttribute("data-category");
    template.activeCategory.set(cat || "all");
  },
  "click .filter-section .btn-tag[data-skill]": function(event, template) {
    const skill = event.currentTarget.getAttribute("data-skill");
    const cur = template.selectedSkill.get();
    template.selectedSkill.set(cur === skill ? null : skill);
  },
  "change #studyGroupsFilter": function(event, template) {
    studyGroupsFilter = template.find("#studyGroupsFilter").value;
    template.flag.set(false);
    template.studyGroupsFilter.set(studyGroupsFilter);
  },
  "click #createGroupButton": function(event) {
    Modal.show("newStudyGroupModal");
  },
  "click #createGroupButtonEmpty": function(event) {
    Modal.show("newStudyGroupModal");
  },
  "click .btn-leave-study-group": function(event, template) {
    event.preventDefault();
    let data = {
      studyGroupId: this._id,
      studyGroupTitle: this.title,
      studyGroupSlug: this.slug
    };

    Meteor.call("leaveStudyGroup", data, function(error, result) {
      if (error) {
        return Bert.alert(error.reason, "danger", "growl-top-right");
      }
      if (result) {
        return Bert.alert("You have left the study group!", "success", "growl-top-right");
      }
    });
  },
  "click .btn-join-study-group": function(event, template) {
    event.preventDefault();
    if (Meteor.userId()) {
      let data = {
        studyGroupId: this._id,
        studyGroupTitle: this.title,
        studyGroupSlug: this.slug
      };

      Meteor.call("joinStudyGroup", data, function(error, result) {
        if (error) {
          return Bert.alert(error.reason, "danger", "growl-top-right");
        }
        if (result) {
          return Bert.alert("You have joined the study group!", "success", "growl-top-right");
        }
      });
    }
  },
  "click #loadMoreStudyGroups": function(event, template) {
    template.addMoreStudyGroups();
  }
});
