# Authentication Timing Fix - Preventing Route Redirects

## 🐛 The Problem

After implementing dual authentication (Meteor + Custom), logged-in users were being **incorrectly redirected to `/login`** when trying to access authenticated pages like:
- Schedule Hangout
- New Group
- Profile pages
- My Study Groups
- Notifications

### Root Cause: Race Condition

The authentication flow has a **timing race condition**:

```javascript
// In UserManager.login():
Session.set("userSessionToken", result.sessionToken);  // ✅ Immediate
Session.set("currentUser", result.user);               // ✅ Immediate
Meteor.loginWithToken(result.loginToken, callback);   // ⏰ ASYNC - takes time!
```

**What was happening:**

1. User logs in via custom auth → `UserManager` stores session immediately
2. `Meteor.loginWithToken()` is called but takes 100-500ms to complete
3. User clicks "Schedule Hangout" → FlowRouter navigates to route
4. Route guard `requireAuth` runs → checks `Meteor.userId()`
5. `Meteor.userId()` returns `null` (login still in progress!)
6. User gets redirected to `/login` even though they ARE logged in! 😱

### Secondary Problem: Page Reload

On page reload:
1. `UserManager.init()` restored custom auth session ✅
2. But didn't restore Meteor auth session ❌
3. `Meteor.userId()` returned `null` on every page reload
4. Users had to re-login on every refresh!

---

## ✅ The Solution

### 1. Added `isAuthenticating()` Function

**File: `lib/route_guards.js`**

```javascript
/**
 * Check if authentication is in progress
 * @returns {Boolean}
 */
isAuthenticating = function() {
  // Check if Meteor is logging in
  if (Meteor.loggingIn()) {
    return true;
  }

  // Check if we have session data but Meteor.userId() is not ready yet
  if (typeof Session !== "undefined") {
    const sessionToken = Session.get("userSessionToken");
    const currentUser = Session.get("currentUser");
    if (sessionToken && currentUser && !Meteor.userId()) {
      return true; // Custom auth ready but Meteor auth syncing
    }
  }

  return false;
};
```

