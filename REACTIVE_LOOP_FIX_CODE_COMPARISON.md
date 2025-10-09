# Visual Code Comparison - Reactive Loop Fix

This document shows before/after code for each fixed file to help understand the changes.

---

## 1. lib/auth_bridge.js

### ❌ BEFORE (Caused Infinite Loops)
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

**Problem:** Direct reactive calls create dependencies that trigger infinite updates

### ✅ AFTER (Fixed)
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

  if (customUser && !meteorUserId) {
    Session.set("_customUserId", customUser._id);
  } else if (!customUser && !meteorUserId) {
    Session.set("_customUserId", null);
  }
});
```

**Solution:** 
- ✅ Skip during `Meteor.loggingIn()`
- ✅ Use `Tracker.nonreactive()` to break dependency chain

---

## 2. lib/route_guards.js

### ❌ BEFORE (Templates Rendered Too Early)
```javascript
requireAuth = function(context, redirect) {
  if (isAuthenticating()) {
    console.log("Authentication in progress, waiting...");
    return; // Allow route to proceed, auth will be ready shortly
  }

  if (!isAuthenticated()) {
    console.log("Auth required - redirecting to login");
    redirect("/login");
  }
};
```

**Problem:** Route proceeds while auth incomplete → template renders → accesses undefined user data → freeze

### ✅ AFTER (Fixed)
```javascript
requireAuth = function(context, redirect) {
  if (isAuthenticating()) {
    console.log("Authentication in progress, waiting...");
    
    // Use a reactive computation to wait for auth to stabilize
    Tracker.autorun(function(computation) {
      if (!isAuthenticating()) {
        computation.stop();
        
        if (!isAuthenticated()) {
          console.log("Auth required after wait - redirecting to login");
          redirect("/login");
        }
      }
    });
    
    return;
  }

  if (!isAuthenticated()) {
    console.log("Auth required - redirecting to login");
    redirect("/login");
  }
};
```

**Solution:**
- ✅ Wait for auth to complete before proceeding
- ✅ Use reactive computation to detect when ready

---

## 3. client/templates/support/report-problem.js

### ❌ BEFORE (Subscription During Login)
```javascript
Template.reportProblem.onCreated(function() {
  this.showSuccess = new ReactiveVar(false);

  // Subscribe to user's problem reports
  this.subscribe("problemReports");
});
```

**Problem:** Subscription happens even during login, triggers reactive updates

### ✅ AFTER (Fixed)
```javascript
Template.reportProblem.onCreated(function() {
  const instance = this;
  instance.showSuccess = new ReactiveVar(false);

  // Subscribe to user's problem reports - wait for auth to be ready
  instance.autorun(function() {
    // CRITICAL FIX: Skip while logging in to prevent reactive loops
    if (Meteor.loggingIn()) {
      return;
    }
    
    // Only subscribe if user is authenticated
    const userId = Meteor.userId() || (UserManager && UserManager.getUserId());
    if (userId) {
      instance.subscribe("problemReports");
    }
  });
});
```

**Solution:**
- ✅ Wrap subscription in autorun with guard
- ✅ Only subscribe when auth is stable and user exists

---

### ❌ BEFORE (Helper Calls During Login)
```javascript
Template.reportProblemModal.helpers({
  currentUser: function() {
    return Meteor.user() || (typeof UserManager !== "undefined" && UserManager.currentUser()) || null;
  },

  getUserFullName: function() {
    const user = Meteor.user() || (typeof UserManager !== "undefined" && UserManager.currentUser()) || null;
    if (user && user.profile) {
      return user.profile.name || user.profile.displayName || user.username || "Anonymous User";
    }
    return "Anonymous User";
  }
});
```

**Problem:** Helpers call reactive functions during login → triggers cascading updates

### ✅ AFTER (Fixed)
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
    const user = Meteor.user() || (typeof UserManager !== "undefined" && UserManager.currentUser()) || null;
    if (user && user.profile) {
      return user.profile.name || user.profile.displayName || user.username || "Anonymous User";
    }
    return "Anonymous User";
  }
});
```

**Solution:**
- ✅ Check `Meteor.loggingIn()` first
- ✅ Return safe default during login

---

## 4. client/templates/hangout/hangout-consolidated.js

### ❌ BEFORE (Multiple Autoruns Without Guards)
```javascript
Template.createHangoutModal.onCreated(function() {
  const instance = this;
  
  instance.autorun(function() {
    const userId = Meteor.userId() || (UserManager && UserManager.getUserId());
    
    if (userId) {
      instance.subscribe("myStudyGroups");
    }
  });
});
```

**Problem:** Autorun fires during login, calls reactive functions, creates loops

### ✅ AFTER (Fixed)
```javascript
Template.createHangoutModal.onCreated(function() {
  const instance = this;
  
  instance.autorun(function() {
    // CRITICAL FIX: Skip while logging in to prevent reactive loops
    if (Meteor.loggingIn()) {
      return;
    }
    
    const userId = Meteor.userId() || (UserManager && UserManager.getUserId());
    
    if (userId) {
      instance.subscribe("myStudyGroups");
    }
  });
});
```

