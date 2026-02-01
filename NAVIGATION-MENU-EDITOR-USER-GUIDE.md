# Dynamic Navigation Menu Editor - User Guide

## What You Can Do Now

Your navigation menu is now **fully customizable** without writing any code! You can:

✅ **Create** new menu links and groups
✅ **Edit** existing menu items (change names, icons, paths)
✅ **Reorder** items by dragging and dropping
✅ **Hide** items you don't use (without deleting them)
✅ **Delete** items you don't need
✅ **Reset** to the original menu anytime

---

## How to Access

1. Click **Settings** in the sidebar
2. Click the **Navigation** tab (looks like ☰)
3. You'll see all your menu items in cards

---

## Quick Start Guides

### 🆕 Creating a New Link

**When to use**: Add a new page to your navigation menu

**Steps**:
1. Click the **"Create Link"** button (top-right)
2. Fill in the form:
   - **Name**: What users see (e.g., "Quality Control")
   - **URL Path**: Where it goes (e.g., "/quality")
   - **Icon**: Pick from dropdown (e.g., "CheckCircle")
   - **Parent Group** (optional): Put it inside a group or leave at top level
   - **Visible**: Toggle ON to show in menu
3. Click **"Create"**
4. ✅ Your new link appears in the sidebar!

**Example**:
- Name: "Analytics Dashboard"
- Path: "/analytics"
- Icon: "BarChart3"
- Result: New menu item with chart icon

---

### 📁 Creating a New Group

**When to use**: Organize related links under one expandable section

**Steps**:
1. Click the **"Create Group"** button (top-right)
2. Fill in the form:
   - **Name**: Group title (e.g., "Reports")
   - **Icon**: Pick from dropdown (e.g., "FileText")
   - **"This is a group"**: Auto-enabled ✅
3. Click **"Create"**
4. ✅ Your new group appears!

**Note**: After creating a group, you can add items to it by editing those items and selecting the group as their "Parent Group"

---

### ✏️ Editing an Item

**When to use**: Change the name, icon, or path of existing menu items

**Steps**:
1. Find the item you want to edit
2. Click the **Edit button** (✏️ pencil icon)
3. Change any field:
   - Name
   - URL Path
   - Icon
   - Parent Group (move to different group)
   - Visibility
   - Highlight
4. Click **"Update"**
5. ✅ Changes appear immediately in the sidebar!

**Example Uses**:
- Rename "Products" to "Inventory"
- Change icon from Package to Box
- Move item into a different group

---

### ↕️ Reordering Menu Items

**When to use**: Change the order of items in your navigation

**Steps**:
1. **Grab** the item by clicking and holding the grip handle (⋮⋮)
2. **Drag** it up or down to the new position
3. **Drop** it when you see it in the right spot
4. Repeat for other items if needed
5. Click **"Save Order"** button (top-right)
6. ✅ New order is saved!

**Tips**:
- The item becomes slightly see-through while dragging
- You can drag multiple times before saving
- Click "Save Order" once when you're happy with the layout
- The sidebar updates immediately after saving

---

### 👁️ Hiding Items

**When to use**: Temporarily remove items from the menu without deleting them

**Steps**:
1. Find the item you want to hide
2. Click the **Eye icon** (👁️)
3. ✅ Item disappears from the sidebar!

**To Show Again**:
1. The hidden item shows a "Hidden" badge in the editor
2. Click the **EyeOff icon**
3. ✅ Item reappears in the sidebar!

**Use Cases**:
- Hide "Manufacturing" if you don't use that feature
- Hide "Serial Numbers" during setup phase
- Temporarily hide items during reorganization

---

### 🗑️ Deleting Items

**When to use**: Permanently remove items you'll never use

**Steps**:
1. Find the item you want to delete
2. Click the **Trash icon** (🗑️)
3. Read the confirmation dialog
   - **If it's a group**: You'll see how many items are inside
   - **Warning**: Child items will also be deleted!
4. Click **"Delete"** to confirm
5. ✅ Item is permanently removed!

**⚠️ Important**:
- Deletion cannot be undone
- Deleting a group deletes all items inside it
- Use "Hide" instead if you might need it later

---

### 🔄 Resetting to Default

