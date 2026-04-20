# Local Development Guide

This guide explains how to run the application locally and connect it to your existing Firebase database.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- A Firebase project with Firestore and Authentication enabled.

## Setup Instructions

### 1. Clone or Download the Project
Ensure you have the project files on your local machine.

### 2. Install Dependencies
Open your terminal in the project root and run:
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory. You can copy the contents of `.env.example` as a starting point:
```bash
cp .env.example .env
```

Fill in your Firebase configuration details in the `.env` file:

```env
# Gemini AI API Key (Optional, for AI features)
GEMINI_API_KEY="your_gemini_api_key"

# App URL (Required for some features)
# Use http://localhost:3000 for local development
APP_URL="http://localhost:3000"

# Google Maps API Key (Optional, for maps features)
VITE_GOOGLE_MAPS_API_KEY="your_google_maps_api_key"

# Firebase Configuration
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_APP_ID="your-app-id"
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
VITE_FIREBASE_DATABASE_ID="(default)" # Or your specific database ID
VITE_FIREBASE_STORAGE_BUCKET="your-project-id.firebasestorage.app"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
```

> **Note:** You can find these values in your Firebase Console under **Project Settings > General > Your apps**.

### 4. Run the Development Server
Start the local development server:
```bash
npm run dev
```
The app will typically be available at `http://localhost:3000` (or the port specified in the terminal).

## Firebase Setup Requirements

To ensure the app works correctly with your Firebase database, make sure you have:

1.  **Authentication Enabled**: Enable "Google" as a sign-in provider in the Firebase Console.
2.  **Firestore Database**: Create a Firestore database in your project.
3.  **Security Rules**: Deploy the rules from the `firestore.rules` file in this project to your Firebase project.
4.  **Authorized Domains**: Add `localhost` to the list of authorized domains in **Firebase Console > Authentication > Settings > Authorized domains**.

## Troubleshooting

- **Permissions Error**: Ensure your Firestore Security Rules are deployed and that you are signed in with an authorized account.
- **Connection Issues**: Check that your `.env` values exactly match your Firebase project settings.
- **Maps Not Loading**: Ensure your Google Maps API key is valid and has the necessary APIs enabled (Maps JavaScript API, Places API).
