# WeSplit Design System Guide

🎉 **Welcome! You've successfully launched WeSplit and you're ready to start designing.**

## 🚀 **Quick Start for New Designers**

**Just finished the setup in README.md? Perfect! Here's what to do next:**

### ⚡ **30-Second Test Edit**
**Verify your editing environment works:**
1. Open `src/theme/colors.ts`
2. Change `primaryGreen: '#C5FF00'` to `primaryGreen: '#FF00C5'` (pink)
3. Save the file (Ctrl+S / Cmd+S)
4. Watch the app reload with pink accents!
5. Change it back to `#C5FF00`

✅ **If you see the color change, you're all set to start designing!**

### 🎯 **Most Common Edits**
**90% of visual changes happen in these 4 files:**

| File | Controls | Example Change |
|------|----------|----------------|
| 📁 `src/theme/colors.ts` | **All app colors** | Change primary brand color |
| 📁 `src/theme/spacing.ts` | **Layout & sizes** | Adjust button heights, margins |
| 📁 `src/theme/typography.ts` | **Text styles** | Change font sizes, weights |
| 📁 `src/screens/Dashboard/styles.ts` | **Main screen** | Customize home screen layout |

### 🔧 **Making Changes**
1. **Edit any file** → **Save** → **App reloads automatically**
2. **Can't see changes?** → Press `r` in terminal to manually reload
3. **App crashes?** → Check terminal for red error messages

---

## 🎨 Overview

