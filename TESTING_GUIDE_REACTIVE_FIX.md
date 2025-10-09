# Testing Guide: Reactive Loop Fix

## Quick Test Procedure

### Prerequisites
1. Start MongoDB: Open the `mongod` terminal
2. Start Meteor: `meteor` in the project root
3. Have a test user account ready (or create one)

### Test Scenarios

#### Test 1: Report Problem Page
```
1. Navigate to http://localhost:3000/report-problem
2. Verify page loads completely
3. Click "Open Report Modal" button
4. Verify modal opens
5. Try typing in all input fields:
   - Problem Type dropdown
   - Problem Description textarea
   - Priority dropdown
6. Verify all inputs are responsive and editable
```

**Expected Result:** ✅ All inputs work, no freezing

#### Test 2: Schedule Hangout
```
1. Navigate to http://localhost:3000/hangouts
2. Click "Schedule a Hangout" button (or "+ New Hangout")
3. Verify modal opens
4. Try typing in fields:
   - Topic
   - Description (rich text editor)
   - Start date/time
   - Duration
   - Study Group selection
5. Verify all inputs work properly
```

**Expected Result:** ✅ Modal opens, form is fully editable

#### Test 3: New Study Group
```
1. Navigate to http://localhost:3000/study-groups
2. Click "Create Study Group" or "+ New Group" button
3. Verify modal opens
4. Try typing in fields:
   - Group Name
   - Tagline
   - Tags (select2 dropdown)
5. Verify character counters update
6. Verify tag selection works
```

**Expected Result:** ✅ Form is responsive and editable

#### Test 4: Study Group Page
```
1. Navigate to any study group page
   e.g., http://localhost:3000/study-group/[groupId]
2. Verify page loads without freezing
3. Try clicking tabs (Overview, Hangouts, Discussions, etc.)
4. Verify tab switching works
5. Try interacting with elements on the page
```

**Expected Result:** ✅ Page loads, tabs work, no freezing

#### Test 5: New Discussion
```
1. Navigate to http://localhost:3000/discussions
2. Click "Start Discussion" or "+ New Discussion" button
3. Verify form/modal opens
4. Try typing in discussion fields
5. Verify rich text editor works
```

**Expected Result:** ✅ Discussion form is editable

### Test After Fresh Login

Repeat all tests after:
```
1. Logout completely
2. Login again
3. Immediately try to access each page
```

**Critical:** The freeze issue was most noticeable right after authentication changes. Test specifically during and immediately after login.

### Test During Page Refresh

For each page above:
```
1. Navigate to the page
2. Press F5 to refresh while logged in
3. Verify page loads correctly (not frozen)
```

### Browser Console Checks

Open Developer Tools (F12) and check Console tab:

❌ **Before Fix - Would See:**
```
Authentication in progress, waiting...
Authentication in progress, waiting...
Authentication in progress, waiting...
(repeated hundreds of times)
```

✅ **After Fix - Should See:**
```
Authentication in progress, waiting...
(message appears once or twice, then stops)
Auth required - redirecting to login
(or no repeated messages)
```

### Performance Checks

1. Open Chrome DevTools Performance tab
2. Start recording
3. Navigate to /report-problem
4. Stop recording after page loads
5. Check for:
   - ❌ No long tasks blocking main thread
   - ❌ No infinite loops in flame chart
   - ✅ Quick load time (<500ms for render)

## Common Issues to Look For

### Issue: Page Still Freezes
**Symptoms:** Can't click anything, UI is unresponsive
**Check:**
- Browser console for repeated logs
- Network tab - subscriptions keep firing
- Is there another template with autorun we missed?

### Issue: "Loading..." Never Goes Away
**Symptoms:** Form shows "Loading..." in fields permanently
**Check:**
- Is user actually logged in? Check `Meteor.userId()` in console
- Is `Meteor.loggingIn()` stuck at true?
- Check auth_bridge.js logic

### Issue: Form Opens But Fields Are Disabled
**Symptoms:** Modal opens but inputs are greyed out
**Check:**
- HTML disabled attributes in template
- CSS pointer-events: none
- Not a reactive loop issue - different problem

## Automated Test Commands

If you have test suite:
```bash
# Run integration tests
meteor test --driver-package=practicalmeteor:mocha

# Run specific test file
meteor test --driver-package=practicalmeteor:mocha --grep "report problem"
```

## Verification Checklist

After all tests:

- [ ] All pages load without freezing
- [ ] All form inputs are editable
- [ ] No reactive loop messages in console
- [ ] Modal dialogs open correctly
- [ ] Form submission works
- [ ] Page refresh works correctly
- [ ] Login/logout cycle works
- [ ] No performance degradation

## Rollback Plan

If issues persist:

```bash
git diff HEAD
# Review the changes

# If needed, rollback specific files:
git checkout HEAD -- lib/auth_bridge.js
git checkout HEAD -- lib/route_guards.js
# etc.
```

## Success Criteria

✅ **PASS:** All tests complete successfully, no freezing, forms are editable

❌ **FAIL:** Any page freezes, inputs uneditable, or reactive loops in console

---

**Note:** This fix addresses reactive loops during authentication. If you encounter different issues (network errors, method failures, etc.), those are separate problems.

## Need Help?

See [REACTIVE_LOOP_FIX_DOCUMENTATION.md](./REACTIVE_LOOP_FIX_DOCUMENTATION.md) for technical details on what was fixed and why.
