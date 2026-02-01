# Warehouse Zone Manipulation - User Guide

## Quick Start Guide

### Accessing the Warehouse Layout Editor

1. Navigate to **Command Center** from the main menu
2. Click on **"3D Warehouse View"** tile
3. Click the **"Edit Zones"** button in the header (turns cyan when active)
4. You're now in Edit Mode with the interactive canvas!

---

## Understanding the Interface

### The Toolbar (4 Sections)

When you enter Edit Mode, you'll see a dark toolbar above the canvas with 4 sections:

```
┌────────────────────────────────────────────────────────────────────┐
│ [🖱️ Select] [Grid]  │  Instructions  │               │ [Save]     │
└────────────────────────────────────────────────────────────────────┘
    LEFT                  CENTER                         RIGHT
```

**LEFT SECTION:**
- **🖱️ Select** - Arrow pointer tool (always active)
- **Grid** - Toggle grid overlay for alignment

**CENTER SECTION:**
- Shows helpful instructions when nothing is selected
- Shows selected zone name and transformation buttons when a zone is selected

**RIGHT SECTION:**
- **Yellow Badge** - Shows number of unsaved changes
- **Reset** - Discard all unsaved changes
- **Save** - Save all changes to database

---

## Working with Zones

### Selecting a Zone

**How to Select:**
1. Click anywhere on a zone rectangle
2. The zone will highlight with a **cyan border** and **glow effect**
3. **8 green arrow handles** appear around the zone
4. **Toolbar center updates** to show zone name and transformation buttons

**How to Deselect:**
- Click on the empty canvas background
- Handles disappear and toolbar returns to instructions

---

### Moving a Zone

**How to Move:**
1. Select a zone (click it)
2. Click and hold anywhere on the **zone body** (not the arrow handles)
3. Drag your mouse to the new position
4. Release mouse button to drop

**Visual Feedback:**
- Zone follows your cursor in real-time
- Yellow dashed border indicates unsaved changes
- Live coordinates display in the zone (X, Z values)

**Tips:**
- Use the grid overlay to align zones precisely
- Coordinates update in real-time as you drag
- Changes are not saved until you click "Save"

---

### Resizing a Zone

**How to Resize:**
1. Select a zone (click it)
2. **8 arrow handles** appear around the zone:
   - **Corner handles** (↗ ↘ ↙ ↖) - Resize width AND depth simultaneously
   - **Edge handles** (↑ → ↓ ←) - Resize width OR depth only
3. Click and hold any arrow handle
4. Drag to resize in that direction
5. Release mouse button

**Handle Guide:**
```
        ↑ (Top)
    ↖       ↗
←              → (Sides)
    ↙       ↘
        ↓ (Bottom)
```

**Visual Feedback:**
- Handle turns darker on hover
- Zone dimensions update live (W × D values)
- Yellow dashed border indicates unsaved changes

**Tips:**
- Use **corner handles** to maintain proportions
- Use **edge handles** for single-dimension adjustments
- Minimum size is 5 meters (cannot resize smaller)

---

### Rotating a Zone

**How to Rotate:**
1. Select a zone
2. In the toolbar center, click one of the rotation buttons:
   - **↻ -90°** - Rotate counter-clockwise (left)
   - **↻ +90°** - Rotate clockwise (right)
3. Zone rotates instantly by 90 degrees

**Visual Feedback:**
- Toast notification shows current rotation
- Label above zone shows "Rotated X°"
- Rotation value displays in zone info

**Rotation Examples:**
- 0° → Click +90° → 90° (quarter turn right)
- 90° → Click +90° → 180° (upside down)
- 180° → Click +90° → 270° (three-quarter turn)
- 270° → Click +90° → 0° (back to original)

**Tips:**
- Rotation accumulates with each button click
- Use -90° to rotate counter-clockwise
- Rotation works in both 2D and 3D views

---

### Flipping a Zone