**This same pattern was applied to:**
- `createHangoutModal.onRendered` autorun
- `cloneHangoutModal.onCreated` autorun
- `cloneHangoutModal.onRendered` autorun
- `hangoutCards.onCreated` autorun
- `hangoutFrame.onCreated` autorun
- `hangoutLearnings.onCreated` autorun

**Solution:**
- ✅ Add `Meteor.loggingIn()` guard at start of every autorun
- ✅ Consistent pattern applied everywhere

---

## 5. client/main.js

### ❌ BEFORE (Global Subscriptions Without Guards)
```javascript
Meteor.startup(function() {
  // Subscribe to user roles
  Meteor.subscribe("userRoles");

  // Subscribe to admin data if user is admin
  Tracker.autorun(function() {
    if (Roles.userIsInRole(Meteor.userId(), ["admin"], "CB")) {
      Meteor.subscribe("allUsersWithRoles");
    }
  });
});
```

**Problem:** Subscriptions fire during login, contribute to reactive loops

### ✅ AFTER (Fixed)
```javascript
Meteor.startup(function() {
  // Subscribe to user roles - wait for auth to be ready
  Tracker.autorun(function() {
    if (Meteor.loggingIn()) {
      return;
    }
    
    const userId = Meteor.userId();
    if (userId) {
      Meteor.subscribe("userRoles");
    }
  });

  // Subscribe to admin data if user is admin
  Tracker.autorun(function() {
    if (Meteor.loggingIn()) {
      return;
    }
    
    if (Roles.userIsInRole(Meteor.userId(), ["admin"], "CB")) {
      Meteor.subscribe("allUsersWithRoles");
    }
  });
});
```

**Solution:**
- ✅ Wrap all global subscriptions in autoruns with guards
- ✅ Only subscribe when auth is stable

---

## 6. Study Group Templates

### ❌ BEFORE
```javascript
Template.singleStudyGroup.onCreated(function() {
  let instance = this;
  instance.studyGroupId = FlowRouter.getParam('studyGroupId');
  instance.hangoutId = `cb${instance.studyGroupId}`;
  instance.autorun(() => {
      instance.subscribe('studyGroupById', instance.studyGroupId);
      instance.subscribe('hangoutParticipants', instance.hangoutId);
  });
});
```

### ✅ AFTER
```javascript
Template.singleStudyGroup.onCreated(function() {
  let instance = this;
  instance.studyGroupId = FlowRouter.getParam('studyGroupId');
  instance.hangoutId = `cb${instance.studyGroupId}`;
  instance.autorun(() => {
      if (Meteor.loggingIn()) {
        return;
      }
      instance.subscribe('studyGroupById', instance.studyGroupId);
      instance.subscribe('hangoutParticipants', instance.hangoutId);
  });
});
```

---

## The Pattern

### Universal Fix Pattern

```javascript
// ✅ ALWAYS USE THIS PATTERN

// In onCreated autoruns:
instance.autorun(function() {
  // 1. Guard against login state
  if (Meteor.loggingIn()) {
    return;
  }
  
  // 2. Get user (now safe)
  const userId = Meteor.userId();
  
  // 3. Proceed only if authenticated
  if (userId) {
    instance.subscribe("data");
  }
});

// In helpers:
Template.foo.helpers({
  myHelper() {
    // 1. Guard first
    if (Meteor.loggingIn()) {
      return null; // or "Loading..."
    }
    
    // 2. Use reactive function (now safe)
    return Meteor.user();
  }
});

// In global autoruns:
Tracker.autorun(function() {
  // 1. Guard
  if (Meteor.loggingIn()) {
    return;
  }
  
  // 2. For non-dependent reads, use Tracker.nonreactive()
  const userId = Tracker.nonreactive(() => Meteor.userId());
  
  // 3. Proceed
});
```

---

## Key Takeaways

1. **Always check `Meteor.loggingIn()`** before calling `Meteor.user()` or `Meteor.userId()` in:
   - Template autoruns
   - Template helpers
   - Global autoruns

2. **Use `Tracker.nonreactive()`** when you need to read a value without creating a dependency

3. **Wait for auth in route guards** before allowing templates to render

4. **Apply the pattern consistently** across all templates that use authentication

5. **Test during and after login** to catch reactive loop issues early

---

## Impact Summary

| Template | Autoruns Fixed | Impact |
|----------|---------------|---------|
| auth_bridge.js | 1 (global) | Critical - affected all pages |
| route_guards.js | Modified guard | Critical - prevented early render |
| report-problem.js | 1 + helpers | Fixed Report Problem page |
| hangout-consolidated.js | 7 | Fixed all hangout modals |
| single_study_group.js | 1 | Fixed study group pages |
| single_study_group_modern.js | 2 | Fixed modern study group pages |
| main.js | 2 (global) | Fixed global subscriptions |

**Total:** 14+ critical reactive fixes applied

---

See [REACTIVE_LOOP_FIX_SUMMARY.md](./REACTIVE_LOOP_FIX_SUMMARY.md) for high-level overview.