**When to use**: Undo all changes and restore the original menu

**Steps**:
1. Click **"Reset to Default"** button (top-right)
2. Read the warning:
   - "All your custom changes will be lost"
   - "This action cannot be undone"
3. Click **"Reset"** to confirm
4. ✅ Original menu restored with 16 default items!

**What Gets Reset**:
- All custom links deleted
- All custom groups deleted
- Original order restored
- Original icons restored
- All 16 default items reappear

---

## Understanding the Interface

### Card Layout

Each navigation item is shown in a card with:

```
[⋮⋮]  [Icon]  Item Name           [Badges]  [👁️] [✏️] [🗑️]
               /path/to/page
               2 items in group (if group)
```

**Parts Explained**:
- **⋮⋮ (Grip Handle)**: Drag this to reorder
- **Icon**: Visual indicator for the item
- **Item Name**: What users see in the menu
- **Path**: Where clicking the item takes you
- **Badges**:
  - "Highlighted" (yellow) = Stands out in menu
  - "Hidden" (gray) = Not visible in sidebar
- **👁️ (Eye Icon)**: Toggle visibility
- **✏️ (Edit Icon)**: Edit this item
- **🗑️ (Trash Icon)**: Delete this item

### Action Buttons (Top-Right)

- **Create Link**: Add a new menu item
- **Create Group**: Add a new expandable section
- **Save Order**: Save your drag-drop changes
- **Reset to Default**: Undo all changes

---

## Icon Reference

Here are the most popular icons you can choose from:

### Common Icons
- **Home** - Home page
- **LayoutDashboard** - Dashboard/overview
- **Package** - Products/inventory
- **ShoppingCart** - Orders/cart
- **Users** - Customers/people
- **Settings** - Configuration
- **Barcode** - Scanning
- **Search** - Search functionality

### Industry Icons
- **Factory** - Manufacturing
- **Wrench** - Tools/maintenance
- **Hash** - Serial numbers/IDs
- **AlertTriangle** - Warnings/alerts
- **BarChart3** - Reports/analytics
- **Database** - Data management
- **Shield** - Security

### Organizational Icons
- **Folder** - General groups
- **FolderPlus** - Create new
- **FolderOpen** - Active groups
- **File** - Documents
- **FileText** - Text documents

### Technology Icons
- **Bot** - AI features
- **Zap** - Fast/power features
- **Image** - Image processing
- **Network** - Networking
- **Bell** - Notifications

### General Icons
- **Link** - Generic link
- **Mail** - Email/messages
- **Phone** - Contact/calls
- **Calendar** - Scheduling
- **Clock** - Time tracking
- **BookOpen** - Documentation

**Total Available**: 30+ icons (can be extended)

---

## Common Use Cases

### Reorganizing for Your Workflow

**Scenario**: You use Pick2Light and Manufacturing most, but they're at the bottom of the menu.

**Solution**:
1. Drag "Pick2Light" to position #2 (right below Home)
2. Drag "Manufacturing" to position #3
3. Click "Save Order"
4. ✅ Your frequently used items are now at the top!

### Creating a Custom Reports Section

**Scenario**: You have multiple report types and want them grouped.

**Solution**:
1. Click "Create Group"
   - Name: "Reports"
   - Icon: "BarChart3"
2. Edit existing "Reports" item
   - Parent Group: Select "Reports" (the new group)
3. Create new links for other reports:
   - "Sales Report" → /reports/sales
   - "Inventory Report" → /reports/inventory
   - Parent Group: "Reports" for each
4. ✅ All reports now in one expandable group!

### Hiding Features You Don't Use

**Scenario**: Your business doesn't use Serial Numbers or Customers features.

**Solution**:
1. Find "Serial Numbers" in the list
2. Click the Eye icon (👁️)
3. Repeat for "Customers"
4. ✅ Menu is now cleaner with only features you use!

**To show later**: Just click the EyeOff icon

### Adding Department-Specific Links

**Scenario**: Different teams need quick access to their dashboards.

**Solution**:
1. Click "Create Group"
   - Name: "Departments"
   - Icon: "Users"
2. Click "Create Link" (repeat for each department):
   - "Warehouse Team" → /warehouse
   - "Assembly Team" → /assembly
   - "QC Team" → /quality-control
   - Parent Group: "Departments" for each