**How to Flip:**
1. Select a zone
2. In the toolbar center, click one of the flip buttons:
   - **⇄** - Flip Horizontal (mirror left-right)
   - **⇅** - Flip Vertical (mirror top-bottom)
3. Zone flips instantly

**Visual Feedback:**
- Toast notification confirms flip operation
- Rotation value adjusts to create mirror effect

**Use Cases:**
- Create mirror layouts for warehouse symmetry
- Reverse zone orientation quickly
- Duplicate zones with opposite facing

---

## Saving Your Work

### Unsaved Changes Indicator

**Yellow Badge:**
When you make changes, a yellow badge appears in the toolbar showing the count:
```
[🟡 2 unsaved]
```

This tells you:
- How many zones have been modified
- Changes are not yet saved to the database
- You need to click "Save" to persist changes

### Saving Changes

**How to Save:**
1. Make your changes (move, resize, rotate, flip zones)
2. Review the yellow badge count
3. Click the **purple "Save"** button in the toolbar
4. Wait for success notification
5. Zone cards below canvas update automatically

**What Happens When You Save:**
- All modified zones update in the database
- Rotation, position, and dimensions persist
- Zone detail cards refresh with new values
- Yellow badge disappears
- Success toast notification appears

### Discarding Changes

**How to Reset:**
1. Click the **"Reset"** button in the toolbar
2. All unsaved changes are discarded
3. Zones revert to last saved state
4. Yellow badge disappears

**When to Use Reset:**
- Made a mistake and want to start over
- Accidentally moved/resized wrong zone
- Want to cancel all changes

---

## Tips and Best Practices

### Planning Your Layout

**Before Editing:**
1. Use the static view mode to understand current layout
2. Toggle 2D/3D views to see different perspectives
3. Note zone positions in the zone cards below

**During Editing:**
1. Enable the grid overlay for alignment
2. Work on one zone at a time
3. Use the coordinate display to position precisely
4. Save frequently to avoid losing work

### Efficient Workflows

**Moving Multiple Zones:**
1. Select and move first zone
2. Don't save yet
3. Select and move second zone
4. Continue for all zones
5. Save once at the end (all changes persist together)

**Creating Uniform Layouts:**
1. Create one zone with desired dimensions
2. Use the form dialog to create duplicates with specific coordinates
3. Use Edit Mode to fine-tune positions visually
4. Save when alignment is perfect

**Rotating Zones for Aisles:**
1. Create zone with default 0° rotation
2. Select zone in Edit Mode
3. Click +90° to rotate for aisle direction
4. Resize if needed using handles
5. Save rotation and size together

---

## Keyboard Reference

### Current Shortcuts
- **Click zone** - Select
- **Click background** - Deselect
- **Drag zone** - Move
- **Drag handle** - Resize

### Planned Shortcuts (Future)
- **Arrow keys** - Nudge selected zone
- **Ctrl+Z** - Undo
- **Ctrl+Y** - Redo
- **Delete** - Remove zone
- **Escape** - Deselect
- **Ctrl+S** - Save changes

---

## Visual Guide

### Zone States

**UNSELECTED (Default State)**
```
╔═══════════════════╗
║ Zone A - Storage  ║  ← Colored border (zone color)
║ STORAGE           ║  ← Semi-transparent background
╚═══════════════════╝
```

**SELECTED (Ready to Edit)**
```
        [Rotated 90°]           ← Rotation label (if rotated)

              ↑
         ↖         ↗
    ╔═══════════════════╗
 ← ║ Zone A - Storage  ║ →     ← Cyan border + glow
    ║ STORAGE           ║       ← 8 arrow handles
    ║ X: 20 | Z: 30     ║       ← Live coordinates
    ║ W: 15 | D: 10     ║
    ╚═══════════════════╝
         ↙         ↘
              ↓

    [↻] [↻] [⇄] [⇅]            ← Quick action buttons
```

**UNSAVED CHANGES**
```
╔ ═ ═ ═ ═ ═ ═ ═ ═ ═ ╗  ← Yellow dashed border
║ Zone A - Storage  ║
║ STORAGE           ║
╚ ═ ═ ═ ═ ═ ═ ═ ═ ═ ╝
```

