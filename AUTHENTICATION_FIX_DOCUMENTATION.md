# Authentication System Fix - Documentation

## Problem Summary

The CodeBuddies application had critical authentication issues where logged-in features didn't work properly after login:

### Root Causes Identified:

1. **Dual Authentication Systems**: The app had both Meteor's built-in authentication AND a custom authentication system running in parallel without proper synchronization
2. **Session Persistence Issues**: Custom login stored sessions in `Session` and `localStorage` but didn't integrate with Meteor's auth, causing `Meteor.user()` and `Meteor.userId()` to return `null`
3. **Inconsistent Auth Checks**: Routes, publications, and methods used different auth mechanisms inconsistently
4. **Data Creation Problems**: Hangout and Group creation relied on `Meteor.userId()` which was always null with custom auth

## Solutions Implemented

### 1. Authentication Bridge (`lib/auth_bridge.js`)

**Purpose**: Bridges the custom authentication system with Meteor's built-in auth

**Key Features**:
- Client-side helpers: `getUserId()`, `getCurrentUser()`, `isUserLoggedIn()`
- Server-side session token verification
- DDP connection interception to extract custom session tokens
- Makes `Meteor.userId()` work with custom auth in publications/methods

**Usage**:
```javascript
// Client-side
const userId = getUserId(); // Works with both auth systems
const user = getCurrentUser(); // Works with both auth systems
const isLoggedIn = isUserLoggedIn(); // Works with both auth systems

// Server-side (in methods/publications)
const userId = this.userId; // Now works with custom auth too!
```

### 2. Updated UserManager (`client/userManager.js`)

**Changes**:
- Login now creates both custom session AND Meteor login token
- Uses `Meteor.loginWithToken()` to sync with Meteor's auth
- Logout now logs out from both systems
- Session persists across page reloads

**How it works**:
1. User logs in with custom credentials
2. Server creates custom session + generates Meteor login token
3. Client stores custom session in localStorage
4. Client also logs into Meteor using the token
5. Now both `UserManager.currentUser()` AND `Meteor.user()` work!

### 3. Server Login Method Enhancement (`lib/collections.js`)

**Changes**:
- `customUsers.login` now creates a linked Meteor user account
- Generates Meteor login token for client-side sync
- Syncs roles between custom user and Meteor user
- Maintains backward compatibility

**Flow**:
```
Custom Login → Create/Find Meteor User → Generate Login Token → Return to Client
```

### 4. Publication Helpers (`server/lib/publication_helpers.js`)

**New Functions**:
- `getPublicationUserId()`: Gets user ID in publications from either auth system
- `getPublicationUser()`: Gets user object in publications
- `publicationUserHasRole()`: Checks roles in publications

**Updated Publications**:
- `server/publications.js` - Problem reports
- `server/hangouts/publications.js` - Hangouts
- `server/users/publications.js` - User data
- `server/study_groups/publications.js` - Study groups

**Before**:
```javascript
Meteor.publish("myData", function() {
  if (!this.userId) return this.ready(); // Always fails with custom auth
  return MyCollection.find({ userId: this.userId });
});
```

**After**:
```javascript
Meteor.publish("myData", function() {
  const userId = getPublicationUserId.call(this); // Works with both!
  if (!userId) return this.ready();
  return MyCollection.find({ userId: userId });
});
```

### 5. Route Guards (`lib/route_guards.js`)

**New Guards**:
- `requireAuth`: Redirects unauthenticated users to login
- `requireAuthForProfile`: Ensures users can only access their own profile
- `redirectIfAuth`: Redirects authenticated users away from login/signup
- `isAuthenticated()`: Checks if user is logged in (either system)
- `getCurrentUserId()`: Gets user ID (either system)
- `getCurrentUserObject()`: Gets user object (either system)

**Updated Routes**:
- `/notifications` - Now uses `requireAuth`
- `/my-study-groups` - Now uses `requireAuth`
- `/profile/:name/:userId` - Uses enhanced auth check
- `/login` and `/signup` - Redirects if already authenticated

**Usage**:
```javascript
FlowRouter.route("/protected-page", {
  name: "protected",
  triggersEnter: [requireAuth], // Simple and clean!
  action: function() {
    // User is guaranteed to be authenticated here
  }
});
```

### 6. Method Updates

**Updated Methods**:
- `createHangout` - Now checks both auth systems
- `createNewStudyGroup` - Now checks both auth systems

**Before**:
```javascript
Meteor.methods({
  createHangout: function(data) {
    if (!this.userId) throw new Meteor.Error("not-logged-in");
    const user = Meteor.user(); // null with custom auth!
  }
});
```

**After**:
```javascript
Meteor.methods({
  createHangout: function(data) {
    const userId = this.userId || (data.sessionToken && verifySessionToken(data.sessionToken));
    if (!userId) throw new Meteor.Error("not-logged-in");
    const user = Meteor.users.findOne(userId) || CustomUsers.findOne(userId);
    // Now works with both auth systems!
  }
});
```

### 7. Client-Side Helpers (`client/helpers/auth_helpers.js`)

**New Template Helpers**:
- `{{currentUserId}}` - Get current user ID
- `{{currentUser}}` - Get current user object
- `{{isLoggedIn}}` - Check if logged in
- `{{currentUsername}}` - Get username
- `{{isOwner ownerId}}` - Check if current user is owner
- `{{hasRole 'admin'}}` - Check if user has role

