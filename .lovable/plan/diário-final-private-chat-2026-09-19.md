# Diário final private chat

## Experience
- Keep the existing scrapbook screens and `/test` route, but require the existing email/password account before showing the main app.
- Replace the mocked Chat screen with the real Dominic conversation while preserving the discreet Diário identity and existing bottom navigation.
- Use the existing user profile for Alloah’s display name; add no signup, social login, guest access, public surfaces, or database changes.

## Chat
- Load the authenticated user’s existing Dominic conversation and messages from Supabase in chronological order, mapping `user` to Alloah and `assistant` to Dominic.
- Build the transcript and composer from AI Elements primitives, customized with the current cream, dusty pink, antique rose, burgundy, and warm-brown paper aesthetic.
- Keep the header compact, messages readable, timestamps understated, and the composer fixed above mobile safe areas with attachment and microphone placeholders.

## Behavior
- Optimistically append sent messages, show Dominic’s typing state, and invoke the existing authenticated `clever-service` function with `{ message }`.
- Append `data.reply`, refresh stored history after responses, prevent duplicate sends, and auto-scroll only when the user is already near the newest message.
- Keep technical failures out of the transcript; show “couldn’t reach him. try again.” beside a small retry action.

## Technical details
- Use the existing browser Supabase client and current session; do not alter schemas, policies, functions, secrets, authentication settings, or backend logic.
- Preserve the existing `/test` route unchanged and keep unrelated prototype screens untouched.
- Add route-specific social metadata, then verify sign-in gating, history rendering, sending, retry behavior, scrolling, and mobile/desktop layouts.