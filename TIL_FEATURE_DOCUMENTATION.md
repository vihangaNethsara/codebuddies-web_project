# Today I Learned (TIL) Feature Implementation

## Overview
This implementation adds a standalone "Today I Learned" feature that saves entries with date and time to a new database collection and displays them on the user's profile page.

## What Was Added

### 1. New Database Collection
- **TodayILearned**: A new MongoDB collection for storing standalone TIL entries
- Located in: `lib/collections.js`
- Schema includes: title, userId, username, created_at, updated_at, kudos, likedBy

### 2. Server-Side Components

#### Methods (`server/today_i_learned/methods.js`)
- `addTodayILearned`: Save new TIL entry
- `deleteTodayILearned`: Delete user's own TIL entry
- `editTodayILearned`: Edit user's own TIL entry
- `incrementTodayILearnedKudos`: Add kudos to TIL entries

#### Publications (`server/today_i_learned/publications.js`)
- `todayILearnedByUserId`: Get TIL entries for specific user
- `todayILearnedGeneral`: Get all TIL entries (for general display)
- `myTodayILearned`: Get current user's TIL entries

### 3. Client-Side Components

#### Templates (`client/templates/profile/today-i-learned/`)
- `todayILearnedItem`: Individual TIL entry display with date/time
- `profileTodayILearned`: Container for user's TIL entries on profile

#### Functionality
- Displays TIL entries with formatted date and time
- Edit and delete functionality for user's own entries
- Pagination with "Load more" button
- Sweet Alert integration for confirmations

### 4. Updated Hangout Page
- Modified `client/templates/hangout/hangout-consolidated.js`
- Now saves TIL entries to BOTH collections:
  1. Original `Learnings` collection (for hangout tracking)
  2. New `TodayILearned` collection (for profile display with date/time)

### 5. Updated Profile Page
- Modified `client/templates/profile/profile.html`
- Added new section for personal TIL entries
- Separated hangout learnings from personal TIL entries

### 6. Styling
- Added `client/css/_today_i_learned.scss` with responsive styles
- Integrated into main style.scss
- Includes dark theme support

## How It Works

1. **Creating TIL Entry**: When a user enters text in the "Today I Learned" box on any hangout page and presses Enter:
   - Entry is saved to original `Learnings` collection (maintains existing functionality)
   - Entry is also saved to new `TodayILearned` collection with current date/time

2. **Profile Display**: On the user's profile page:
   - Personal TIL entries (from `TodayILearned`) are displayed with date/time
   - Hangout-specific learnings (from `Learnings`) are displayed separately
   - User can edit/delete their own TIL entries

3. **Date/Time Tracking**: Each TIL entry automatically captures:
   - Creation date and time
   - Update date and time (if edited)
   - Formatted display using moment.js

## Files Modified/Added

### Added Files:
- `server/today_i_learned/methods.js`
- `server/today_i_learned/publications.js`
- `client/templates/profile/today-i-learned/today-i-learned.html`
- `client/templates/profile/today-i-learned/today-i-learned.js`
- `client/css/_today_i_learned.scss`

### Modified Files:
- `lib/collections.js` - Added TodayILearned collection
- `client/templates/hangout/hangout-consolidated.js` - Dual saving functionality
- `client/templates/profile/profile.html` - Added TIL section
- `client/css/style.scss` - Added CSS import

## Features

- ✅ Save TIL entries with automatic date/time
- ✅ Display on profile page with formatted date/time
- ✅ Edit/delete functionality for own entries
- ✅ Pagination for large lists
- ✅ Responsive design with dark theme support
- ✅ Maintains existing hangout learning functionality
- ✅ Dual saving to both collections for complete tracking

## Usage

1. Go to any hangout page
2. Type your learning in the "Today I Learned" text area
3. Press Enter to save
4. Visit your profile page to see the entry with date/time
5. Click edit/delete on your own entries to manage them

This implementation ensures backward compatibility while adding the requested standalone TIL functionality with date/time tracking and profile display.