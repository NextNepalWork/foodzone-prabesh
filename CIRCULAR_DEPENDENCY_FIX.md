# Circular Dependency Fix - Website Refresh Issue

## Problem Identified

The website was constantly refreshing due to a **circular dependency** between two service files:

1. `apiService.js` imported `settingsService` at the top
2. `settingsService.js` imported `fetchApi` from `apiService.js`
3. `settingsService` auto-loaded on import, calling `fetchApi.get()`
4. But `fetchApi.get()` tried to access `settingsService.getTimeoutSettings()` which hadn't finished initializing yet

This caused the error:
```
ReferenceError: Cannot access '__WEBPACK_DEFAULT_EXPORT__' before initialization
```

## Solution Applied

### 1. Removed Top-Level Import in apiService.js

**Before:**
```javascript
import settingsService from './settingsService';
```

**After:**
```javascript
// DO NOT import settingsService here - it creates a circular dependency
// settingsService will be lazily imported when needed
```

### 2. Changed to Dynamic Imports in fetchApi Methods

**Before:**
```javascript
const timeouts = typeof settingsService !== 'undefined' && settingsService.getTimeoutSettings 
  ? settingsService.getTimeoutSettings() 
  : { apiColdStartTimeoutMs: 45000, apiTimeoutMs: 30000 };
```

**After:**
```javascript
let timeouts = { apiColdStartTimeoutMs: 45000, apiTimeoutMs: 30000 };
try {
  // Lazy import settingsService to avoid circular dependency
  const { default: settingsService } = await import('./settingsService');
  if (settingsService && settingsService.getTimeoutSettings) {
    timeouts = settingsService.getTimeoutSettings();
  }
} catch (error) {
  // Use default timeouts if settingsService is not available
}
```

This was applied to all 5 fetchApi methods:
- `get()`
- `post()`
- `put()`
- `patch()`
- `delete()`

### 3. Removed Auto-Load from settingsService.js

**Before:**
```javascript
// Auto-load settings on import
settingsService.loadSettings();
```

**After:**
```javascript
// DO NOT auto-load settings on import - it causes circular dependency issues
// Settings will be loaded on first use by components via useSettings hook
```

### 4. Restarted Frontend

Stopped and restarted the frontend development server to clear webpack's cache and force a clean rebuild with the new code.

## How It Works Now

1. **apiService.js** no longer imports settingsService at the top
2. **settingsService.js** no longer auto-loads on import
3. When `fetchApi` methods need timeout settings, they dynamically import settingsService
4. React components load settings via the `useSettings` hook on first render
5. No circular dependency = no initialization errors = no constant refreshing

## Files Modified

- `client/src/services/apiService.js` - Removed import, added dynamic imports
- `client/src/services/settingsService.js` - Removed auto-load

## Testing Results

✅ Frontend compiled successfully without errors
✅ No circular dependency warnings
✅ Webpack bundle built cleanly

## Next Steps for User

1. **Hard refresh the browser** (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows) to clear browser cache
2. Monitor browser console - the initialization error should be gone
3. Verify settings load correctly (check table count, restaurant info, etc.)
4. Test that all API calls work with proper timeouts
5. Confirm no more constant page refreshes

## Additional Notes

The service worker (sw.js) errors about chrome-extension scheme are unrelated to this fix - they're caused by browser extensions trying to cache their own resources, which is expected behavior and can be ignored.
