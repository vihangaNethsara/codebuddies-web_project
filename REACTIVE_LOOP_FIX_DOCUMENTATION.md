# Reactive Loop Fix - Template Freeze Issue Resolution

**Date:** October 9, 2025  
**Issue:** Pages like Report Problem, Schedule Hangout, New Group, and New Discussion were loading but freezing - inputs were unclickable or uneditable.

## Root Cause Analysis

After the recent authentication system changes, several critical issues were causing infinite reactive loops and template freezing:

### 1. Global Reactive Loop in auth_bridge.js

**Problem:** The global `Tracker.autorun` in `auth_bridge.js` was calling `Meteor.userId()` and `UserManager.currentUser()` without any guards. These reactive data sources were also being called in template helpers and subscriptions, creating cascading reactive updates that caused the UI to freeze.

**Original Code:**
```javascript
Tracker.autorun(function() {
  const customUser = UserManager ? UserManager.currentUser() : null;
  const meteorUserId = Meteor.userId();
  
  if (customUser && !meteorUserId) {
    Session.set("_customUserId", customUser._id);
  } else if (!customUser && !meteorUserId) {
    Session.set("_customUserId", null);
  }
});
```

**Fix:** Added `Meteor.loggingIn()` check and used `Tracker.nonreactive()` to prevent cascading updates:
```javascript
Tracker.autorun(function() {
  // Skip during login/logout transitions
  if (Meteor.loggingIn()) {
    return;
  }
  
  // Use nonreactive reads to prevent cascading updates
  const customUser = Tracker.nonreactive(() => {
    return UserManager ? UserManager.currentUser() : null;
  });
  
  const meteorUserId = Tracker.nonreactive(() => {
    return Meteor.userId();
  });
  
  // ... rest of code
});
```

### 2. Route Guards Allowing Premature Template Rendering

**Problem:** The `requireAuth` route guard was returning early during `isAuthenticating()`, allowing templates to render before authentication was complete. This caused templates to access undefined user data, leading to errors and freezing.

**Original Code:**
```javascript
requireAuth = function(context, redirect) {
  if (isAuthenticating()) {
    console.log("Authentication in progress, waiting...");
    return; // Allow route to proceed, auth will be ready shortly
  }
  
  if (!isAuthenticated()) {
    redirect("/login");
  }
};
```

**Fix:** Added a reactive computation to wait for auth to stabilize:
```javascript
requireAuth = function(context, redirect) {
  if (isAuthenticating()) {
    console.log("Authentication in progress, waiting...");
    
    // Use a reactive computation to wait for auth to stabilize
    Tracker.autorun(function(computation) {
      if (!isAuthenticating()) {
        computation.stop();
        
        if (!isAuthenticated()) {
          redirect("/login");
        }
      }
    });
    
    return;
  }
  
  if (!isAuthenticated()) {
    redirect("/login");
  }
};
```

### 3. Template Subscriptions Without Login Guards

**Problem:** Templates were subscribing to data and calling `Meteor.user()` / `Meteor.userId()` without checking if `Meteor.loggingIn()` was true. This caused reactive loops during the authentication process.

**Affected Templates:**
- `reportProblem` and `reportProblemModal`
- `createHangoutModal`
- `cloneHangoutModal`
- `hangoutCards`
- `hangoutFrame`
- `hangoutLearnings`
- `singleStudyGroup`
- `singleStudyGroupModern`
- `client/main.js` (global subscriptions)

**Fix Pattern Applied:**
```javascript
instance.autorun(function() {
  // CRITICAL FIX: Skip while logging in to prevent reactive loops
  if (Meteor.loggingIn()) {
    return;
  }
  
  // Now safe to call reactive functions and subscribe
  const userId = Meteor.userId();
  if (userId) {
    instance.subscribe("someData");
  }
});
```

### 4. Template Helpers Calling Reactive Functions During Login

**Problem:** Helper functions in `reportProblemModal` were calling `Meteor.user()` during the login process, contributing to reactive loops.

**Fix:** Added `Meteor.loggingIn()` guards to helpers:
```javascript
Template.reportProblemModal.helpers({
  currentUser: function() {
    if (Meteor.loggingIn()) {
      return null;
    }
    return Meteor.user() || (typeof UserManager !== "undefined" && UserManager.currentUser()) || null;
  },
  
  getUserFullName: function() {
    if (Meteor.loggingIn()) {
      return "Loading...";
    }
    // ... rest of code
  }
});
```

## Files Modified

### Core Authentication Files
1. **lib/auth_bridge.js**
   - Fixed global `Tracker.autorun` to use nonreactive reads
   - Added `Meteor.loggingIn()` guard

2. **lib/route_guards.js**
   - Modified `requireAuth` to wait for auth completion before allowing routes

3. **client/main.js**
   - Added `Meteor.loggingIn()` guards to global subscriptions

### Template Files
4. **client/templates/support/report-problem.js**
   - Fixed `reportProblem.onCreated` subscription autorun
   - Added guards to `reportProblemModal` helpers

