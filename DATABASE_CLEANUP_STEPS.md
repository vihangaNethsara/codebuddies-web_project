# Database Cleanup Steps

## Problem
MongoDB duplicate key error preventing Meteor from starting:
```
E11000 duplicate key error collection: meteor.app_stats index: userId_1_studyGroupId_1 dup key: { : null, : null }
```

## Solution: Clean up the database manually

### Step 1: Start Meteor (in PowerShell Window 1)
```powershell
cd C:\Users\Asus\Desktop\web\web_project\codebuddies-web_project
meteor run --settings settings-development.json
```

**Wait for Meteor to start** (look for "App running at: http://localhost:3000/")

### Step 2: Open Second PowerShell Window
Press `Win + X` → Select "Windows PowerShell" or "Terminal"

### Step 3: Connect to MongoDB (in PowerShell Window 2)
```powershell
cd C:\Users\Asus\Desktop\web\web_project\codebuddies-web_project
meteor mongo
```

### Step 4: Run Cleanup Commands (in mongo shell)
```javascript
// Remove problematic null records
db.app_stats.remove({ userId: null, studyGroupId: null });

// Check how many records remain
db.app_stats.count();

// Drop the problematic unique index
db.app_stats.dropIndex("userId_1_studyGroupId_1");

// Verify indexes
db.app_stats.getIndexes();

// Exit mongo shell
exit
```

### Step 5: Restart Meteor
Go back to PowerShell Window 1:
- Press `Ctrl + C` to stop Meteor
- Restart: `meteor run --settings settings-development.json`

---

## Alternative: If Meteor Won't Start at All

If Meteor crashes immediately before you can connect to MongoDB:

### Option A: Use MongoDB Compass (GUI)
1. Download [MongoDB Compass](https://www.mongodb.com/try/download/compass)
2. Connect to: `mongodb://127.0.0.1:3001/meteor` (default Meteor MongoDB port)
3. Find the `app_stats` collection
4. Delete documents where `userId` and `studyGroupId` are both null
5. Drop the index `userId_1_studyGroupId_1`

### Option B: Reset the Database (Nuclear Option)
```powershell
# WARNING: This deletes ALL data!
meteor reset
meteor run --settings settings-development.json
```

---

## Verification

After cleanup, the app should start without errors. Check for:
1. ✅ No MongoDB errors in terminal
2. ✅ "App running at: http://localhost:3000/"
3. ✅ Can access the app in browser

Then test the premium group page:
- Navigate to: `http://localhost:3000/study-groups/[GROUP_ID]/premium`
- Test theme toggle, tabs, bookmark, etc.

---

## Why This Happened

The `premium_methods.js` file tried to create a unique index on `userId` and `studyGroupId` fields, but the `app_stats` collection already had records with null values in both fields, causing a duplicate key error.

**Fix applied**: Removed automatic index creation from the code, so this won't happen again.
