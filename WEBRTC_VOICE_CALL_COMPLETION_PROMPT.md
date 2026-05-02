# Complete WebRTC Voice Call Integration - Claude Opus Prompt

## Context
You are working on a restaurant management system with a voice call feature between customers at tables and admin/reception. The system is 95% complete but has one critical issue preventing full functionality.

## Current Status

### ✅ What's Working:
1. **Admin Side (Perfect)**:
   - Receives incoming call notifications in sticky header
   - Ringtone plays and stops correctly when call is accepted
   - Call duration timer works
   - WebRTC peer connection setup works
   - Can accept/reject/end calls

2. **Caller Side (Partial)**:
   - Call initiation works
   - Ringing tone plays while waiting
   - Microphone access granted
   - WebRTC peer connection created
   - Receives `callAccepted` event from server
   - Sends offer to admin successfully

3. **Server Side (Partial)**:
   - Socket.io event routing implemented
   - Call tracking with Map structure
   - Proper callId management

### ❌ Critical Issue:
**The caller never receives the answer from the admin**, causing:
- Caller stuck at "Calling...Table X, Waiting for response..."
- Call duration timer never starts on caller side
- No actual voice transmission between parties

## Technical Details

### Current Flow:
1. Caller clicks call button → VoiceCallInterface opens
2. VoiceCallInterface emits `initiateVoiceCall` with its socket ID as callId
3. Server broadcasts `incomingVoiceCall` to all clients
4. Admin receives notification and clicks Accept
5. Admin emits `acceptVoiceCall` with the callId
6. Server sends `callAccepted` to caller ✅
7. Caller receives `callAccepted` and creates/sends offer ✅
8. Server should route offer to admin ❌
9. Admin should receive offer and send answer ❌
10. Server should route answer back to caller ❌
11. Caller should receive answer and set state to "connected" ❌

### Console Logs Analysis:
**Caller logs show:**
```
✅ Call accepted by reception, callId: 0UHIoNHxwtChCEJmAAIo
📤 VoiceCallInterface: Sending offer
🧊 VoiceCallInterface: Sending ICE candidate (multiple)
❌ MISSING: 📥 VoiceCallInterface: Received answer
```

**Admin logs show:**
```
✅ PremiumHeader: Accept message sent
✅ Rendering active call display (working)
❌ MISSING: 📤 PremiumHeader: Received offer from caller
❌ MISSING: 📥 PremiumHeader: Sending answer
```

## Root Cause Analysis
The WebRTC signaling (offer/answer/ICE candidate exchange) is not working properly. The server is not correctly routing the WebRTC messages between the specific caller and admin sockets.

## Files to Focus On:

### 1. `server/server.js` (Lines ~2160-2280)
- Socket.io event handlers for WebRTC signaling
- `activeCalls` Map for tracking caller/admin socket pairs
- Routing logic for offer/answer/ICE candidates

### 2. `client/src/components/VoiceCallInterface.js`
- Caller-side WebRTC implementation
- Socket event listeners for `answer` and `iceCandidate`
- State management for call progression

### 3. `client/src/pages/AdminPremium.js` (PremiumHeader component)
- Admin-side WebRTC implementation  
- Socket event listeners for `offer` and `iceCandidate`
- Peer connection setup in `acceptCall` function

## Required Fixes:

### Priority 1: Fix WebRTC Signaling Routing
1. **Server**: Ensure offer from caller reaches the correct admin socket
2. **Server**: Ensure answer from admin reaches the correct caller socket
3. **Server**: Ensure ICE candidates are exchanged between the right parties
4. **Debug**: Add comprehensive logging to trace message routing

### Priority 2: Admin WebRTC Handler
1. **Admin**: Ensure `offer` event listener is properly set up
2. **Admin**: Ensure offer triggers answer creation and sending
3. **Admin**: Verify peer connection state management

### Priority 3: Caller State Management
1. **Caller**: Ensure `answer` event listener updates call state to "connected"
2. **Caller**: Verify timer starts when state becomes "connected"
3. **Caller**: Handle connection state properly

## Success Criteria:
1. Caller shows "Connected" and duration timer after admin accepts
2. Both parties can hear each other's voices in real-time
3. Call can be ended from either side
4. No console errors during the entire call flow

## Key Technical Requirements:
- Use WebRTC with STUN servers for NAT traversal
- Implement proper offer/answer/ICE candidate exchange
- Maintain socket.io event routing between specific caller/admin pairs
- Handle audio streams bidirectionally
- Manage call state transitions correctly

## Debugging Strategy:
1. Add detailed console logs for every WebRTC event
2. Trace the exact path of offer/answer messages through the server
3. Verify socket IDs match between caller and admin
4. Test ICE candidate exchange
5. Confirm audio stream attachment on both sides

Please complete this integration by fixing the WebRTC signaling issues and ensuring full bidirectional voice communication works between table customers and admin/reception.