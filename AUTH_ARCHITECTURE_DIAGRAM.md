# Authentication Architecture - Before & After

## BEFORE (Broken)

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  UserManager                      Meteor Auth                │
│  ├─ Session.get("currentUser")    ├─ Meteor.user() ❌ null  │
│  ├─ localStorage token             ├─ Meteor.userId() ❌ null│
│  └─ Works! ✅                      └─ Broken! ❌            │
│                                                               │
│  Templates use Meteor.user() → ❌ Breaks                    │
│  Methods use this.userId → ❌ Breaks                         │
│                                                               │
└───────────────────────────┬─────────────────────────────────┘
                            │
                    ┌───────┴────────┐
                    │   DDP/Methods  │
                    └───────┬────────┘
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                         SERVER                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  CustomUsers Collection     Meteor.users Collection          │
│  ├─ Has user data            ├─ Empty/Not used               │
│  ├─ Has sessions             └─ No sessions                  │
│  └─ Works ✅                                                 │
│                                                               │
│  Publications:                                                │
│  └─ this.userId → ❌ null (No Meteor session!)              │
│                                                               │
│  Methods:                                                     │
│  └─ this.userId → ❌ null (No Meteor session!)              │
│                                                               │
└─────────────────────────────────────────────────────────────┘

PROBLEM: Two separate auth systems, not synchronized!
```

## AFTER (Fixed)

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  UserManager                      Meteor Auth                │
│  ├─ Session.get("currentUser")    ├─ Meteor.user() ✅       │
│  ├─ localStorage token    ┌────►  ├─ Meteor.userId() ✅     │
│  └─ Works! ✅             │       └─ Synced! ✅             │
│                           │                                   │
│  Auth Bridge ─────────────┘                                  │
│  ├─ getUserId() → Works with BOTH! ✅                        │
│  ├─ getCurrentUser() → Works with BOTH! ✅                   │
│  └─ isUserLoggedIn() → Works with BOTH! ✅                   │
│                                                               │
│  Templates use {{currentUser}} → ✅ Works                    │
│  Methods use this.userId → ✅ Works                          │
│                                                               │
└───────────────────────────┬─────────────────────────────────┘
                            │
                    ┌───────┴────────┐
                    │   DDP/Methods  │
                    │  (with bridge) │
                    └───────┬────────┘
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                         SERVER                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  CustomUsers Collection     Meteor.users Collection          │
│  ├─ Has user data    ◄──┐   ├─ Linked users created         │
│  ├─ Has sessions        │   ├─ Login tokens generated        │
│  └─ Works ✅            │   └─ Synced! ✅                    │
│                         │                                     │
│  Auth Bridge ───────────┘                                    │
│  ├─ verifySessionToken()                                     │
│  ├─ Links CustomUser → Meteor.users                          │
│  └─ Makes this.userId work! ✅                               │
│                                                               │
│  Publication Helpers:                                         │
│  ├─ getPublicationUserId() → ✅ Returns userId               │
│  └─ Works with BOTH auth systems! ✅                         │
│                                                               │
│  Methods:                                                     │
│  ├─ this.userId → ✅ Works (via bridge)                      │
│  └─ Fallback to session token → ✅ Works                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘

SOLUTION: Auth Bridge synchronizes both systems!
```

## Login Flow Comparison

### BEFORE (Broken):
```
User Login
    ↓
CustomUsers.login()
    ↓
Create session in UserSessions
    ↓
Return session token to client
    ↓
Store in localStorage
    ↓
❌ Meteor.user() = null
❌ this.userId = null in publications
❌ Protected routes don't work
```

### AFTER (Fixed):
```
User Login
    ↓
CustomUsers.login()
    ↓
Create session in UserSessions
    ↓
Create/Find linked Meteor user ← NEW!
    ↓
Generate Meteor login token ← NEW!
    ↓
Return BOTH tokens to client ← NEW!
    ↓
Store custom token in localStorage
    ↓
Call Meteor.loginWithToken() ← NEW!
    ↓
✅ Meteor.user() = user object
✅ this.userId = user ID in publications
✅ Protected routes work!
✅ Data creation saves correct userId
```

## Key Components

### 1. Auth Bridge (`lib/auth_bridge.js`)
```javascript
// Client
getUserId() → Checks both systems
getCurrentUser() → Checks both systems

// Server
verifySessionToken() → Validates custom sessions
Meteor.userId override → Returns userId from either system
```

### 2. Publication Helpers (`server/lib/publication_helpers.js`)
```javascript
getPublicationUserId() → Works with both auth
publicationUserHasRole() → Works with both auth
```

### 3. Route Guards (`lib/route_guards.js`)
```javascript
requireAuth → Redirects if not authenticated (either system)
isAuthenticated() → Checks both systems
```

### 4. Template Helpers (`client/helpers/auth_helpers.js`)
```javascript
{{isLoggedIn}} → Checks both systems
{{currentUser}} → Gets user from either system
{{hasRole}} → Checks roles in either system
```

## Data Flow: Creating a Hangout

### BEFORE (Failed):
```
User clicks "Create Hangout"
    ↓
Form submitted
    ↓
Meteor.call("createHangout", data)
    ↓
SERVER: Check this.userId
    ↓
❌ this.userId = null (no Meteor session)
    ↓
❌ Error: "Must be logged in"
```

### AFTER (Success):
```
User clicks "Create Hangout"
    ↓
Form submitted
    ↓
Meteor.call("createHangout", data)
    ↓
SERVER: Check this.userId
    ↓
✅ this.userId = user ID (via auth bridge!)
    ↓
OR fallback to session token verification
    ↓
Get user from Meteor.users OR CustomUsers
    ↓
✅ Create hangout with correct userId
    ↓
✅ Success!
```

## Session Persistence Flow

### BEFORE (Lost on Reload):
```
Page Reload
    ↓
UserManager.init()
    ↓
Read token from localStorage
    ↓
Validate with server
    ↓
✅ UserManager.currentUser() = user
❌ Meteor.user() = null (not synced)
    ↓
❌ Protected routes fail
❌ Publications fail
```

### AFTER (Persists Correctly):
```
Page Reload
    ↓
UserManager.init()
    ↓
Read token from localStorage
    ↓
Validate with server
    ↓
Get user data
    ↓
Restore custom session
    ↓
Generate new Meteor login token ← NEW!
    ↓
Call Meteor.loginWithToken() ← NEW!
    ↓
✅ UserManager.currentUser() = user
✅ Meteor.user() = user (synced!)
    ↓
✅ Protected routes work
✅ Publications work
✅ Everything works!
```

---

**Summary**: The Auth Bridge creates a seamless connection between the custom authentication system and Meteor's built-in auth, making both systems work together harmoniously!
