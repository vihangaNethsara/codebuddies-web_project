# Quick Reference: MeteorJS Reactive Loop Prevention

## The Problem
```
Pages freeze → Inputs unclickable → Infinite reactive loops
```

## The Solution Pattern

### ✅ Template Autoruns (Subscriptions)
```javascript
Template.myTemplate.onCreated(function() {
  const instance = this;
  
  instance.autorun(function() {
    // 👇 ADD THIS GUARD
    if (Meteor.loggingIn()) {
      return;
    }
    
    const userId = Meteor.userId();
    if (userId) {
      instance.subscribe("myData");
    }
  });
});
```

### ✅ Template Helpers
```javascript
Template.myTemplate.helpers({
  myHelper() {
    // 👇 ADD THIS GUARD
    if (Meteor.loggingIn()) {
      return null; // or "Loading..."
    }
    
    return Meteor.user();
  }
});
```

### ✅ Global Autoruns
```javascript
Tracker.autorun(function() {
  // 👇 ADD THIS GUARD
  if (Meteor.loggingIn()) {
    return;
  }
  
  // 👇 USE NONREACTIVE FOR READS THAT SHOULDN'T CREATE DEPENDENCIES
  const userId = Tracker.nonreactive(() => Meteor.userId());
  
  // Proceed with logic
});
```

### ✅ Route Guards
```javascript
requireAuth = function(context, redirect) {
  // 👇 DON'T ALLOW ROUTE TO PROCEED DURING LOGIN
  if (isAuthenticating()) {
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

## When To Apply

Apply this pattern when you:
- ✅ Subscribe to data in `onCreated`
- ✅ Call `Meteor.user()` in helpers
- ✅ Call `Meteor.userId()` in autoruns
- ✅ Check authentication in route guards
- ✅ Have global autoruns that depend on user state

## The Guard Check

```javascript
if (Meteor.loggingIn()) {
  return; // or return safe default like null/"Loading..."
}
```

**What it does:**
- Prevents code from running during authentication transitions
- Breaks reactive loops
- Allows auth state to stabilize before proceeding

## Tracker.nonreactive()

```javascript
const userId = Tracker.nonreactive(() => Meteor.userId());
```

**What it does:**
- Reads a reactive value WITHOUT creating a dependency
- Prevents the current computation from re-running when that value changes
- Useful in global autoruns that need to check but not depend on values

## Testing Checklist

After applying fixes:
- [ ] Page loads without freezing
- [ ] Input fields are clickable
- [ ] Text areas are editable
- [ ] No repeated console logs
- [ ] Works after login
- [ ] Works after page refresh

## Files Fixed in This Project

1. ✅ `lib/auth_bridge.js` - Global autorun with nonreactive
2. ✅ `lib/route_guards.js` - Route guard waits for auth
3. ✅ `client/main.js` - Global subscriptions guarded
4. ✅ `client/templates/support/report-problem.js` - Subscription + helpers
5. ✅ `client/templates/hangout/hangout-consolidated.js` - 7 autoruns
6. ✅ `client/templates/study_groups/single_study_group.js` - Subscription
7. ✅ `client/templates/study_groups/single_study_group_modern.js` - 2 autoruns

## Common Mistakes

### ❌ DON'T DO THIS
```javascript
// No guard - will cause reactive loops
instance.autorun(function() {
  const userId = Meteor.userId(); // ⚠️ Triggers during login
  instance.subscribe("data");
});
```

### ❌ DON'T DO THIS
```javascript
// Allows template to render during login
requireAuth = function(context, redirect) {
  if (isAuthenticating()) {
    return; // ⚠️ Route proceeds too early
  }
  if (!isAuthenticated()) {
    redirect("/login");
  }
};
```

### ✅ DO THIS
```javascript
// With guard - safe
instance.autorun(function() {
  if (Meteor.loggingIn()) return; // ✅ Skip during login
  const userId = Meteor.userId();
  instance.subscribe("data");
});
```

## Debug Tips

### Check for Reactive Loops
Open browser console and look for:
```
Authentication in progress, waiting...
Authentication in progress, waiting...
Authentication in progress, waiting...
(repeated many times)
```

### Check Autorun
Add logging:
```javascript
instance.autorun(function() {
  console.log("Autorun running, loggingIn:", Meteor.loggingIn());
  if (Meteor.loggingIn()) return;
  // ... rest of code
});
```

If you see "Autorun running" repeated rapidly → you have a reactive loop

### Check Performance
Chrome DevTools → Performance tab → Record → Look for:
- Long tasks
- Repeated function calls in flame chart
- Main thread blocked

## Resources

📄 **Full Documentation:**
- [REACTIVE_LOOP_FIX_SUMMARY.md](./REACTIVE_LOOP_FIX_SUMMARY.md) - Overview
- [REACTIVE_LOOP_FIX_DOCUMENTATION.md](./REACTIVE_LOOP_FIX_DOCUMENTATION.md) - Technical details
- [REACTIVE_LOOP_FIX_CODE_COMPARISON.md](./REACTIVE_LOOP_FIX_CODE_COMPARISON.md) - Before/after code
- [TESTING_GUIDE_REACTIVE_FIX.md](./TESTING_GUIDE_REACTIVE_FIX.md) - Testing procedures

📚 **Meteor Docs:**
- [Tracker Documentation](https://docs.meteor.com/api/tracker.html)
- [Blaze Reactivity](https://docs.meteor.com/api/blaze.html)
- [Template Lifecycle](https://guide.meteor.com/blaze.html#lifecycle)

---

**Remember:** When in doubt, add `if (Meteor.loggingIn()) return;` at the start of any autorun or helper that calls reactive authentication functions!

🎯 **Golden Rule:** Never call `Meteor.user()` or `Meteor.userId()` while `Meteor.loggingIn()` is `true`.
