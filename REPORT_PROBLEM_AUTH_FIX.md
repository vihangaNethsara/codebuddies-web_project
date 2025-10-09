# Report Problem Page - Authentication Fix

## Issue
The `/report-problem` page was not working after authentication system changes.

## Root Causes

### 1. **Missing Dual Auth Support in Template Helpers**
The template helpers only checked `Meteor.user()` without falling back to `UserManager`:

```javascript
// OLD - Only checked Meteor auth
currentUser: function() {
  return Meteor.user();
}
```

During the authentication sync period (when `Meteor.loginWithToken()` is still running), `Meteor.user()` returns `null` even though the user is logged in via custom auth.

### 2. **Missing Route Guard**
The route had no `triggersEnter: [requireAuth]`, meaning:
- Unauthenticated users could access the page (unintended)
- No protection during navigation
- Template could render before auth was ready

### 3. **Server Method Only Checked Meteor Auth**
The `problemReports.insert` method only used `this.userId` (from Meteor auth context), which would be `null` if:
- User was logged in via custom auth only
- Meteor auth sync hadn't completed yet

## Solutions Applied

### 1. ✅ Updated Template Helpers with Dual Auth Fallback

**File: `client/templates/support/report-problem.js`**

```javascript
Template.reportProblemModal.helpers({
  currentUser: function() {
    // Use fallback pattern for dual auth system
    return Meteor.user() || (typeof UserManager !== "undefined" && UserManager.currentUser()) || null;
  },

  getUserFullName: function() {
    // Use fallback pattern for dual auth system
    const user = Meteor.user() || (typeof UserManager !== "undefined" && UserManager.currentUser()) || null;
    if (user && user.profile) {
      return user.profile.name || user.profile.displayName || user.username || "Anonymous User";
    }
    return "Anonymous User";
  },

  getUserEmail: function() {
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
});
```

**What This Does:**
- Checks `Meteor.user()` first (standard auth)
- Falls back to `UserManager.currentUser()` (custom auth)
- Works immediately after login, even during auth sync

### 2. ✅ Added Route Guard

**File: `lib/routes.js`**

```javascript
FlowRouter.route("/report-problem", {
  name: "reportProblem",
  triggersEnter: [requireAuth], // ← Added this!
  action: function() {
    BlazeLayout.render("layout", {
      top: "header",
      main: "reportProblem",
      footer: "footer"
    });
  }
});
```

**What This Does:**
- Redirects unauthenticated users to `/login`
- Waits during authentication (via `isAuthenticating()` check)
- Ensures only logged-in users can submit reports

### 3. ✅ Updated Server Method for Dual Auth

**File: `lib/collections.js`**

```javascript
"problemReports.insert": function(reportData) {
  check(reportData, {
    problemType: String,
    problemDescription: String,
    systemInfo: Match.Optional(String),
    priority: String,
    sessionToken: Match.Optional(String), // ← Added this!
    attachedFiles: Match.Optional([...])
  });

  // Get userId from either auth system
  let userId = this.userId;
  if (!userId && reportData.sessionToken) {
    // Try to get user from custom auth session
    const customUser = verifySessionToken(reportData.sessionToken);
    if (customUser) {
      userId = customUser._id;
    }
  }

  // Now insert with the correct userId...
}
```

**What This Does:**
- Accepts `sessionToken` parameter from client
- Uses `verifySessionToken()` from auth bridge
- Falls back to custom auth if Meteor auth not available
- Ensures reports are always linked to the correct user

### 4. ✅ Enhanced Client Form Submission

**File: `client/templates/support/report-problem.js`**