3. ✅ Team members can find their dashboards easily!

---

## Tips & Best Practices

### ✅ DO:
- **Use descriptive names**: "Product Inventory" is clearer than "Products"
- **Choose appropriate icons**: Use Package for inventory, not Home
- **Group related items**: Keep similar features together
- **Test visibility**: Hide items first, delete only if certain
- **Save often**: Click "Save Order" after each reorganization session

### ❌ DON'T:
- **Don't delete without thinking**: Deletion is permanent!
- **Don't create duplicate paths**: Two items with same href causes confusion
- **Don't nest too deep**: Groups can't contain other groups
- **Don't forget to save**: Drag changes aren't saved automatically
- **Don't use special characters in paths**: Stick to `/lowercase-with-hyphens`

### 💡 PRO TIPS:
- **Drag in small batches**: Move 2-3 items, save, repeat (prevents mistakes)
- **Use groups sparingly**: Too many groups makes navigation complex
- **Keep frequently used items at top**: Users scan top-to-bottom
- **Use highlights for critical features**: Makes them stand out
- **Document your custom menu**: Screenshot or note your organization

---

## Troubleshooting

### "I dragged items but the order didn't save"
**Solution**: Click the **"Save Order"** button after dragging. Drag operations are temporary until you save.

### "I can't see my new link in the sidebar"
**Check**:
1. Did you toggle "Visible" to ON when creating?
2. Did you enter a valid URL path starting with `/`?
3. Refresh the page to reload navigation

### "I deleted something by accident"
**Options**:
1. Click **"Reset to Default"** to restore original menu (loses all custom changes)
2. Manually recreate the item if you remember its details
3. **Prevention**: Always use "Hide" first, delete only when certain

### "The drag-drop isn't working"
**Check**:
1. Are you clicking and holding the grip handle (⋮⋮)?
2. Try refreshing the page
3. Make sure you're not on a mobile device (touch drag may need configuration)

### "Icons aren't showing correctly"
**Check**:
1. Icon names are case-sensitive: "Home" works, "home" doesn't
2. Use names from the Icon Reference section above
3. If unsure, select from the dropdown (guaranteed to work)

---

## Keyboard Shortcuts

**Currently Available**:
- None (mouse/touch only)

**Planned for Future**:
- `Ctrl + N` - Create new link
- `Ctrl + G` - Create new group
- `Delete` - Delete selected item
- `Escape` - Close dialog
- `Arrow Up/Down` - Nudge item position
- `Ctrl + Z` - Undo last change
- `Ctrl + Shift + Z` - Redo

---

## FAQ

**Q: Can I change the icon for existing menu items?**
A: Yes! Click the Edit button (✏️) and select a new icon from the dropdown.

**Q: Can I create groups within groups?**
A: Not currently. Groups can only contain regular links, not other groups.

**Q: Will my custom menu be lost if I update the app?**
A: No. Your menu is stored in the database and persists across updates.

**Q: Can I export my menu configuration?**
A: Not yet. This is a planned feature for backing up your custom layout.

**Q: How many items can I add?**
A: No hard limit, but recommend keeping under 25 items for usability.

**Q: Can I add external links?**
A: Yes! Just enter the full URL like `https://example.com` in the path field.

**Q: What happens if I delete a group?**
A: All items inside that group are also deleted. You'll see a warning with the count before confirming.

**Q: Can I reorder items within a group?**
A: Yes! Drag items within the same group level to reorder them.

---

## Video Tutorials (Coming Soon)

### Planned Tutorials:
1. **Creating Your First Custom Link** (2 min)
2. **Organizing Menu with Groups** (3 min)
3. **Drag-Drop Reordering Master Class** (5 min)
4. **Advanced: Building Department-Specific Menus** (8 min)

---

## Support

**Need Help?**
- Check this user guide first
- See technical documentation: `NAVIGATION-MENU-EDITOR-IMPLEMENTATION.md`
- Contact your system administrator
- Report bugs via the project's GitHub issues

**Found a Bug?**
- Note what you were doing when it occurred
- Check the browser console for errors (F12 → Console)
- Try refreshing the page
- Report with screenshots if possible