**Usage in Templates**:
```handlebars
{{#if isLoggedIn}}
  <p>Welcome, {{currentUsername}}!</p>
  {{#if isOwner hangout.host.id}}
    <button>Edit Hangout</button>
  {{/if}}
{{else}}
  <a href="/login">Login</a>
{{/if}}
```

## File Changes Summary

### New Files Created:
1. `lib/auth_bridge.js` - Bridge between auth systems
2. `lib/route_guards.js` - Route authentication guards
3. `server/lib/publication_helpers.js` - Publication auth helpers
4. `client/helpers/auth_helpers.js` - Template helpers for auth

### Modified Files:
1. `client/userManager.js` - Sync with Meteor auth on login/logout
2. `lib/collections.js` - Generate Meteor login tokens
3. `server/publications.js` - Use helper functions
4. `server/hangouts/publications.js` - Use helper functions
5. `server/hangouts/methods.js` - Support both auth systems
6. `server/users/publications.js` - Use helper functions
7. `server/study_groups/publications.js` - Use helper functions
8. `server/study_groups/methods.js` - Support both auth systems
9. `lib/routes.js` - Use route guards

## Testing Checklist

### Login Flow:
- [ ] User can log in with username/email and password
- [ ] After login, `Meteor.user()` returns user object
- [ ] After login, `Meteor.userId()` returns user ID
- [ ] User session persists after page reload
- [ ] `UserManager.currentUser()` and `Meteor.user()` return same user

### Protected Routes:
- [ ] Unauthenticated users are redirected to /login
- [ ] `/notifications` requires authentication
- [ ] `/my-study-groups` requires authentication
- [ ] `/profile/:name/:userId` requires authentication
- [ ] Users can only access their own profiles (unless admin)

### Data Creation:
- [ ] Logged-in users can create hangouts
- [ ] Hangout is saved with correct userId
- [ ] Logged-in users can create study groups
- [ ] Study group is saved with correct userId
- [ ] User roles are properly assigned

### Publications:
- [ ] Users can see their own data in publications
- [ ] Admins can see all data in admin publications
- [ ] User-specific data is properly filtered
- [ ] Publications work after page reload

### Logout Flow:
- [ ] User can log out successfully
- [ ] After logout, `Meteor.user()` returns null
- [ ] After logout, `UserManager.currentUser()` returns null
- [ ] Session is cleared from localStorage
- [ ] User is redirected to appropriate page

## Migration Guide for Developers

### Using Authentication in Templates:

**Old Way**:
```javascript
Template.myTemplate.helpers({
  isLoggedIn() {
    return !!Meteor.userId(); // Fails with custom auth
  }
});
```

**New Way**:
```handlebars
{{#if isLoggedIn}}
  <!-- Use built-in helper -->
{{/if}}
```

### Using Authentication in Methods:

**Old Way**:
```javascript
Meteor.methods({
  myMethod: function() {
    if (!this.userId) throw new Meteor.Error("not-logged-in");
    const user = Meteor.user(); // null with custom auth
  }
});
```

**New Way**:
```javascript
Meteor.methods({
  myMethod: function(data) {
    const userId = this.userId || (data.sessionToken && verifySessionToken(data.sessionToken));
    if (!userId) throw new Meteor.Error("not-logged-in");
    const user = Meteor.users.findOne(userId) || CustomUsers.findOne(userId);
  }
});
```

### Using Authentication in Publications:

**New Way**:
```javascript
Meteor.publish("myPublication", function() {
  const userId = getPublicationUserId.call(this);
  if (!userId) return this.ready();
  
  if (publicationUserHasRole.call(this, ["admin"], "CB")) {
    // Admin logic
  }
  
  return MyCollection.find({ userId: userId });
});
```

### Using Authentication in Routes:

**New Way**:
```javascript
FlowRouter.route("/my-page", {
  name: "myPage",
  triggersEnter: [requireAuth], // Use the guard!
  action: function() {
    // Render page
  }
});
```

## Backward Compatibility

All changes are **backward compatible**:
- Existing Meteor auth users will continue to work
- Custom auth users will now also work
- No database migrations required
- Existing code that uses `Meteor.user()` will work for both auth types

## Future Improvements

1. **Consolidate Auth Systems**: Eventually migrate all users to use only Meteor's auth
2. **Token Refresh**: Implement automatic token refresh for long-lived sessions
3. **OAuth Integration**: Enhance GitHub/Slack OAuth to work with both systems
4. **Password Reset**: Implement password reset flow for custom users
5. **Email Verification**: Add email verification for custom users
6. **Session Management**: Add session management UI to view/revoke active sessions

## Troubleshooting

### "Not logged in" errors:
- Check if `UserManager.init()` is called on client startup
- Verify session token exists in localStorage
- Check browser console for auth errors

### Meteor.user() still returns null:
- Check if `lib/auth_bridge.js` is loaded
- Verify login token is generated on server
- Check if `Meteor.loginWithToken()` is called after custom login

### Publications return empty:
- Check if publication uses `getPublicationUserId()` helper
- Verify user has proper permissions/roles
- Check server logs for publication errors

### Data creation fails:
- Verify method checks both `this.userId` and session token
- Check if user object is found in both collections
- Verify user has permissions to create the resource

## Support

For issues or questions, please:
1. Check this documentation first
2. Review the code comments in modified files
3. Test with the provided testing checklist
4. Contact the development team

---

**Last Updated**: October 9, 2025  
**Author**: Senior Full-Stack Developer  
**Version**: 1.0
