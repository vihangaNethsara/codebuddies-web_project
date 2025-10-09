Meteor.methods({
  addTodayILearned: function(data) {
    check(data, {
      title: String,
      user_id: String,
      username: String,
      optInTweet: Match.Optional(Boolean)
    });

    if (!this.userId) {
      throw new Meteor.Error(
        "TodayILearned.methods.addTodayILearned.not-logged-in",
        "Must be logged in to add TIL entry."
      );
    }

    // Ensure the user can only add entries for themselves
    if (this.userId !== data.user_id) {
      throw new Meteor.Error(
        "TodayILearned.methods.addTodayILearned.unauthorized",
        "Can only add TIL entries for yourself."
      );
    }

    const tilEntry = {
      title: data.title,
      userId: data.user_id,
      username: data.username,
      created_at: new Date(),
      kudos: 0
    };

    try {
      const entryId = TodayILearned.insert(tilEntry);

      // TODO: Add Twitter integration if needed
      if (data.optInTweet === true) {
        // Can integrate with existing Twitter functionality later
      }

      return entryId;
    } catch (e) {
      console.log("TodayILearned error", e.toString());
      throw new Meteor.Error("TodayILearned.methods.addTodayILearned.insert-failed", "Failed to save TIL entry.");
    }
  },

  deleteTodayILearned: function(entryId) {
    check(entryId, String);

    if (!this.userId) {
      throw new Meteor.Error(
        "TodayILearned.methods.deleteTodayILearned.not-logged-in",
        "Must be logged in to delete TIL entry."
      );
    }

    const entry = TodayILearned.findOne(entryId);
    if (!entry) {
      throw new Meteor.Error("TodayILearned.methods.deleteTodayILearned.not-found", "TIL entry not found.");
    }

    if (entry.userId !== this.userId) {
      throw new Meteor.Error(
        "TodayILearned.methods.deleteTodayILearned.unauthorized",
        "Can only delete your own TIL entries."
      );
    }

    TodayILearned.remove(entryId);
    return true;
  },

  editTodayILearned: function(data) {
    check(data.entryId, String);
    check(data.title, String);

    if (!this.userId) {
      throw new Meteor.Error(
        "TodayILearned.methods.editTodayILearned.not-logged-in",
        "Must be logged in to edit TIL entry."
      );
    }

    const entry = TodayILearned.findOne(data.entryId);
    if (!entry) {
      throw new Meteor.Error("TodayILearned.methods.editTodayILearned.not-found", "TIL entry not found.");
    }

    if (entry.userId !== this.userId) {
      throw new Meteor.Error(
        "TodayILearned.methods.editTodayILearned.unauthorized",
        "Can only edit your own TIL entries."
      );
    }

    TodayILearned.update(data.entryId, {
      $set: {
        title: data.title,
        updated_at: new Date()
      }
    });
    return true;
  },

  incrementTodayILearnedKudos: function(entryId) {
    check(entryId, String);

    if (!this.userId) {
      throw new Meteor.Error("TodayILearned.methods.incrementKudos.not-logged-in", "Must be logged in to give kudos.");
    }

    TodayILearned.update(entryId, {
      $inc: { kudos: 1 },
      $addToSet: { likedBy: this.userId }
    });
    return true;
  }
});