5. **client/templates/hangout/hangout-consolidated.js**
   - Fixed 7 autoruns across multiple templates:
     - `createHangoutModal.onCreated`
     - `createHangoutModal.onRendered`
     - `cloneHangoutModal.onCreated`
     - `cloneHangoutModal.onRendered`
     - `hangoutCards.onCreated`
     - `hangoutFrame.onCreated`
     - `hangoutLearnings.onCreated`

6. **client/templates/study_groups/single_study_group.js**
   - Fixed subscription autorun

7. **client/templates/study_groups/single_study_group_modern.js**
   - Fixed subscription autorun
   - Fixed bookmark check autorun

## The Pattern: MeteorJS Reactive Loop Prevention

### Best Practice Rules

1. **Always check `Meteor.loggingIn()` in autoruns that call reactive functions:**
   ```javascript
   instance.autorun(function() {
     if (Meteor.loggingIn()) {
       return; // Skip during auth transitions
     }
     // Safe to proceed
   });
   ```

2. **Use `Tracker.nonreactive()` when you don't want cascading updates:**
   ```javascript
   const userId = Tracker.nonreactive(() => Meteor.userId());
   ```

3. **Wait for auth completion in route guards:**
   - Don't allow templates to render during `Meteor.loggingIn()`
   - Use reactive computations to wait for auth state to stabilize

4. **Guard template helpers that call reactive functions:**
   ```javascript
   Template.foo.helpers({
     currentUser() {
       if (Meteor.loggingIn()) return null;
       return Meteor.user();
     }
   });
   ```

5. **Separate subscription logic from data access:**
   - Subscribe in `onCreated` with guards
   - Access data in `helpers` with guards
   - Never mix them without protection

## Testing Checklist

After these fixes, test the following pages while logged in:

- [ ] `/report-problem` - Report Problem page loads and form is editable
- [ ] Click "Schedule Hangout" button - Modal opens and form works
- [ ] Click "New Study Group" button - Modal opens and form works
- [ ] Navigate to a study group page - Page loads without freezing
- [ ] Create a new discussion - Form is editable
- [ ] Test all forms after a fresh login
- [ ] Test all forms after page refresh while logged in

## Expected Behavior

✅ **Before Fix:**
- Pages loaded but were completely frozen
- Input fields were unclickable
- Text areas were uneditable
- Browser console showed repeated reactive updates
- UI was completely unresponsive

✅ **After Fix:**
- Pages load smoothly
- Input fields are clickable and responsive
- Text areas are editable
- No reactive loops in console
- UI is fully interactive

## Technical Explanation

### Why Reactive Loops Cause Freezing

In Meteor/Blaze, reactive data sources (like `Meteor.userId()`, `Meteor.user()`, `Session.get()`) automatically re-run any computations that depend on them when the data changes. 

The problem occurs when:
1. Template A's autorun calls `Meteor.userId()`
2. `Meteor.userId()` triggers `auth_bridge.js`'s autorun
3. `auth_bridge.js` updates `Session.set("_customUserId")`
4. Session update triggers Template A's autorun again
5. Loop continues infinitely

This creates a **synchronous infinite loop** where:
- The JavaScript event loop is blocked
- No user input can be processed
- The UI appears frozen
- CPU usage spikes

### Why `Meteor.loggingIn()` Guards Fix It

`Meteor.loggingIn()` returns `true` during the authentication transition period. By checking this value and returning early from autoruns:

1. We prevent reactive functions from being called during the unstable auth state
2. We break the reactive chain that causes loops
3. Once `Meteor.loggingIn()` becomes `false`, auth is stable and reactive calls are safe
4. The computation runs once with stable data, then only re-runs when data actually changes

### Why `Tracker.nonreactive()` Helps

`Tracker.nonreactive()` tells Meteor: "Read this reactive value, but don't make this computation depend on it."

This is useful in the global `auth_bridge.js` autorun because:
- It needs to read current auth state
- But it shouldn't create dependencies that cause re-runs
- It acts as a one-way sync mechanism

## Related Documentation

- [AUTHENTICATION_FIX_DOCUMENTATION.md](./AUTHENTICATION_FIX_DOCUMENTATION.md)
- [AUTH_FIX_COMPLETE.md](./AUTH_FIX_COMPLETE.md)
- [Meteor Tracker Documentation](https://docs.meteor.com/api/tracker.html)
- [Blaze Template Reactivity](https://docs.meteor.com/api/blaze.html)

## Author Notes

This fix addresses a critical UX issue introduced by the dual authentication system. The root cause was not the authentication system itself, but rather the lack of guards around reactive computations during the authentication transition period.

The pattern applied here should be used for **any template** that:
- Subscribes to data based on user state
- Calls `Meteor.user()` or `Meteor.userId()` in helpers
- Has autoruns that depend on authentication status

---

**Status:** ✅ Fixed  
**Verified:** Pending testing  
**Priority:** Critical - Core functionality affected
