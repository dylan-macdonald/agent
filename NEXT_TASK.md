# Task: Implement Desktop Notifications & Voice Alarm Calls

## Context
You are working on an AI Personal Assistant project. This is a production-ready, daily-use tool with:
- Node.js/TypeScript backend on Linux
- React/TypeScript web dashboard
- Electron desktop agent on Windows 11
- 100% local voice pipeline (Whisper.cpp + Qwen3-TTS)
- Autonomous agent that proactively generates insights

## CRITICAL: Read These First
1. **CLAUDE.md** - Project guidelines, architecture, coding standards
2. **TODO.md** - Current feature status, what's complete, what's not

## Your Task
Implement two features that are currently marked as "NOT IMPLEMENTED YET":

### Feature 1: Desktop Notifications from Autonomous Agent
**Goal:** When the autonomous agent generates insights, send desktop notifications to the Windows 11 desktop agent.

**Requirements:**
- Use Electron's native notification API
- Notifications should appear even when desktop agent is minimized
- Must respect user's notification preferences
- Different notification types for different insight priorities (low/medium/high)
- Clicking notification should open web dashboard to view full insight
- Add settings toggle to enable/disable notifications
- Integrate with existing AutonomousAgentService in `src/services/autonomous-agent.ts`
- Use Socket.io to send notification events from backend to desktop agent

**Technical Approach:**
1. Add notification events to SocketService
2. Listen for these events in desktop agent
3. Use Electron's Notification API
4. Store notification preferences in user settings
5. Test on Windows 11

### Feature 2: Voice Alarm Calls (Twilio Voice)
**Goal:** Allow the agent to make actual phone calls to wake you up or deliver urgent messages.

**Requirements:**
- Use Twilio's Voice API to make calls
- Text-to-speech during call using Twilio's TTS (since it's over the phone)
- Integrate with existing CheckInService for morning wake-up calls
- Configurable in user settings (phone number, enable/disable, times)
- Add "voice alarm" as a reminder type
- Handle call status (answered, voicemail, failed)
- Log all calls in database
- Must respect user privacy and permissions

**Technical Approach:**
1. Extend TwilioSmsProvider to support voice calls
2. Create VoiceCallService similar to SmsService
3. Add TwiML endpoint for call flow
4. Update ReminderService to support voice call delivery
5. Add settings for voice call preferences
6. Update billing tracking to include voice call costs

## Implementation Guidelines

### Code Standards (from CLAUDE.md)
- TypeScript strict mode
- No over-engineering - only build what's needed
- Security first - all data in transit encrypted
- Test critical paths
- Follow existing patterns in the codebase
- Add comments only where logic isn't self-evident

### Testing Requirements
- Unit tests for new services
- Integration tests for Socket.io events
- Manual testing on Windows 11 (desktop notifications)
- Manual testing of Twilio voice calls

### Files You'll Likely Modify/Create

**Desktop Notifications:**
- `src/services/autonomous-agent.ts` - Add notification emission
- `src/services/socket.ts` - Add notification events
- `desktop-agent/src/main.ts` - Handle notifications
- `src/types/notification.ts` - New types
- `migrations/XXXX_add-notification-settings.mjs` - Database schema

**Voice Calls:**
- `src/integrations/twilio.ts` - Extend for voice
- `src/services/voice-call.ts` - New service
- `src/services/reminder.ts` - Add voice delivery option
- `src/api/routes/voice-call.ts` - Twilio webhook
- `src/types/voice-call.ts` - New types
- `migrations/XXXX_add-voice-calls.mjs` - Database schema

## Security Considerations
- Desktop notifications: Don't include sensitive data in notification text
- Voice calls: Verify phone numbers, rate limit calls
- Store call logs with encryption
- Add audit logging for all voice calls
- Require user consent before first call

## When You're Done

### 1. Update TODO.md
Add a changelog entry at the bottom:
```
| YYYY-MM-DDTHH:MM:SSZ | Claude (Model) | **DESKTOP NOTIFICATIONS & VOICE CALLS**: Implemented Electron notifications for agent insights and Twilio voice alarm calls. Added notification preferences, voice call service, TwiML webhooks, and comprehensive testing. All X tests passing. |
```

Mark these as complete in TODO.md:
```
- [x] Desktop notifications from autonomous agent
- [x] Voice alarm calls (Twilio voice)
```

Add new sections documenting:
- How to enable notifications
- How to configure voice alarms
- Cost implications of voice calls

### 2. Test Everything
- [ ] Desktop notifications appear on Windows 11
- [ ] Notification preferences work (enable/disable)
- [ ] Clicking notification opens dashboard
- [ ] Voice calls successfully placed via Twilio
- [ ] Call status tracked correctly
- [ ] Voice alarm wakes you up (test with yourself!)
- [ ] Cost tracking includes voice calls
- [ ] All unit tests pass

### 3. Create Documentation
Add to QUICKSTART.md:
- How to enable desktop notifications
- How to set up voice alarms
- Expected behavior
- Troubleshooting

### 4. Commit Message Format
```
feat: implement desktop notifications and voice alarm calls

Desktop Notifications:
- Add Electron notifications for autonomous agent insights
- Socket.io events for real-time notification delivery
- User preferences for notification types
- Click-to-open dashboard integration

Voice Alarms:
- Twilio Voice API integration for phone calls
- TwiML webhook for call flow
- Voice alarm reminder type
- Call status tracking and logging
- Settings for voice alarm preferences

Tests: X passing
```

## Questions to Consider
1. Should notifications stack or replace each other?
2. What happens if user misses a voice alarm call?
3. Should there be a "snooze" option for voice alarms?
4. How many retry attempts for failed calls?
5. Should voice calls use Qwen3-TTS or Twilio's built-in TTS?
   (Recommendation: Use Twilio's TTS since the call is already using Twilio)

## Expected Cost Impact
- **Desktop Notifications:** $0 (local)
- **Voice Calls:** ~$0.013/minute (Twilio Voice)
- Make sure to update cost tracking system!

## Resources
- Twilio Voice Docs: https://www.twilio.com/docs/voice
- Electron Notifications: https://www.electronjs.org/docs/latest/tutorial/notifications
- TwiML: https://www.twilio.com/docs/voice/twiml
- Existing Socket.io events: `src/services/socket.ts`

## Important Notes
- The Windows 11 desktop agent audio manager was recently updated to support Windows (line 46-56 in `desktop-agent/src/audio/manager.ts`)
- Voice pipeline is 100% local (Whisper.cpp + Qwen3-TTS) - don't change this
- Autonomous agent already generates insights - you just need to deliver them
- Follow the existing pattern in VoiceAlarmService stub at `src/services/voice-alarm.ts` if it exists

## Success Criteria
✅ User can receive desktop notifications from autonomous agent
✅ User can set voice alarms that call their phone
✅ All features respect user preferences and privacy
✅ Proper error handling and logging
✅ Tests pass
✅ Documentation updated
✅ TODO.md updated with completion and changelog

Good luck! Remember to read CLAUDE.md and TODO.md thoroughly before starting.
