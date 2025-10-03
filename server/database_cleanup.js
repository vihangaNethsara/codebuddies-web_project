// Database Cleanup Server Method
// This file will be automatically loaded by Meteor
// Run the cleanup by opening browser console and executing:
// Meteor.call('cleanupAppStatsDatabase', (err, result) => { console.log(err || result); });

if (Meteor.isServer) {
  Meteor.methods({
    cleanupAppStatsDatabase: function() {
      // Only allow in development
      if (process.env.NODE_ENV === "production") {
        throw new Meteor.Error("not-authorized", "This method is only available in development");
      }

      try {
        console.log("Starting database cleanup...");

        // Remove records with null userId and studyGroupId
        const removedCount = AppStats.remove({
          userId: null,
          studyGroupId: null
        });

        console.log(`Removed ${removedCount} null records from app_stats`);

        // Try to drop the problematic index
        try {
          AppStats._dropIndex({ userId: 1, studyGroupId: 1 });
          console.log("Dropped problematic index: userId_1_studyGroupId_1");
        } catch (indexError) {
          console.log("Index does not exist or could not be dropped (this is OK)");
        }

        // Get remaining count
        const remainingCount = AppStats.find().count();
        console.log(`Remaining records in app_stats: ${remainingCount}`);

        // Get current indexes
        const rawCollection = AppStats.rawCollection();
        const indexes = Meteor.wrapAsync(rawCollection.indexes, rawCollection)();

        console.log("Current indexes:");
        indexes.forEach(idx => {
          console.log(`  - ${idx.name}:`, idx.key);
        });

        return {
          success: true,
          removedCount: removedCount,
          remainingCount: remainingCount,
          indexes: indexes.map(idx => ({ name: idx.name, key: idx.key })),
          message: `Cleanup complete! Removed ${removedCount} null records. ${remainingCount} records remaining.`
        };
      } catch (error) {
        console.error("Cleanup error:", error);
        throw new Meteor.Error("cleanup-failed", error.message);
      }
    }
  });

  // Run cleanup automatically on server start if needed
  Meteor.startup(function() {
    // Check if there are null records
    const nullCount = AppStats.find({
      userId: null,
      studyGroupId: null
    }).count();

    if (nullCount > 0) {
      console.log(`⚠️  Found ${nullCount} null records in app_stats collection`);
      console.log('⚠️  Run cleanup in browser console: Meteor.call("cleanupAppStatsDatabase", console.log)');
    }
  });
}