**This detects:**
- `Meteor.loggingIn()` is `true` (Meteor's built-in flag)
- Custom session exists but `Meteor.userId()` is null (syncing in progress)

### 2. Updated Route Guards to Wait

**File: `lib/route_guards.js`**

```javascript
requireAuth = function(context, redirect) {
  // Don't redirect if login is in progress - wait for it to complete
  if (isAuthenticating()) {
    console.log("Authentication in progress, waiting...");
    return; // Allow route to proceed, auth will be ready shortly
  }

  // Only redirect if definitely not authenticated
  if (!isAuthenticated()) {
    console.log("Auth required - redirecting to login");
    redirect("/login");
  }
};
```

**Key change:** If auth is in progress, the guard **returns early** without redirecting. The route loads, and by the time the template renders, auth is ready.

### 3. Enhanced Session Detection

**File: `lib/route_guards.js`**

```javascript
isAuthenticated = function() {
  // Check Meteor auth first
  if (Meteor.userId()) {
    return true;
  }

  // Check custom auth via UserManager
  if (typeof UserManager !== "undefined" && UserManager.isLoggedIn()) {
    return true;
  }

  // Check session storage for custom auth (fallback)
  if (typeof Session !== "undefined") {
    const sessionToken = Session.get("userSessionToken");
    const currentUser = Session.get("currentUser");
    if (sessionToken && currentUser) {
      return true;
    }
  }

  return false;
};
```

**Now checks three places:**
1. `Meteor.userId()` - Standard Meteor auth
2. `UserManager.isLoggedIn()` - Custom auth manager
3. `Session.get("userSessionToken")` - Raw session data (fallback)

### 4. Added `isAuthenticating` Template Helper

**File: `client/helpers/auth_helpers.js`**

```javascript
Template.registerHelper("isAuthenticating", function() {
  // Check if Meteor is logging in
  if (Meteor.loggingIn()) {
    return true;
  }

  // Check if we have session data but Meteor.userId() is not ready yet
  const sessionToken = Session.get("userSessionToken");
  const currentUser = Session.get("currentUser");
  if (sessionToken && currentUser && !Meteor.userId()) {
    return true; // Custom auth ready but Meteor auth syncing
  }

  return false;
});
```

**Templates can now show loading states:**

```handlebars
{{#if isAuthenticating}}
  <div class="loading">Logging in...</div>
{{else}}
  {{#if isLoggedIn}}
    <button>Schedule Hangout</button>
  {{else}}
    <a href="/login">Please log in</a>
  {{/if}}
{{/if}}
```

### 5. Fixed Session Restoration on Page Reload

**File: `client/userManager.js`**

```javascript
init: function() {
  const savedToken = localStorage.getItem("codebuddies_session");
  if (savedToken) {
    Meteor.call("customUsers.getCurrentUser", savedToken, function(error, user) {
      if (!error && user) {
        Session.set("userSessionToken", savedToken);
        Session.set("currentUser", user);

        // If Meteor.userId() is null, try to get a fresh login token
        if (!Meteor.userId()) {
          console.log("Meteor session not found, requesting new login token...");
          Meteor.call("customUsers.getLoginToken", savedToken, function(tokenError, loginToken) {
            if (!tokenError && loginToken) {
              Meteor.loginWithToken(loginToken, function(meteorError) {
                if (!meteorError) {
                  console.log("Meteor session restored successfully");
                }
              });
            }
          });
        }
      }
    });
  }
},
```

**On page reload:**
1. Restore custom auth session from localStorage ✅
2. Check if `Meteor.userId()` exists
3. If not, request a fresh Meteor login token from server
4. Use `Meteor.loginWithToken()` to restore Meteor session ✅

### 6. Added Server Method for Token Generation

**File: `lib/collections.js`**

```javascript
"customUsers.getLoginToken": function(sessionToken) {
  check(sessionToken, String);

  if (!Meteor.isServer) {
    return null;
  }

  const session = UserSessions.findOne({ token: sessionToken });
  if (!session) {
    throw new Meteor.Error("invalid-session", "Session not found");
  }

  const user = CustomUsers.findOne(session.userId);
  if (!user) {
    throw new Meteor.Error("user-not-found", "User not found");
  }

  // Find the linked Meteor user
  let meteorUser = Meteor.users.findOne({ "profile.customUserId": user._id });
  if (!meteorUser) {
    throw new Meteor.Error("meteor-user-not-found", "Meteor user not linked");
  }

  // Generate a new login token
  const stampedToken = Accounts._generateStampedLoginToken();
  const loginToken = stampedToken.token;

  // Store the hashed token
  Accounts._insertHashedLoginToken(meteorUser._id, {
    hashedToken: Accounts._hashLoginToken(loginToken)
  });

  return loginToken;
},
```

**This method:**
1. Validates the custom session token
2. Finds the linked Meteor user
3. Generates a fresh Meteor login token
4. Returns it to the client for `Meteor.loginWithToken()`

---

## 🎯 How The Fix Works

### Login Flow (New User Session)

```
User clicks "Sign In"
    ↓
UserManager.login() called
    ↓
Session + localStorage updated IMMEDIATELY ✅
    ↓
Meteor.loginWithToken() called (async) ⏰
    ↓
User clicks "Schedule Hangout" (while token login in progress)
    ↓
requireAuth() checks:
    - isAuthenticating()? YES → Return early, allow route ✅
    ↓
Route loads, template renders
    ↓
100ms later: Meteor.loginWithToken() completes
    ↓
Meteor.userId() now available ✅
    ↓
Templates reactively update (if needed)
```

### Page Reload Flow (Existing Session)

```
User refreshes page
    ↓
UserManager.init() runs on startup
    ↓
Restores custom session from localStorage ✅
    ↓
Checks: Meteor.userId() exists? NO
    ↓
Calls customUsers.getLoginToken(sessionToken)
    ↓
Server generates fresh Meteor login token
    ↓
Client calls Meteor.loginWithToken()
    ↓
Meteor session restored ✅
    ↓
User navigates to any authenticated page → Works! ✅
```

### Route Protection Logic

```
requireAuth() guard runs
    ↓
Is authenticating?
    ├── YES → Return early (allow route) ⏰
    └── NO → Continue checking...
            ↓
        Is authenticated?
            ├── YES → Allow route ✅
            └── NO → Redirect to /login ❌
```

---

## 📊 Before vs After

### Before Fix ❌

| Scenario | Result |
|----------|--------|
| Login → Navigate immediately | Redirected to /login (race condition) |
| Page reload while logged in | Redirected to /login (no Meteor session) |
| Wait 1 second after login | Works (token login completed) |

### After Fix ✅

| Scenario | Result |
|----------|--------|
| Login → Navigate immediately | Works (route guard waits) |
| Page reload while logged in | Works (session auto-restored) |
| Wait 1 second after login | Works |

---

## 🔍 Key Concepts

### Reactive vs Non-Reactive

- **Reactive**: `Meteor.userId()`, `Session.get()` - automatically trigger re-renders
- **Non-Reactive**: `localStorage.getItem()` - doesn't trigger re-renders

### Asynchronous Operations

- `Meteor.call()` - async server call
- `Meteor.loginWithToken()` - async login
- Route guards run **synchronously** - must handle async auth!

### Three States of Auth

1. **Not Authenticated** - User not logged in → Redirect to /login
2. **Authenticating** - Login in progress → Wait (don't redirect)
3. **Authenticated** - User logged in → Allow access

**Previous code only handled states 1 and 3!**  
**New code handles all 3 states properly.**

---

## 🧪 Testing

### Test Case 1: Immediate Navigation After Login
```
1. Go to /login
2. Enter credentials and click "Sign In"
3. IMMEDIATELY click "Schedule Hangout" (within 100ms)
4. Should load hangout page ✅ (not redirect to login)
```

### Test Case 2: Page Reload Persistence
```
1. Log in successfully
2. Navigate to /hangouts
3. Press F5 to reload
4. Should stay on /hangouts ✅ (not redirect to login)
```

### Test Case 3: Real Unauthenticated Access
```
1. Log out completely
2. Try to navigate to /hangouts
3. Should redirect to /login ✅ (proper protection)
```

### Test Case 4: Profile Access
```
1. Log in as user A
2. Navigate to /profile/:userAId
3. Should load ✅
4. Try to navigate to /profile/:userBId
5. Should redirect to / ✅ (not your profile)
```

---

## 🎓 Lessons Learned

### 1. Always Account for Async Operations
Route guards must handle the "in-between" state where auth is in progress.

### 2. Meteor.loggingIn() is Your Friend
This built-in reactive variable tells you when Meteor auth is in progress.

### 3. Session Restoration Requires Planning
Don't just restore custom auth - restore ALL parts of the auth system.

### 4. Race Conditions Are Subtle
The bug only appeared when users navigated quickly after login - easy to miss in slow testing!

### 5. Defensive Programming
Check multiple auth sources (Meteor, UserManager, Session) to ensure reliability.

---

## 📚 Related Files

### Core Authentication
- `lib/auth_bridge.js` - Auth synchronization utilities
- `lib/route_guards.js` - Route protection logic
- `client/userManager.js` - Custom auth manager
- `lib/collections.js` - Auth methods (login, getCurrentUser, getLoginToken)

### UI Helpers
- `client/helpers/auth_helpers.js` - Template helpers
- `lib/routes.js` - FlowRouter route definitions

### Documentation
- `AUTHENTICATION_FIX_DOCUMENTATION.md` - Initial auth bridge implementation
- `AUTHENTICATION_TIMING_FIX.md` - This document

---

## 🚀 Summary

**The bug:** Users were redirected to login because route guards checked `Meteor.userId()` before the async `Meteor.loginWithToken()` completed.

**The fix:** 
1. Added `isAuthenticating()` to detect login-in-progress state
2. Updated route guards to wait instead of redirecting during auth
3. Enhanced session restoration to sync both auth systems on reload
4. Added server method to generate fresh login tokens

**Result:** Authenticated pages now work immediately after login and persist across page reloads! 🎉