---

## Common Workflows

### Workflow 1: Repositioning a Zone

**Scenario:** Zone A needs to move 10 meters to the right

**Steps:**
1. Click "Edit Zones" button
2. Click Zone A on canvas
3. Drag Zone A to the right
4. Watch coordinates update (X increases)
5. Release mouse when position looks good
6. Click "Save" in toolbar
7. Zone card below updates with new position

**Time:** ~10 seconds

---

### Workflow 2: Creating Aisle Orientation

**Scenario:** Create a picking zone oriented as an aisle

**Steps:**
1. Click "Add Zone" to create new zone
2. Fill in name: "Aisle 1 - Picking"
3. Set type: Picking
4. Save to create zone
5. Click "Edit Zones"
6. Select the new zone
7. Click "+90°" button in toolbar
8. Resize with arrow handles if needed
9. Click "Save"
10. Zone now oriented as aisle

**Time:** ~30 seconds

---

### Workflow 3: Creating Symmetrical Layout

**Scenario:** Create mirrored storage zones on both sides

**Steps:**
1. Create first zone "Storage Left"
2. Click "Edit Zones"
3. Position and size left zone
4. Click "Save"
5. Create second zone "Storage Right"
6. Click "Edit Zones"
7. Select "Storage Right"
8. Position it on the right side
9. Click "⇄" (Flip Horizontal) to mirror
10. Click "Save"
11. Both zones now mirror each other

**Time:** ~60 seconds

---

## Troubleshooting Guide

### Problem: I don't see the new toolbar

**Possible Causes:**
1. Not in Edit Mode
2. Browser cache showing old version

**Solutions:**
1. Click the **"Edit Zones"** button in the page header
2. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
3. Clear browser cache if still not visible

---

### Problem: Arrow handles not appearing

**Possible Causes:**
1. Zone not selected
2. Not in Edit Mode

**Solutions:**
1. Make sure "Edit Zones" button is active (cyan highlight)
2. Click directly on a zone
3. Handles should appear immediately around selected zone

---

### Problem: Zone won't move when I drag

**Possible Causes:**
1. Clicking on an arrow handle (triggers resize instead)
2. Not in Edit Mode

**Solutions:**
1. Click the **center** of the zone, not the handles
2. Make sure Edit Mode is active
3. Cursor should show "move" icon when hovering zone

---

### Problem: My changes disappeared

**Possible Causes:**
1. Forgot to click "Save" before exiting Edit Mode
2. Clicked "Reset" accidentally
3. Refreshed page without saving

**Solutions:**
1. Always click the **purple "Save"** button before exiting
2. Watch for the yellow "unsaved" badge
3. Save frequently to avoid losing work

---

### Problem: Rotation button doesn't work

**Possible Causes:**
1. No zone selected
2. Buttons are disabled

**Solutions:**
1. Select a zone first (click it)
2. Rotation buttons appear in center of toolbar
3. Click -90° or +90° button
4. Look for toast notification confirming rotation

---

## FAQ

### Q: Can I rotate zones to any angle?
**A:** Currently, rotations are in 90° increments using the toolbar buttons. Custom angles can be set via the form dialog (0-360°).

### Q: What's the minimum zone size?
**A:** 5 meters in both width and depth. You cannot resize smaller than this.

### Q: Can I undo changes?
**A:** Yes! Click the "Reset" button to discard all unsaved changes. Future update will add Ctrl+Z undo.

### Q: How do I delete a zone?
**A:** Use the delete button (trash icon) in the zone detail cards below the canvas, or in the form dialog when editing.

### Q: Can I edit multiple zones at once?
**A:** You can modify multiple zones before saving, but only one zone can be selected at a time. Select zone 1 → modify → select zone 2 → modify → save all.

### Q: Do changes update the zone cards immediately?
**A:** Changes update the cards **after you click "Save"**. Until then, they remain in draft state.

