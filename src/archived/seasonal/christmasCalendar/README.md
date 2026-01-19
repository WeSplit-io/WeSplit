# Christmas Calendar - Archived

This folder contains the Christmas/Advent Calendar feature that has been archived.

## Files Moved

- `ChristmasCalendar.tsx` - Main calendar component
- `ChristmasCalendarScreen.tsx` - Screen wrapper for the calendar
- `ChristmasCalendarHistoryScreen.tsx` - History screen for claimed gifts
- `christmasCalendarService.ts` - Service for calendar operations
- `christmasCalendarConfig.ts` - Gift configuration
- `christmasCalendarTileStyles.ts` - Tile styling configuration

## Changes Made

1. **Removed from UI**: The Christmas Calendar button has been removed from `RewardsScreen.tsx`
2. **Navigation Disabled**: Navigation routes and helpers have been commented out in:
   - `App.tsx` - Screen registrations commented out
   - `src/utils/core/navigationUtils.ts` - Route constants and navigation methods commented out
3. **Service References**: References in `rewardSystemVerification.ts` have been commented out
4. **Types Preserved**: Type definitions remain in `src/types/rewards.ts` for potential future use

## Restoring the Feature

To restore this feature:

1. Uncomment navigation routes in `navigationUtils.ts`
2. Uncomment screen registrations in `App.tsx`
3. Update import paths in `App.tsx` to point to this archived folder
4. Add the button back to `RewardsScreen.tsx`
5. Uncomment service references in `rewardSystemVerification.ts`

## Note

The types (`ChristmasCalendarGift`, `ChristmasCalendarDay`, `ChristmasCalendarStatus`, `ChristmasCalendarClaim`) remain in `src/types/rewards.ts` and can be kept for future seasonal features.