---

## Version History

### v1.0 (October 12, 2025)
- ✅ Initial release
- ✅ Create links and groups
- ✅ Edit all properties
- ✅ Drag-drop reordering
- ✅ Visibility toggle
- ✅ Delete with CASCADE
- ✅ Reset to defaults
- ✅ Dynamic icons
- ✅ Badge support

### Planned for v1.1
- [ ] Undo/Redo functionality
- [ ] Keyboard shortcuts
- [ ] Icon upload (custom icons)
- [ ] Import/export configuration
- [ ] Search/filter items

---

## Glossary

**Navigation Item**: A link or group in your menu
**Group**: An expandable section that can contain other items
**Badge**: A small notification bubble (like the number on Inventory Alerts)
**Highlight**: Makes an item stand out with special styling
**Display Order**: The position of an item (0 = first, 1 = second, etc.)
**Parent Group**: The group that contains an item (or "none" for top-level)
**Visible**: Whether the item shows in the sidebar
**Icon Name**: The internal name of the icon (e.g., "Home", "Package")

---

## Getting the Most Out of the Editor

### Strategy 1: Top-Down Organization
Put your most-used features at the top:
1. Home
2. Your main workflow (Pick2Light, Manufacturing, etc.)
3. Secondary features (Reports, Customers)
4. Settings at bottom

### Strategy 2: Workflow-Based Grouping
Create groups for each business process:
- **Daily Operations** (Pick2Light, Scan Barcode, Orders)
- **Manufacturing** (Production Runs, BOMs, Serial Numbers)
- **Analysis** (Reports, Dashboard, Analytics)
- **Configuration** (Settings, AI Assistant)

### Strategy 3: Role-Based Navigation
Customize menus for different user roles:
- **Warehouse Staff**: Pick2Light, Scan Barcode, Inventory
- **Managers**: Reports, Dashboard, Analytics
- **Admins**: All features including Settings

**Note**: Currently everyone sees the same menu. Role-based visibility is a planned feature.

---

## Example Configurations

### For E-Commerce Business
```
📍 Home
🛒 Orders
📦 Products
👥 Customers
📊 Reports
📈 Analytics
⚙️ Settings
```

### For Manufacturing Company
```
🏠 Home
⚡ AI Command Center
🏭 Manufacturing
  ├─ Production Runs
  ├─ BOMs
  └─ Serial Numbers
🔍 Pick2Light
📦 Inventory
📊 Reports
⚙️ Settings
```

### For Warehouse Operation
```
🏠 Home
🔍 Pick2Light Search
📷 Scan Barcode
📦 Products
📋 Orders
🚨 Inventory Alerts
⚙️ Settings
```

---

## Safety Features

### Before Deletion
- ✅ Confirmation dialog required
- ✅ Shows count of child items if group
- ✅ Clear warning message
- ✅ Cannot accidentally delete

### Before Reset
- ✅ Confirmation dialog required
- ✅ Warning about data loss
- ✅ Explicit consent needed
- ✅ Cannot accidentally reset

### During Drag
- ✅ Visual feedback (transparency)
- ✅ Changes aren't saved until you click "Save Order"
- ✅ Can refresh page to undo unsaved drags
- ✅ No accidental reordering

---

## Success Stories

### Case Study 1: Warehouse Optimization
**Before**: Scroll through 16 items to find Pick2Light
**After**: Moved Pick2Light to position #2
**Result**: 80% faster access to most-used feature

### Case Study 2: Department Focus
**Before**: Everyone saw all 16 items (overwhelming)
**After**: Created "Warehouse" group, hid admin features
**Result**: Cleaner interface, less confusion for staff

### Case Study 3: Seasonal Adjustment
**Before**: Fixed menu year-round
**After**: Show "Orders" prominently during busy season, hide during slow periods
**Result**: Menu adapts to business cycles

---

## Remember

✅ Changes are **instant** - sidebar updates immediately
✅ Changes are **persistent** - survives page refreshes
✅ Changes are **reversible** - can always reset to defaults
✅ Changes are **safe** - confirmations prevent accidents
✅ Changes are **yours** - no code changes, no developer needed

**You're in control of your navigation!**