### Q: Can I use this on a touchscreen?
**A:** Yes! The interface works with touch, but it's optimized for mouse use. Drag gestures work the same way.

### Q: What happens if two zones overlap?
**A:** Zones can overlap on the canvas. The most recently selected zone appears on top (higher z-index).

### Q: Can I zoom in/out on the canvas?
**A:** Not yet! Future enhancement will add zoom controls for large warehouses.

---

## Best Practices

### ✅ DO:
- Enable the grid for precise alignment
- Save frequently to avoid losing work
- Use 2D view for easier positioning
- Use zone cards for exact coordinate values
- Plan your layout before making bulk changes

### ❌ DON'T:
- Forget to click Save before exiting Edit Mode
- Resize zones smaller than their content capacity
- Overlap zones completely (makes selection difficult)
- Make large position changes without grid reference

---

## Advanced Tips

### Creating Professional Layouts

**Tip 1: Grid Alignment**
- Enable grid overlay
- Position zones at grid intersections
- Creates clean, organized appearance

**Tip 2: Color Coding**
- Use consistent colors for zone types
- Receiving zones: Green
- Storage zones: Blue
- Picking zones: Orange
- Shipping zones: Purple

**Tip 3: Size Consistency**
- Make similar zones the same size
- Use form dialog for exact dimensions
- Use visual editor for final tweaks

**Tip 4: Rotation for Flow**
- Rotate zones to show warehouse flow direction
- Vertical zones for aisles
- Horizontal zones for staging areas

---

## Integration with Other Features

### WLED Device Integration
Warehouse zones can be linked to WLED devices for LED location indicators:
1. Edit zone via form dialog
2. Select WLED device from dropdown
3. LED strips can light up to show zone location

### RFID Scanner Integration
Zones support RFID scanner configuration:
- Fixed scanners (stationary)
- Mobile scanners (handheld)
- Gate scanners (entry/exit points)
- Scanner range configurable per zone

### Accuracy Tracking
Zone positions integrate with accuracy metrics:
- Zone-specific accuracy percentages
- Physical count vs system count
- Discrepancy tracking by zone

---

## Keyboard Shortcuts (Coming Soon)

Future updates will include:
- **Ctrl+S** - Quick save
- **Ctrl+Z** - Undo last change
- **Ctrl+Y** - Redo
- **Arrow Keys** - Nudge zone 1 meter
- **Shift+Arrow** - Nudge zone 10 meters
- **Delete** - Remove selected zone
- **Escape** - Deselect zone
- **Ctrl+C / Ctrl+V** - Copy/paste zones

---

## Getting Help

### If Something Doesn't Work

1. **Check Edit Mode** - Make sure "Edit Zones" button is active (cyan)
2. **Refresh Browser** - Hard refresh (Ctrl+Shift+R)
3. **Check Console** - Open browser DevTools (F12) for errors
4. **Save First** - If switching pages, save your work first

### Common Questions

**"I clicked Save but nothing happened"**
- Check if yellow badge showed unsaved changes
- Try clicking a zone first, then saving
- Check browser console for errors

**"Zones are jumping around"**
- Make sure you're dragging zone body, not handles
- Disable 3D view if perspective is confusing
- Enable grid to see exact positions

**"Rotation is backwards"**
- +90° rotates clockwise (right)
- -90° rotates counter-clockwise (left)
- Flip operations use 180° rotation

---

## Version History

### Version 1.0 (October 12, 2025)
**Initial Release:**
- ✅ Mouse-only drag and drop
- ✅ 8-handle resize system
- ✅ Rotation buttons (+90°, -90°)
- ✅ Flip horizontal/vertical
- ✅ Fixed toolbar (no floating elements)
- ✅ Grid overlay
- ✅ Non-destructive editing
- ✅ Real-time coordinate display
- ✅ 2D/3D view support

### Planned Features (Future Versions)
- ⏳ Keyboard shortcuts
- ⏳ Undo/redo system
- ⏳ Multi-selection
- ⏳ Snap-to-grid option
- ⏳ Alignment tools
- ⏳ Zoom and pan controls
- ⏳ Copy/paste zones
- ⏳ Measurement tools

