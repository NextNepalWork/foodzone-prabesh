# 🔔 Staff Dashboard Notification Guide

## Quick Start

### Step 1: Enable Notifications (One Time)
1. Open Staff Dashboard (`/staff`)
2. Look at the top-right header
3. Click **"PUSH OFF"** button → Browser will ask permission → Click "Allow"
4. Click **"ALARM OFF"** button → It will turn to "ALARM ON"
5. **Done!** Settings are now saved permanently

### Step 2: Test It Works
1. Refresh the page (F5 or Cmd+R)
2. Check buttons still show "PUSH ON" and "ALARM ON"
3. ✅ If they're still ON, it's working!

## 🎯 What Each Notification Does

### 🚨 ALARM (Audio Alerts)
**When it plays:**
- New order arrives → BEEP BEEP
- Order becomes ready → BEEP BEEP

**Best for:**
- Chefs in the kitchen
- Busy environments
- When you can't watch screen

**How to use:**
- Click "ALARM OFF" → turns to "ALARM ON"
- Refresh page → still "ALARM ON" ✅
- Sound plays automatically for new orders

### 📱 PUSH (Browser Notifications)
**When it shows:**
- New order arrives → Popup notification
- Shows order number and item count
- Works even when tab is inactive

**Best for:**
- Waiters on the floor
- Multiple browser tabs open
- When dashboard is minimized

**How to use:**
- Click "PUSH OFF" → Browser asks permission
- Click "Allow" → turns to "PUSH ON"
- Refresh page → still "PUSH ON" ✅
- Notifications appear outside browser

## 🎨 Visual Indicators

### Order Time Tracking
Every order card shows how long it's been waiting:

- **⏱️ 5 min** (Gray) = Normal, no rush
- **⏱️ 25 min** (Orange) = Getting urgent
- **⏱️ 35 min** (Red + Pulsing) = VERY URGENT!

### Status Colors
- **⏳ Pending** (Yellow) = Waiting to start
- **🔥 Preparing** (Blue) = Chef is cooking
- **✅ Ready** (Orange) = Ready for pickup
- **🏁 Completed** (Green) = Served to customer

### Live Counters (Top Right)
Shows real-time counts:
- **Active Orders:** Total orders in progress
- **Pending:** Waiting to start (yellow)
- **Preparing:** Currently cooking (blue)
- **Ready:** Ready for service (green)

## 🔄 How Live Updates Work

### Automatic Updates
- New order arrives → Instant notification
- Status changes → Instant update
- No need to refresh page
- Updates every 30 seconds as backup

### What You'll See
1. **New Order:**
   - Toast notification appears (top-right)
   - Sound plays (if alarm ON)
   - Browser notification (if push ON)
   - Order appears in "Pending" tab

2. **Status Change:**
   - Order moves to new tab automatically
   - Toast shows "Order #123 → PREPARING"
   - Counters update instantly

## 🎭 Role-Based Features

### For Chefs 👨‍🍳
**Can do:**
- Start Preparing (pending → preparing)
- Mark Ready (preparing → ready)

**Cannot do:**
- Complete orders (waiter only)

**Best settings:**
- ✅ ALARM ON (hear new orders)
- ✅ PUSH ON (see when away)

### For Waiters 🧑‍💼
**Can do:**
- Complete orders (ready → completed)

**Cannot do:**
- Start preparing (chef only)
- Mark ready (chef only)

**Best settings:**
- ✅ PUSH ON (know when food ready)
- ⚠️ ALARM optional (less critical)

## 🐛 Troubleshooting

### Problem: Notifications turn off after refresh
**Solution:** This is now FIXED! Settings persist automatically.

### Problem: No sound playing
**Check:**
1. Is "ALARM ON" button active?
2. Is browser volume up?
3. Try clicking alarm button twice (off then on)

### Problem: No browser notifications
**Check:**
1. Did you click "Allow" when browser asked?
2. Is "PUSH ON" button active?
3. Check browser notification settings:
   - Chrome: Settings → Privacy → Notifications
   - Firefox: Settings → Privacy → Permissions → Notifications

### Problem: Orders not updating
**Check:**
1. Is "🟢 ONLINE" showing in header?
2. If "🔴 OFFLINE", check internet connection
3. Page auto-refreshes every 30 seconds

## 💡 Pro Tips

### For Maximum Efficiency:
1. **Enable both** ALARM and PUSH
2. **Watch the timer** - prioritize red orders
3. **Use filter tabs** - focus on your role's tasks
4. **Check counters** - see workload at a glance

### For Quiet Environments:
1. Turn ALARM OFF
2. Keep PUSH ON
3. Watch visual notifications

### For Busy Kitchens:
1. Turn ALARM ON (loud beep)
2. Turn PUSH ON (backup)
3. Watch for red pulsing orders (urgent)

## ✅ Settings Checklist

After setup, verify:
- [ ] ALARM button shows "ALARM ON"
- [ ] PUSH button shows "PUSH ON"
- [ ] Refresh page - settings still ON
- [ ] Close browser - reopen - settings still ON
- [ ] Test with new order - sound plays
- [ ] Test with new order - notification shows

## 🎯 Summary

**What's Fixed:**
✅ Notifications persist after refresh
✅ Settings saved automatically
✅ No need to re-enable every time

**What's New:**
✅ Live order tracking with timers
✅ Urgency indicators (red = urgent)
✅ Beautiful modern UI
✅ Real-time counters
✅ Better visual feedback

**What to Do:**
1. Enable ALARM and PUSH (one time)
2. Refresh to verify they stay ON
3. Start working - notifications automatic!

---

**Need Help?** Check if buttons show "ON" after refresh. If yes, you're all set! 🎉
