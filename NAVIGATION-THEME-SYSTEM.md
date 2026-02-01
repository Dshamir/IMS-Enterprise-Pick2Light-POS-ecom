# Navigation Theme System Documentation

## Overview

The **Per-Page Theme Customization System** allows you to assign unique color themes to each page in your application's navigation menu. This powerful feature enables visual customization without writing code, providing 4 professional themes with light/dark variants.

**Version**: 2.10.0
**Implementation Date**: October 12, 2025
**Status**: Production Ready ✅

---

## Table of Contents

1. [Available Themes](#available-themes)
2. [User Guide](#user-guide)
3. [Technical Architecture](#technical-architecture)
4. [API Reference](#api-reference)
5. [Database Schema](#database-schema)
6. [CSS Theme Classes](#css-theme-classes)
7. [Developer Guide](#developer-guide)
8. [Troubleshooting](#troubleshooting)

---

## Available Themes

### Theme 1: Standard (Light/Dark Toggle)
**Theme ID**: `standard`
**Variants**: light, dark, auto

Clean, professional black and white design suitable for most business applications.

**Light Mode Colors**:
- Background: White (#FFFFFF)
- Foreground: Near-black (#0A0A0A)
- Primary: Dark gray (#171717)
- Accent: Light gray (#F5F5F5)
- Borders: Gray (#E5E5E5)

**Dark Mode Colors**:
- Background: Near-black (#0A0A0A)
- Foreground: White (#FAFAFA)
- Primary: White (#FAFAFA)
- Accent: Dark gray (#262626)
- Borders: Dark gray (#262626)

**Best Used For**: Home, Dashboard, Products, Orders, Reports, Settings

---

### Theme 2: Bumblebee (Always Dark)
**Theme ID**: `bumblebee`
**Variants**: dark (only)

High-contrast black background with vibrant yellow accents for optimal visibility in warehouse/industrial environments.

**Colors**:
- Background: Deep black (#0f0f0f)
- Card Background: Charcoal (#1a1a1a)
- Accent: Bright yellow (#ffd60a)
- Text: White (#FFFFFF)
- Borders: Dark gray (#212529)

**Best Used For**: Pick2Light Search, Scan Barcode, Warehouse operations

**Why Always Dark**: Optimized for low-light warehouse environments and LED indicator visibility.

---

### Theme 3: Modern Punch (Light/Dark Toggle)
**Theme ID**: `modern-punch`
**Variants**: light, dark, auto

Bold purple and pink gradient theme for modern, energetic interfaces.

**Light Mode Colors**:
- Background: White (#FFFFFF)
- Foreground: Purple-800 (#6B2198)
- Primary: Purple-600 (#9333EA)
- Accent: Purple-400 (#C084FC)
- Gradients: #667eea → #764ba2 → #f093fb

**Dark Mode Colors**:
- Background: Deep purple (#1E1B4B)
- Foreground: Light purple (#E9D5FF)
- Primary: Purple-400 (#C084FC)
- Accent: Purple-400 (#A78BFA)
- Gradients: Brighter versions for contrast

**Best Used For**: AI Command Center, AI Assistant, innovative/tech-focused features

---

### Theme 4: Marvel (Light/Dark Toggle) ⭐ NEW
**Theme ID**: `marvel`
**Variants**: light, dark, auto

Premium theme with light lavender backgrounds and vibrant multi-colored gradient accents.

**Light Mode Colors**:
- Background: Light lavender (#F0EBFF)
- Secondary Background: Lighter lavender (#E8E0FF)
- Card Background: White (#FFFFFF)
- Foreground: Purple-800 (#6B21A8)
- Primary: Purple-400 (#A78BFA)
- Header Gradient: #A78BFA → #C084FC
- Border Radius: 0.75rem (slightly rounder)

**Dark Mode Colors**:
- Background: Deep purple (#1E1B4B)
- Secondary Background: Darker purple (#312E81)
- Card Background: Dark purple (#2D2A5F)
- Foreground: Light lavender (#F0EBFF)
- Primary: Purple-400 (#C084FC)
- Header Gradient: #C084FC → #E879F9 (brighter)

**Special Gradient Accents** (Available in both light and dark):
- **Blue**: #3B82F6 → #06B6D4 (cyan gradient)
- **Green**: #10B981 → #34D399 (emerald gradient)
- **Purple**: #8B5CF6 → #A78BFA (violet gradient)
- **Orange**: #F97316 → #FB923C (amber gradient)
- **Pink**: #EC4899 → #F472B6 (rose gradient)
- **Red**: #EF4444 → #F87171 (red gradient)

**Best Used For**: Dashboard, Analytics, Premium features, Customer-facing pages

---

## User Guide

### How to Change a Page's Theme

1. **Navigate to Settings**
   - Click "Settings" in the sidebar navigation
   - Or go to `http://localhost:3000/settings`

2. **Open Navigation Tab**
   - Click the "Navigation" tab (7th tab in Settings)
   - You'll see a list of all navigation menu items

3. **Select Page to Customize**
   - Find the navigation item you want to theme
   - Click the **Edit icon** (✏️) on the right side

4. **Choose Theme**
   - Scroll to the **"Page Theme"** section
   - You'll see 4 visual preview cards:
     - **Standard**: White/black card with gray line
     - **Bumblebee**: Black card with yellow dot
     - **Modern Punch**: Purple gradient card
     - **Marvel**: Lavender card with colorful dots
   - Click the theme card you want to apply

5. **Select Variant** (if applicable)
   - For Standard, Modern Punch, and Marvel themes:
     - Choose **Light** for light mode
     - Choose **Dark** for dark mode
     - Choose **Auto** to follow system preference
   - For Bumblebee theme:
     - Variant selector is hidden (always dark)

6. **Save Changes**
   - Click the **"Update"** button at the bottom
   - You'll see a success toast notification

7. **View Theme**
   - Navigate to the page you just themed
   - The new theme will apply automatically!
   - No page reload required

### Example Workflows

#### Scenario 1: Apply Marvel Theme to Dashboard
```
1. Settings → Navigation tab
2. Find "Dashboard" item → Click Edit (✏️)
3. Scroll to "Page Theme" section
4. Click "Marvel" preview card
5. Select "Light" from variant dropdown
6. Click "Update"
7. Navigate to Dashboard → Beautiful lavender theme applied!
```

#### Scenario 2: Apply Bumblebee Theme to Products Page
```
1. Settings → Navigation tab
2. Find "Products" item → Click Edit (✏️)
3. Scroll to "Page Theme" section
4. Click "Bumblebee" preview card
   (Variant automatically set to "dark")
5. Click "Update"
6. Navigate to Products → Black with yellow accents applied!
```

---

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interaction Layer                 │
│  Settings → Navigation → Edit Item → Select Theme          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                    NavigationItemDialog                     │
│  - Visual theme preview cards                              │
│  - Theme variant selector                                  │
│  - Form state management                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                              │
│  PUT /api/navigation/[id]                                  │
│  - Validate theme ('standard', 'bumblebee', etc.)          │
│  - Validate variant ('light', 'dark', 'auto')              │
│  - Update database                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                           │
│  navigation_items table:                                   │
│  - theme: TEXT                                             │
│  - theme_variant: TEXT                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                 PageThemeProvider (Client)                  │
│  - Fetch navigation items on mount                         │
│  - Match current pathname to navigation item               │
│  - Apply theme class to HTML element                       │
│  - Listen for route changes                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                      CSS Theme System                       │
│  - .theme-bumblebee                                        │
│  - .theme-modern-punch / .dark                            │
│  - .theme-marvel / .dark                                  │
│  - CSS custom properties (--background, --foreground...)   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**On Page Load:**
```
1. Layout renders → PageThemeProvider mounts
2. Provider fetches /api/navigation
3. usePathname() gets current route
4. findMatchingItem() matches pathname to navigation item
5. applyTheme() sets HTML classes
6. CSS custom properties update
7. Page renders with theme
```

**On Navigation:**
```
1. User clicks navigation link
2. Next.js router changes pathname
3. PageThemeProvider useEffect triggers
4. findMatchingItem() finds new page's theme
5. applyTheme() updates HTML classes
6. Theme transitions smoothly
7. No page reload required
```

---

## API Reference

### GET /api/navigation

Fetch all navigation items including theme data.

**Response**:
```json
{
  "items": [
    {
      "id": "nav-home",
      "name": "Home",
      "href": "/",
      "icon_name": "Home",
      "theme": "standard",
      "theme_variant": "light",
      "display_order": 0,
      "is_visible": 1,
      "is_group": 0,
      "subRoutes": []
    },
    {
      "id": "nav-pick2light",
      "name": "Pick2Light Search",
      "href": "/pick2light",
      "icon_name": "Search",
      "theme": "bumblebee",
      "theme_variant": "dark",
      "display_order": 6,
      "is_visible": 1,
      "is_group": 0,
      "subRoutes": []
    }
  ]
}
```

### PUT /api/navigation/[id]

Update navigation item including theme configuration.

**Request Body**:
```json
{
  "name": "Dashboard",
  "href": "/dashboard",
  "icon_name": "LayoutDashboard",
  "theme": "marvel",
  "theme_variant": "light"
}
```

**Validation**:
- `theme`: Must be one of: 'standard', 'bumblebee', 'modern-punch', 'marvel'
- `theme_variant`: Must be one of: 'light', 'dark', 'auto'

**Response** (Success):
```json
{
  "success": true,
  "message": "Navigation item updated successfully"
}
```

**Response** (Validation Error):
```json
{
  "error": "Invalid theme. Must be one of: standard, bumblebee, modern-punch, marvel"
}
```
HTTP Status: 400

---

## Database Schema

### navigation_items Table (Enhanced)

```sql
CREATE TABLE navigation_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  href TEXT,
  icon_name TEXT NOT NULL,
  parent_id TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1,
  is_group INTEGER NOT NULL DEFAULT 0,
  badge_key TEXT,
  highlight INTEGER DEFAULT 0,
  theme TEXT DEFAULT 'standard',              -- NEW
  theme_variant TEXT DEFAULT 'light',         -- NEW
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES navigation_items(id) ON DELETE CASCADE
);

-- Performance index for theme queries
CREATE INDEX idx_navigation_theme ON navigation_items(theme);
```

### Migration 023

**File**: `/db/migrations/023_navigation_themes.sql`

**Actions**:
1. Add `theme` column with default 'standard'
2. Add `theme_variant` column with default 'light'
3. Update existing items with appropriate themes:
   - Home, Dashboard, Products → 'standard' (light)
   - Pick2Light → 'bumblebee' (dark)
   - AI Command Center → 'modern-punch' (dark)
4. Create index on theme column

**Automatic Application**: Migration runs on server startup via database initialization system.

---

## CSS Theme Classes

### Theme Class Application

Themes are applied to the `<html>` element:

```html
<!-- Standard Theme (Light) -->
<html class="light">

<!-- Standard Theme (Dark) -->
<html class="dark">

<!-- Bumblebee Theme (Always Dark) -->
<html class="theme-bumblebee dark">

<!-- Modern Punch Theme (Light) -->
<html class="theme-modern-punch light">

<!-- Modern Punch Theme (Dark) -->
<html class="theme-modern-punch dark">

<!-- Marvel Theme (Light) -->
<html class="theme-marvel light">

<!-- Marvel Theme (Dark) -->
<html class="theme-marvel dark">
```

### CSS Custom Properties

All themes define these CSS custom properties:

```css
:root {
  --background: <hsl values>;
  --foreground: <hsl values>;
  --card: <hsl values>;
  --card-foreground: <hsl values>;
  --popover: <hsl values>;
  --popover-foreground: <hsl values>;
  --primary: <hsl values>;
  --primary-foreground: <hsl values>;
  --secondary: <hsl values>;
  --secondary-foreground: <hsl values>;
  --muted: <hsl values>;
  --muted-foreground: <hsl values>;
  --accent: <hsl values>;
  --accent-foreground: <hsl values>;
  --destructive: <hsl values>;
  --destructive-foreground: <hsl values>;
  --border: <hsl values>;
  --input: <hsl values>;
  --ring: <hsl values>;
  --radius: <rem value>;
  --sidebar-background: <hsl values>;
  --sidebar-foreground: <hsl values>;
  --sidebar-primary: <hsl values>;
  --sidebar-primary-foreground: <hsl values>;
  --sidebar-accent: <hsl values>;
  --sidebar-accent-foreground: <hsl values>;
  --sidebar-border: <hsl values>;
  --sidebar-ring: <hsl values>;
}
```

### Marvel Theme Special Variables

```css
.theme-marvel {
  /* Standard variables... */

  /* Marvel-specific gradients */
  --marvel-header-gradient: linear-gradient(135deg, #A78BFA 0%, #C084FC 100%);
  --marvel-gradient-blue: linear-gradient(135deg, #3B82F6, #06B6D4);
  --marvel-gradient-green: linear-gradient(135deg, #10B981, #34D399);
  --marvel-gradient-purple: linear-gradient(135deg, #8B5CF6, #A78BFA);
  --marvel-gradient-orange: linear-gradient(135deg, #F97316, #FB923C);
  --marvel-gradient-pink: linear-gradient(135deg, #EC4899, #F472B6);
  --marvel-gradient-red: linear-gradient(135deg, #EF4444, #F87171);
}
```

**Usage in Components**:
```tsx
<div className="marvel-header">Header with purple gradient</div>
<div className="marvel-gradient-icon-blue">Icon with blue gradient</div>
```

---

## Developer Guide

### Adding a New Theme

**Step 1: Define CSS Variables**

Add new theme class to `/app/globals.css`:

```css
.theme-my-new-theme {
  --background: <your background>;
  --foreground: <your foreground>;
  /* ... all required variables */
}

/* Optional dark variant */
.theme-my-new-theme.dark {
  --background: <dark background>;
  /* ... dark mode variables */
}
```

**Step 2: Update Validation**

Add theme to validation arrays in API endpoints:

**File**: `/app/api/navigation/route.ts` and `/app/api/navigation/[id]/route.ts`
```typescript
const validThemes = ['standard', 'bumblebee', 'modern-punch', 'marvel', 'my-new-theme']
```

**Step 3: Add Preview Card**

Update `/components/navigation/navigation-item-dialog.tsx`:

```tsx
{/* My New Theme */}
<button
  type="button"
  onClick={() => setTheme('my-new-theme')}
  className={`border-2 rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
    theme === 'my-new-theme' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'
  }`}
>
  <div className="h-12 rounded mb-2 bg-[#YourColor] flex items-center justify-center">
    {/* Your preview design */}
  </div>
  <p className="text-xs font-medium text-center">My New Theme</p>
  <p className="text-xs text-muted-foreground text-center">Light/Dark</p>
</button>
```

**Step 4: Update Database Migration**

Add new theme to migration seed data:

```sql
UPDATE navigation_items SET theme = 'my-new-theme', theme_variant = 'light'
WHERE id = 'nav-your-page';
```

---

### Using Themes in Your Components

**Option 1: Use CSS Custom Properties** (Recommended)

```tsx
<div className="bg-background text-foreground">
  <div className="border border-border rounded-lg p-4">
    <h2 className="text-primary">Header</h2>
    <p className="text-muted-foreground">Description</p>
  </div>
</div>
```

**Option 2: Use Theme-Specific Classes**

```tsx
{/* For Marvel theme */}
<div className="marvel-header">
  <h1>Header with Marvel gradient</h1>
</div>

<div className="marvel-metric-card">
  <div className="marvel-gradient-icon-blue p-4 rounded-xl">
    <Icon className="h-6 w-6 text-white" />
  </div>
</div>
```

**Option 3: Conditional Styling**

```tsx
// Check if current theme is Marvel
const isMarvelTheme = document.documentElement.classList.contains('theme-marvel')

return (
  <div className={isMarvelTheme ? 'marvel-card' : 'standard-card'}>
    Content
  </div>
)
```

---

### PageThemeProvider Implementation

**Location**: `/components/page-theme-provider.tsx`

**Key Functions**:

```typescript
// Find navigation item matching current pathname
function findMatchingItem(
  pathname: string,
  items: NavigationItem[]
): NavigationItem | null

// Apply theme classes to document element
function applyTheme(theme: string, variant: string): void
```

**Route Matching Priority**:
1. **Exact Match**: pathname === item.href
2. **Prefix Match**: pathname.startsWith(item.href) && item.href !== '/'
3. **Sub-Route Match**: Recursive search in subRoutes array
4. **Default Fallback**: Standard theme (light)

**Example Matches**:
- `/pick2light` → Exact match → Bumblebee theme
- `/products/abc123` → Prefix match → Products theme
- `/ai-assistant/custom-agents` → Sub-route match → AI Assistant theme
- `/unknown-route` → No match → Standard theme (default)

---

## Troubleshooting

### Theme Not Applying

**Issue**: Page doesn't show the selected theme after updating.

**Solutions**:
1. **Hard refresh the page**: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. **Clear localStorage**: Open DevTools → Application → Local Storage → Delete
3. **Check API response**: Open DevTools → Network → Filter `/api/navigation` → Verify theme fields in response
4. **Verify pathname match**: Console.log current pathname and navigation items

**Debugging**:
```javascript
// In browser console
console.log(window.location.pathname) // Current route
console.log(document.documentElement.className) // Applied classes
```

### Theme Variant Not Switching

**Issue**: Light/Dark toggle not working.

**Solutions**:
1. **Check theme supports variants**: Bumblebee is always dark
2. **Verify variant value**: Should be 'light', 'dark', or 'auto'
3. **Clear browser cache**: Ctrl+Shift+Del
4. **Check CSS loading**: Verify globals.css loaded in Network tab

### Preview Cards Not Showing

**Issue**: Theme preview cards missing or broken.

**Solutions**:
1. **Verify dialog is scrollable**: Scroll down in edit dialog
2. **Check browser console**: Look for React errors
3. **Verify CSS loaded**: Check if `/app/globals.css` is loaded
4. **Update dependencies**: Run `npm install` if components missing

### Database Migration Not Applied

**Issue**: Theme fields don't exist in database.

**Solutions**:
1. **Check migration file exists**: `/db/migrations/023_navigation_themes.sql`
2. **Restart development server**: Kill and restart `npm run dev`
3. **Check console logs**: Look for "Navigation Theme table already exists" message
4. **Manual migration**: Run SQL script directly on SQLite database

**Manual Migration**:
```bash
sqlite3 data/inventory.db < db/migrations/023_navigation_themes.sql
```

---

## Advanced Configuration

### Custom Theme Palettes

To create a custom color palette, define all required CSS variables:

```css
.theme-custom {
  /* Required: Base colors */
  --background: <hsl>;
  --foreground: <hsl>;

  /* Required: Card colors */
  --card: <hsl>;
  --card-foreground: <hsl>;

  /* Required: Interactive colors */
  --primary: <hsl>;
  --primary-foreground: <hsl>;
  --accent: <hsl>;
  --accent-foreground: <hsl>;

  /* Required: Borders and inputs */
  --border: <hsl>;
  --input: <hsl>;
  --ring: <hsl>;

  /* Required: Sidebar colors */
  --sidebar-background: <hsl>;
  --sidebar-foreground: <hsl>;
  --sidebar-primary: <hsl>;
  --sidebar-primary-foreground: <hsl>;

  /* Optional: Custom gradients */
  --custom-gradient: linear-gradient(...);
}
```

### Theme Transitions

Add smooth transitions in your CSS:

```css
* {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}
```

---

## Best Practices

### Theme Selection Guidelines

1. **Standard Theme**: General-purpose pages, forms, tables, lists
2. **Bumblebee Theme**: Warehouse operations, barcode scanning, LED control
3. **Modern Punch Theme**: AI features, dashboards, analytics
4. **Marvel Theme**: Premium features, customer-facing pages, marketing content

### Accessibility Considerations

- **Contrast Ratios**: All themes meet WCAG AA standards for text contrast
- **Color Blindness**: Themes use multiple visual cues (not just color)
- **Dark Mode**: Available for users with light sensitivity
- **System Preference**: Auto variant respects user's OS settings

### Performance Tips

- **Single API Call**: PageThemeProvider fetches navigation items once on mount
- **LocalStorage**: Theme preferences cached to reduce API calls
- **CSS Variables**: Themes use CSS custom properties for instant updates
- **No Re-renders**: Theme changes don't trigger React re-renders

---

## FAQ

### Q: Can I have different themes for pages in the same group?

**A**: Yes! Each navigation item (including sub-items in groups) can have its own theme. For example, "Custom AI Agents" and "AI Settings" can have different themes even though they're both in the "AI Assistant" group.

### Q: What happens if I don't set a theme for a page?

**A**: The page will default to the **Standard theme** with **light variant**. This ensures all pages always have a theme, even if not explicitly configured.

### Q: Can I change the theme dynamically without editing navigation?

**A**: Currently, themes are tied to navigation items and routes. For dynamic theme switching, you would need to implement a separate theme toggle component. The navigation theme system is designed for per-page defaults.

### Q: Do themes affect the sidebar/navigation menu?

**A**: Yes! Each theme includes sidebar-specific CSS variables (`--sidebar-background`, `--sidebar-foreground`, etc.) that style the navigation menu to match the page theme.

### Q: Can I create themes for sub-routes?

**A**: Yes! The PageThemeProvider uses prefix matching, so `/products/123` will inherit the theme from the `/products` navigation item. You can also create specific navigation items for sub-routes if you want different themes.

### Q: How do I reset all themes to default?

**A**: Use the **"Reset to Default"** button in Settings → Navigation. This will restore all navigation items to their original configuration, including themes.

---

## Version History

- **v2.10.0** (2025-10-12): Initial release of Per-Page Theme System
  - 4 professional themes implemented
  - Database migration 023 created
  - PageThemeProvider component
  - Visual theme preview cards
  - Complete API validation

---

## Related Documentation

- [Dynamic Navigation Menu Implementation](./DYNAMIC-NAVIGATION-MENU-IMPLEMENTATION.md) - Navigation system overview
- [Navigation Menu Editor User Guide](./NAVIGATION-MENU-EDITOR-USER-GUIDE.md) - Step-by-step navigation editing
- [CLAUDE.md](./CLAUDE.md) - Project history and session logs
- [CHANGELOG.md](./CHANGELOG.md) - Version history and release notes

---

## Support

For issues, questions, or feature requests related to the theme system:

1. Check this documentation first
2. Review browser console for errors
3. Verify database migration applied
4. Check Network tab for API responses
5. Consult CLAUDE.md for implementation details

---

**Last Updated**: October 12, 2025
**Maintained By**: Development Team
**Version**: 2.10.0

---

## Theme Editor (v2.11.0)

### Creating Custom Themes

**New in v2.11.0**: You can now create and edit custom themes through the Settings interface!

**Access**: Settings → Themes tab (8th tab)

### How to Create a Custom Theme

1. Navigate to **Settings → Themes** tab
2. Click **"Create New Theme"** button
3. Fill in basic information:
   - **Theme Name**: Internal identifier (e.g., "Ocean Blue")
   - **Display Name**: Shown in UI (e.g., "Ocean Blue Theme")
   - **Description**: When to use this theme
4. Select variant support:
   - Check **"Supports Light Variant"** for light mode
   - Check **"Supports Dark Variant"** for dark mode
5. Configure colors:
   - Switch to **"Light Variant"** tab
   - Use color pickers to set:
     - Background colors (background, card, popover)
     - Interactive colors (primary, accent, secondary)
     - Form elements (border, input)
   - Switch to **"Dark Variant"** tab (if enabled)
   - Configure dark mode colors
6. Preview your theme:
   - Switch to **"Live Preview"** tab
   - Toggle between Light/Dark preview
   - See theme applied to sample UI
7. Click **"Create Theme"**
8. Your theme is now available in Navigation → Edit Item → Page Theme dropdown!

### Editing Custom Themes

1. Settings → Themes tab
2. Find your custom theme card
3. Click **"Edit"** button
4. Modify colors using color pickers
5. See changes in Live Preview tab
6. Click **"Update Theme"** to save

### Duplicating Themes

Want to create a variation of an existing theme?

1. Find any theme (system or custom)
2. Click **"Duplicate"** button (📋 icon)
3. A copy is created as a custom theme
4. Edit the copy to create your variation

**Example**: Duplicate "Marvel" → Create "Marvel Pink Variant"

### System Themes vs Custom Themes

**System Themes** (Read-Only):
- Standard, Bumblebee, Modern Punch, Marvel
- Cannot be edited or deleted
- Can be duplicated to create custom variants
- Shown with "System" badge

**Custom Themes** (Fully Editable):
- Created by you through the theme editor
- Can be edited, duplicated, and deleted
- Unlimited quantity
- Automatically available in Navigation editor

---

**Last Updated**: October 13, 2025 (v2.11.0)

---

## Theme Import Feature (v2.11.0)

### Importing Themes from Files

You can now import themes from external files instead of creating them manually.

**Supported Formats**:
- JavaScript files (.js) - Like warehouse-theme.js
- JSON files (.json) - Theme configurations
- Theme files (.theme) - Custom format

**How to Import**:

1. Settings → Themes tab
2. Click "Import Theme" button
3. Drag & drop file OR click "Select File"
4. Review auto-detected information
5. Edit name/description if needed
6. Click "Import Theme"

**First Imported Theme**: Warehouse Command Center (from warehouse-theme.js)

### Badge System

Themes now display color-coded badges:

- **System** (Blue badge): Built-in themes - Cannot edit/delete, can duplicate
- **Created** (Purple badge): User-created themes - Full edit/delete access  
- **Imported** (Green badge): Imported from files - Full edit/delete access

### Imported Themes vs Created Themes

Both are fully editable, but:
- **Created**: Built from scratch using color pickers
- **Imported**: Originated from uploaded files, then editable

---

**Last Updated**: October 13, 2025 (v2.11.0 - Import Feature)