---

## Examples

### Example 1: Simple Warehouse Layout

**Goal:** Create a basic warehouse with receiving, storage, and shipping zones

**Steps:**
1. Create Zone A (Receiving) - 15m × 10m - Position (0, 0)
2. Create Zone B (Storage) - 40m × 20m - Position (20, 0)
3. Create Zone C (Shipping) - 15m × 10m - Position (65, 0)
4. Enter Edit Mode
5. Fine-tune positions by dragging zones
6. Save layout

**Result:** Linear flow from left to right: Receiving → Storage → Shipping

---

### Example 2: Aisle Layout

**Goal:** Create warehouse with vertical aisles

**Steps:**
1. Create Zone A (Aisle 1) - 3m × 20m - Position (0, 0)
2. Enter Edit Mode
3. Select Zone A
4. Click "+90°" button twice (180° rotation for vertical aisle)
5. Resize with arrow handles if needed
6. Duplicate for Aisles 2, 3, 4 using form
7. Position each aisle with 2m spacing
8. Save layout

**Result:** Multiple vertical aisles with consistent spacing

---

### Example 3: L-Shaped Warehouse

**Goal:** Create L-shaped storage area

**Steps:**
1. Create horizontal zone: 40m × 15m at (0, 0)
2. Create vertical zone: 15m × 30m at (40, 15)
3. Enter Edit Mode
4. Adjust positions for perfect L-shape connection
5. Use grid overlay to align precisely
6. Save layout

**Result:** L-shaped storage area for corner warehouses

---

## Support and Feedback

### Need Help?
- Check this user guide first
- Review the Technical Implementation Guide for developers
- Check browser console for error messages

### Report Issues
Document any problems with:
- What you were trying to do
- What actually happened
- Browser and version
- Screenshot if possible

---

## Glossary

**Canvas** - The dark grid area where zones are displayed and manipulated

**Zone** - A defined warehouse area with position, dimensions, and properties

**Edit Mode** - Interactive mode where zones can be moved, resized, and rotated

**View Mode** - Static display mode (default, no editing)

**Draft Changes** - Modifications not yet saved to database (shown with yellow dashed border)

**Resize Handles** - 8 arrow icons around selected zone for resizing

**Quick Actions** - Rotation and flip buttons in toolbar

**Grid Overlay** - Light grid pattern for alignment reference

**3D View** - Perspective view with isometric rotation (60° tilt, -45° spin)

**2D View** - Flat top-down view without perspective

**Scale Factor** - Conversion ratio between database meters and canvas pixels (1m = 2px)

---

## Appendix: Complete Feature List

### Zone Manipulation Features
✅ Click to select zone
✅ Drag zone body to move
✅ Drag arrow handles to resize (8 directions)
✅ Rotate +90° with button click
✅ Rotate -90° with button click
✅ Flip horizontal with button click
✅ Flip vertical with button click
✅ Real-time coordinate display
✅ Visual feedback for selection
✅ Visual feedback for unsaved changes

### Toolbar Features
✅ Arrow pointer tool (always active)
✅ Grid toggle
✅ Selected zone name display
✅ Transformation buttons (rotate, flip)
✅ Unsaved changes counter
✅ Reset all changes
✅ Save all changes
✅ Helpful instruction text

### Canvas Features
✅ Grid overlay (toggleable)
✅ 2D/3D view modes
✅ Smooth drag animations
✅ Minimum size constraints
✅ Rotation label display
✅ Click background to deselect
✅ Multi-zone support
✅ Color-coded zones

### Integration Features
✅ Auto-updates zone detail cards
✅ Persists to SQLite database
✅ Form dialog for manual input
✅ WLED device linking
✅ RFID scanner configuration
✅ Capacity calculations
✅ Zone type filtering

---

**Last Updated:** October 12, 2025
**Version:** 1.0
**Status:** Production Ready ✅