WeSplit uses a comprehensive design system based on **dark theme** with **bright green accents** (#C5FF00). The system is organized into reusable design tokens and component styles that ensure consistency across the entire application.

## 📁 File Structure

```
src/
├── theme/                    # Core design tokens
│   ├── colors.ts            # All color definitions
│   ├── spacing.ts           # Spacing scale and layout values
│   ├── typography.ts        # Font sizes, weights, and text styles
│   └── index.ts             # Theme utilities and exports
└── screens/                 # Screen-specific styles
    ├── Dashboard/
    │   ├── DashboardScreen.tsx
    │   └── styles.ts        # Dashboard-specific styles
    ├── AddExpense/
    │   ├── AddExpenseScreen.tsx
    │   └── styles.ts        # AddExpense-specific styles
    └── [ScreenName]/
        ├── [ScreenName]Screen.tsx
        └── styles.ts        # Screen-specific styles
```

## 🎯 Design Tokens

### Colors

All colors are defined in `src/theme/colors.ts` and organized by usage:

#### Primary Brand Colors
- **Primary Green**: `#C5FF00` - Main brand color for buttons, highlights
- **Primary Green Dark**: `#A5EA15` - Darker shade for hover states
- **Primary Green Light**: `#D7FF33` - Lighter shade for backgrounds
- **Primary Green Alpha**: `rgba(197, 255, 0, 0.1)` - Transparent overlay

#### Dark Theme Colors
- **Dark Background**: `#1B1B1B` - Main app background
- **Dark Card**: `#2A2A2A` - Card and container backgrounds
- **Dark Border**: `#333333` - Border colors for cards and inputs

#### Text Colors
- **Text Light**: `#FFFFFF` - Primary text on dark backgrounds
- **Text Light Secondary**: `#B0B0B0` - Secondary text
- **Text Gray**: `#A89B9B` - Muted text and placeholders

#### Usage Examples
```typescript
import { colors } from '../../theme';

// Using colors in styles
const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primaryGreen,
    borderColor: colors.darkBorder,
  },
  text: {
    color: colors.textLight,
  },
});
```

### Spacing

Spacing follows an **8px grid system** defined in `src/theme/spacing.ts`:

#### Base Scale
- `spacing.xs`: 4px
- `spacing.sm`: 8px
- `spacing.md`: 16px
- `spacing.lg`: 24px
- `spacing.xl`: 32px

#### Component-Specific
- `spacing.screenPadding`: 20px - Standard screen padding
- `spacing.cardPadding`: 16px - Card internal padding
- `spacing.buttonHeight`: 48px - Standard button height

#### Usage Examples
```typescript
import { spacing } from '../../theme';

const styles = StyleSheet.create({
  container: {
    padding: spacing.screenPadding,
    marginBottom: spacing.lg,
  },
  button: {
    height: spacing.buttonHeight,
    paddingHorizontal: spacing.md,
  },
});
```

### Typography

Typography system defined in `src/theme/typography.ts`:

#### Font Sizes
- `typography.fontSize.xs`: 12px
- `typography.fontSize.sm`: 14px
- `typography.fontSize.md`: 16px (base)
- `typography.fontSize.lg`: 18px
- `typography.fontSize.xxl`: 24px
- `typography.fontSize.hero`: 48px (for large amounts)

#### Predefined Text Styles
- `typography.textStyles.h1` - Large headings
- `typography.textStyles.body` - Regular body text
- `typography.textStyles.button` - Button text
- `typography.textStyles.caption` - Small secondary text

#### Usage Examples
```typescript
import { typography } from '../../theme';

const styles = StyleSheet.create({
  title: {
    ...typography.textStyles.h1,
    color: colors.textLight,
  },
  description: {
    ...typography.textStyles.body,
    color: colors.textLightSecondary,
  },
});
```

## 🧩 Screen Organization

Each screen follows a consistent pattern:

### Structure
```
src/screens/[ScreenName]/
├── [ScreenName]Screen.tsx    # React component
└── styles.ts                 # All styles for this screen
```

### Style File Organization

Each `styles.ts` file is organized with clear sections and comments:

```typescript
/**
 * =======================================================================
 * [SCREEN NAME] STYLES
 * =======================================================================
 * Description of the screen and its main design patterns
 * 
 * DESIGN NOTES:
 * - Key design decisions
 * - Color usage patterns
 * - Layout considerations
 * 
 * FIGMA REFERENCE: [Link or reference to design]
 * =======================================================================
 */

export const styles = StyleSheet.create({
  
  // === MAIN CONTAINER & LAYOUT ===
  container: {
    flex: 1,
    backgroundColor: colors.darkBackground,
  },
  
  // === HEADER SECTION ===
  header: {
    // Header styles
  },
  
  // === CONTENT SECTIONS ===
  // ... organized by UI sections
  
});
```

## 🎨 Common UI Patterns

### Cards
```typescript
// Standard card style
card: {
  backgroundColor: colors.darkCard,
  borderRadius: spacing.radiusLg,
  padding: spacing.cardPadding,
  borderWidth: spacing.borderWidthThin,
  borderColor: colors.darkBorder,
}
```

### Buttons
```typescript
// Primary button
primaryButton: {
  backgroundColor: colors.primaryGreen,
  borderRadius: spacing.radiusMd,
  height: spacing.buttonHeight,
  paddingHorizontal: spacing.lg,
  justifyContent: 'center',
  alignItems: 'center',
}

// Secondary button
secondaryButton: {
  backgroundColor: 'transparent',
  borderWidth: spacing.borderWidthThin,
  borderColor: colors.darkBorder,
  borderRadius: spacing.radiusMd,
  height: spacing.buttonHeight,
  paddingHorizontal: spacing.lg,
  justifyContent: 'center',
  alignItems: 'center',
}
```

### Inputs
```typescript
// Standard input
input: {
  backgroundColor: colors.inputBackground,
  borderRadius: spacing.radiusMd,
  paddingHorizontal: spacing.inputPaddingHorizontal,
  paddingVertical: spacing.inputPaddingVertical,
  borderWidth: spacing.borderWidthThin,
  borderColor: colors.inputBorder,
  color: colors.textLight,
  fontSize: typography.fontSize.md,
}
```

## 🔧 How to Modify Styles

### 1. Changing Colors
To update colors across the app:
1. Edit `src/theme/colors.ts`
2. Colors will automatically update everywhere they're used

### 2. Adjusting Spacing
To modify spacing:
1. Edit `src/theme/spacing.ts`
2. Update semantic spacing values (screenPadding, cardPadding, etc.)

### 3. Updating Typography
To change text styling:
1. Edit `src/theme/typography.ts`
2. Modify fontSize scale or textStyles presets

### 4. Screen-Specific Changes
To modify a specific screen:
1. Navigate to `src/screens/[ScreenName]/styles.ts`
2. Find the relevant style section using comments
3. Modify the style properties

## 📱 Screen-by-Screen Guide

### Dashboard Screen
**File**: `src/screens/Dashboard/styles.ts`

**Key Components**:
- **Balance Card**: Large green card with balance amount
- **Action Buttons**: Grid of circular action buttons
- **Groups List**: Cards showing group information

**Key Styles**:
```typescript
balanceCard: {
  backgroundColor: colors.primaryGreen,
  // Large prominent card for balance display
}

actionButtonCircle: {
  // Circular action buttons with green borders
}

groupCard: {
  backgroundColor: colors.darkCard,
  // Cards for displaying group information
}
```

### Add Expense Screen
**File**: `src/screens/AddExpense/styles.ts`

**Key Components**:
- **Amount Input**: Large currency input
- **Split Options**: Toggle between equal/custom split
- **Member Selection**: List of group members

### Send/Request Screens
**File**: `src/screens/Send/styles.ts` & `src/screens/Request/styles.ts`

**Key Components**:
- **Contact Selection**: List of contacts with avatars
- **Amount Entry**: Currency input with conversion
- **Confirmation**: Summary of transaction details

## 🎯 Best Practices

### 1. Use Design Tokens
Always use values from the theme files instead of hardcoded values:
```typescript
// ✅ Good
backgroundColor: colors.darkCard,
padding: spacing.md,
fontSize: typography.fontSize.lg,

// ❌ Avoid
backgroundColor: '#2A2A2A',
padding: 16,
fontSize: 18,
```

### 2. Follow Naming Conventions
Use descriptive names that indicate purpose:
```typescript
// ✅ Good
balanceCard: { },
actionButton: { },
headerTitle: { },

// ❌ Avoid
greenBox: { },
button1: { },
text: { },
```

### 3. Group Related Styles
Organize styles by UI sections with comments:
```typescript
// === HEADER SECTION ===
header: { },
headerTitle: { },
backButton: { },

// === CONTENT SECTION ===
contentContainer: { },
// ...
```

### 4. Use Semantic Spacing
Use semantic spacing names when possible:
```typescript
// ✅ Good
padding: spacing.screenPadding,
marginBottom: spacing.sectionSpacing,

// ❌ Less clear
padding: spacing.lg,
marginBottom: spacing.xl,
```

## 🔄 Making Global Changes

### Updating the Primary Color
1. Open `src/theme/colors.ts`
2. Update `primaryGreen: '#NewColor'`
3. The change will apply to all buttons, highlights, and accents

### Changing Default Spacing
1. Open `src/theme/spacing.ts`
2. Update `screenPadding` or other semantic values
3. All screens using these values will update automatically

### Modifying Typography Scale
1. Open `src/theme/typography.ts`
2. Update the `fontSize` scale or `textStyles` presets
3. All text using these styles will update

## 🐛 Troubleshooting

### Style Not Applying
1. Check import statements: `import { colors, spacing, typography } from '../../theme';`
2. Verify the style name exists in the StyleSheet
3. Check for typos in property names

### Colors Not Updating
1. Ensure you're using `colors.colorName` from the theme
2. Check if the color exists in `colors.ts`
3. Restart the development server if needed

### Layout Issues
1. Verify spacing values are from the theme
2. Check for missing flex or positioning properties
3. Use React Native Debugger to inspect the layout

## 📚 Resources

- **React Native Styling**: [Official Documentation](https://reactnative.dev/docs/style)
- **Design System Principles**: [Material Design](https://material.io/design)
- **8px Grid System**: [Intro to the 8-Point Grid System](https://builttoadapt.io/intro-to-the-8-point-grid-system-d2573cde8632)

---

For questions or contributions to the design system, please reach out to the development team or create an issue in the project repository. 