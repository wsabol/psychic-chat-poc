# Firebase Configuration Setup Guide

This guide will walk you through configuring Firebase for the Starship Psychics mobile app on iOS and Android.

## Prerequisites

- Firebase project created at [Firebase Console](https://console.firebase.google.com/)
- Node.js and npm installed
- Xcode installed (for iOS)
- Android Studio installed (for Android)

---

## Step 1: Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable the following services:
   - **Authentication** (Email/Password provider)
   - **Firestore Database**
   - **Cloud Messaging** (FCM)
   - **Analytics**
   - **Crashlytics**

---

## Step 2: iOS Configuration

### 2.1 Register iOS App in Firebase

1. In Firebase Console, click on "Add app" and select iOS
2. Enter your iOS bundle ID: `com.starshippsychics.mobile`
3. Download the `GoogleService-Info.plist` file

### 2.2 Add GoogleService-Info.plist to Xcode

1. Open the iOS project in Xcode:
   ```bash
   cd ios
   open StarshipPsychicsMobile.xcworkspace
   ```

2. Drag and drop `GoogleService-Info.plist` into the Xcode project:
   - Place it in the `StarshipPsychicsMobile` folder
   - Make sure "Copy items if needed" is checked
   - Ensure it's added to the `StarshipPsychicsMobile` target

### 2.3 Install iOS Dependencies

```bash
cd ios
pod install
cd ..
```

### 2.4 Update Info.plist (Already configured)

The `Info.plist` has been pre-configured with:
- Background modes for remote notifications
- Camera and photo library usage descriptions

### 2.5 Configure Push Notifications

1. Open Xcode project
2. Select your target → "Signing & Capabilities"
3. Click "+ Capability" and add:
   - **Push Notifications**
   - **Background Modes** (enable "Remote notifications")

---

## Step 3: Android Configuration

### 3.1 Register Android App in Firebase

1. In Firebase Console, click on "Add app" and select Android
2. Enter your Android package name: `com.starshippsychicsmobile`
3. Download the `google-services.json` file

### 3.2 Add google-services.json to Android

1. Place `google-services.json` in the Android app folder:
   ```bash
   cp google-services.json android/app/
   ```

2. The file should be located at: `android/app/google-services.json`

### 3.3 Verify Build Configuration (Already configured)

The following have been pre-configured:
- Google Services plugin in `android/build.gradle`
- Firebase Crashlytics plugin in `android/app/build.gradle`
- All necessary dependencies

---

## Step 4: Environment Variables

Create a `.env` file in the mobile root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
# API Configuration
API_URL=https://app.starshippsychics.com

# Stripe
STRIPE_PUBLISHABLE_KEY=your_actual_stripe_key_here
```

> **Note**: Firebase configuration is handled automatically by the native config files (GoogleService-Info.plist and google-services.json), so you don't need Firebase credentials in .env.

---

## Step 5: Install Dependencies

```bash
npm install
```

---

## Step 6: Build and Run

### For iOS:

```bash
npm run ios
```

Or open Xcode and run from there:
```bash
cd ios
open StarshipPsychicsMobile.xcworkspace
```

### For Android:

```bash
npm run android
```

Or open in Android Studio:
```bash
cd android
```
Then run from Android Studio.

---

## Step 7: Configure App Store Connect (iOS)

### 7.1 Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Create a new app with bundle ID: `com.starshippsychics.mobile`

### 7.2 Set Up In-App Purchases

Create the following subscription products:

**Monthly Subscription:**
- Product ID: `com.starshippsychics.monthly`
- Type: Auto-Renewable Subscription
- Subscription Group: Premium Access
- Price: $19.99/month

**Annual Subscription:**
- Product ID: `com.starshippsychics.annual`
- Type: Auto-Renewable Subscription
- Subscription Group: Premium Access
- Price: $199.99/year

### 7.3 Configure Subscription Features

- Set up subscription duration
- Add localized descriptions
- Configure intro offers if desired
- Submit for review

---

## Step 8: Configure Google Play Console (Android)

### 8.1 Create App in Google Play Console

1. Go to [Google Play Console](https://play.google.com/console/)
2. Create a new app

### 8.2 Set Up In-App Billing

Create the following subscription products:

**Monthly Subscription:**
- Product ID: `com.starshippsychics.monthly`
- Type: Subscription
- Billing Period: 1 month
- Price: $19.99

**Annual Subscription:**
- Product ID: `com.starshippsychics.annual`
- Type: Subscription
- Billing Period: 1 year
- Price: $199.99

### 8.3 Link to Firebase

1. In Firebase Console, go to Project Settings
2. Link your Google Play developer account
3. Enable Google Play Billing

---

## Step 9: Test Firebase Services

### Test Crashlytics

The app will automatically send a test crash report on first launch. Check Firebase Console → Crashlytics to verify.

### Test Analytics

Analytics events are logged automatically. Check Firebase Console → Analytics to see:
- `app_open` event
- Screen view events
- Custom events from user interactions

### Test Push Notifications

1. Get the FCM token from the console logs
2. Send a test message from Firebase Console → Cloud Messaging
3. Verify the notification is received

---

## Troubleshooting

### iOS Issues

**Pods not found:**
```bash
cd ios
pod deintegrate
pod install
cd ..
```

**Build fails with Firebase errors:**
- Ensure `GoogleService-Info.plist` is added to the Xcode project
- Check that it's in the correct target
- Clean build folder (Cmd+Shift+K) and rebuild

### Android Issues

**google-services.json not found:**
- Verify the file is in `android/app/google-services.json`
- Check file permissions
- Clean and rebuild:
  ```bash
  cd android
  ./gradlew clean
  cd ..
  ```

**Firebase initialization errors:**
- Verify package name matches in `google-services.json` and `android/app/build.gradle`
- Check that all Firebase services are enabled in Firebase Console

### General Issues

**Missing dependencies:**
```bash
rm -rf node_modules
npm install
```

**Metro bundler cache:**
```bash
npm start -- --reset-cache
```

---

## Next Steps

After configuration is complete:

1. ✅ Test authentication flow
2. ✅ Verify subscription purchases work
3. ✅ Test push notifications
4. ✅ Check Crashlytics reporting
5. ✅ Verify Analytics events
6. 📱 Test on physical devices
7. 🚀 Submit to App Store and Google Play

---

## Support

For issues or questions:
- Check Firebase Console for error logs
- Review Crashlytics for app crashes
- Check device logs for debugging information

## Security Notes

⚠️ **Important:**
- Never commit `GoogleService-Info.plist` or `google-services.json` to version control
- Keep `.env` file private (it's in .gitignore)
- Store sensitive keys in secure environment variables
- Use different Firebase projects for development and production
