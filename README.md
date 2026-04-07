# CloudChat Pro

A premium full-stack cloud-based real-time chat application built with React, Tailwind CSS, Firebase Authentication, Firestore, and Firebase Hosting.

## Included features

- Email/password + Google authentication
- Persistent auth sessions
- One-to-one real-time messaging with Firestore listeners
- Premium SaaS dashboard UI inspired by WhatsApp Web / Slack / Discord
- Searchable sidebar with users and recent chats
- Light / dark mode toggle
- Online / last seen status
- Typing indicator
- Emoji picker
- Read and delivered states
- Responsive mobile + desktop layout
- Firebase Hosting configuration
- Firestore rules included

## Project structure

- `src/` React app
- `firebase.json` Hosting config
- `firestore.rules` Security rules
- `.env.example` Firebase config template

## Local setup

1. Install packages
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env`
3. Paste your Firebase Web App config values into `.env`
4. Enable in Firebase console:
   - Authentication: Email/Password + Google
   - Firestore Database
   - Hosting
5. Run development server
   ```bash
   npm run dev
   ```

## Firestore suggested structure

### users collection
- `uid`
- `name`
- `email`
- `photoURL`
- `status`
- `lastSeen`
- `typingTo`
- `typingUpdatedAt`

### chats collection
- `participants`
- `lastMessage`
- `updatedAt`

### messages subcollection
- `text`
- `senderId`
- `timestamp`
- `readBy`

## Deploy to Firebase Hosting

```bash
npm run build
npm install -g firebase-tools
firebase login
firebase init hosting
firebase use --add
firebase deploy
```

## Notes

Because Firebase credentials are project-specific, you only need to add your own `.env` values and connect this app to your Firebase project before deploying.
