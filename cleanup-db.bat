@echo off
echo Cleaning up MongoDB database...
echo.

REM Wait for user confirmation
echo This will:
echo 1. Remove records with null userId and studyGroupId from app_stats
echo 2. Drop the problematic unique index
echo.
pause

REM Connect to MongoDB and run cleanup commands
meteor mongo --eval "db.app_stats.remove({ userId: null, studyGroupId: null }); print('Removed null records'); db.app_stats.dropIndex('userId_1_studyGroupId_1'); print('Dropped problematic index'); db.app_stats.getIndexes().forEach(function(idx) { print('Index: ' + idx.name); });"

echo.
echo Cleanup complete!
echo.
echo Now restart Meteor:
echo   1. Press Ctrl+C in the Meteor window
echo   2. Run: meteor run --settings settings-development.json
echo.
pause