```javascript
"submit .report-problem-form": function(event, template) {
  event.preventDefault();
  
  template.isSubmitting.set(true);

  const formData = {
    problemType: event.target.problemType.value,
    problemDescription: event.target.problemDescription.value,
    systemInfo: event.target.systemInfo.value,
    priority: event.target.priority.value,
    sessionToken: Session.get("userSessionToken"), // ← Added this!
    attachedFiles: template.uploadedFiles.get()
  };

  Meteor.call("problemReports.insert", formData, function(error, result) {
    template.isSubmitting.set(false);
    
    if (error) {
      sAlert.error("Failed to submit report: " + error.reason);
    } else {
      sAlert.success("Report submitted successfully!");
      $("#reportProblemModal").modal("hide");
      
      // Reset form and show success
      event.target.reset();
      template.uploadedFiles.set([]);
      Template.instance().showSuccess.set(true);
      setTimeout(() => Template.instance().showSuccess.set(false), 5000);
    }
  });
}
```

**Improvements:**
- Sends `sessionToken` to support dual auth
- Shows loading state (`isSubmitting`)
- Better error handling with reason
- Resets form after success
- Shows success message

## How It Works Now

### Login → Report Problem Flow

```
User logs in
    ↓
Custom session stored immediately ✅
    ↓
Meteor.loginWithToken() called (async) ⏰
    ↓
User clicks "Report Problem"
    ↓
requireAuth() checks:
    - isAuthenticating()? YES → Allow route ✅
    ↓
Template renders
    ↓
Helper calls: Meteor.user() || UserManager.currentUser()
    - UserManager.currentUser() returns user ✅
    ↓
User fills form and submits
    ↓
Method receives sessionToken
    ↓
verifySessionToken() returns user ID ✅
    ↓
Report saved with correct userId ✅
```

### Template Rendering

```html
<!-- Template checks currentUser helper -->
{{#if currentUser}}
  <p><strong>Name:</strong> {{getUserFullName}}</p>
  <p><strong>Email:</strong> {{getUserEmail}}</p>
{{else}}
  <p>Please log in to submit a report</p>
{{/if}}
```

**Works because:**
- `currentUser` helper checks both auth systems
- Returns user even during Meteor auth sync
- Template shows correct user info immediately

## Files Modified

1. **`client/templates/support/report-problem.js`**
   - Updated helpers with dual auth fallback
   - Enhanced form submission with sessionToken
   - Improved UX with loading states

2. **`lib/routes.js`**
   - Added `requireAuth` guard to `/report-problem` route

3. **`lib/collections.js`**
   - Updated `problemReports.insert` to accept sessionToken
   - Added dual auth user detection

## Testing

### ✅ Test Case 1: Immediate Access After Login
```
1. Log in
2. IMMEDIATELY click "Report Problem" link
3. Page should load (no redirect)
4. User info should display correctly
```

### ✅ Test Case 2: Submit Report
```
1. Log in and navigate to /report-problem
2. Click "Report a Problem" button
3. Fill out form
4. Submit
5. Report should save with correct userId
```

### ✅ Test Case 3: Unauthenticated Access
```
1. Log out
2. Try to navigate to /report-problem
3. Should redirect to /login
```

### ✅ Test Case 4: Page Reload
```
1. Log in
2. Navigate to /report-problem
3. Press F5 to reload
4. Should stay on page (no redirect)
5. User info should display
```

## Before vs After

| Scenario | Before | After |
|----------|--------|-------|
| Navigate after login | ❌ User info missing | ✅ Shows user info |
| Submit report | ❌ userId = null | ✅ Correct userId |
| Unauthenticated | ⚠️ Page loads | ✅ Redirects to login |
| Page reload | ❌ User info missing | ✅ Shows user info |

## Summary

The Report Problem page now:
- ✅ Works immediately after login (no race condition)
- ✅ Shows correct user information from either auth system
- ✅ Saves reports with correct userId
- ✅ Protected with route guard
- ✅ Handles authentication sync gracefully
- ✅ Better UX with loading states and error messages

All thanks to the **dual auth fallback pattern** applied consistently across:
1. Template helpers
2. Server methods
3. Route guards
