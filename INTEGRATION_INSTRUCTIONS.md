# Integration Instructions - Phase 1

## Step 1: Update App.jsx to Use MainContainer

The current App.jsx uses ChatScreen for authenticated users. We need to add a conditional to use MainContainer instead when the user is authenticated.

**Update `client/src/App.jsx`:**

```jsx
// Add import at top
import MainContainer from "./layouts/MainContainer";

// In the Chat screen section, replace:
// if (isChat) {
//     return (
//         <ErrorBoundary>
//             <ChatScreen
//                 auth={authState}
//                 chat={chat}
//                 personalInfo={personalInfo}
//                 modals={modals}
//                 handlers={handlers}
//                 tempFlow={tempFlow}
//             />
//         </ErrorBoundary>
//     );
// }

// With:
if (isChat) {
    return (
        <ErrorBoundary>
            <MainContainer 
                auth={authState}
                token={authState.token}
                userId={authState.authUserId}
            />
        </ErrorBoundary>
    );
}
```

---

## Step 2: Update index.css

Add global styles to `client/src/index.css`:

```css
/* Import responsive patterns */
@import './styles/responsive.css';

/* Reset & Base Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background: #f8f8f8;
  color: var(--color-text);
}

/* Prevent overscroll on iOS */
html, body {
  position: fixed;
  width: 100%;
  height: 100%;
}

#root {
  position: fixed;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
```

---

## Step 3: Fix ChatPage.js

The ChatPage.js file has import order issues. Update it:

```javascript
// client/src/pages/ChatPage.js

import { useState, useEffect, useRef } from 'react';
import '../styles/responsive.css';
import './ChatPage.css';

/**
 * ChatPage - Full page version of ChatScreen
 * Displays chat messages and input for oracle interaction
 */
export default function ChatPage({ userId, token, auth }) {
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000";

  // ... rest of the code as in ChatPage.js file ...
}
```

---

## Step 4: Install Dependencies (if not already done)

```bash
npm install react-swipeable framer-motion
```

**Verify in `client/package.json`:**
```json
"dependencies": {
  "react": "^18.x.x",
  "react-dom": "^18.x.x",
  "react-swipeable": "^7.x.x",
  "framer-motion": "^10.x.x",
  // ... other dependencies
}
```

---

## Step 5: Verify Folder Structure

Ensure these files exist:

```
client/src/
├── layouts/
│   ├── MainContainer.js
│   ├── MainContainer.css
│   ├── Navigation.js
│   ├── Navigation.css
│   ├── PageIndicator.js
│   └── PageIndicator.css
├── pages/
│   ├── ChatPage.js
│   └── ChatPage.css
├── styles/
│   └── responsive.css
├── App.jsx
└── index.css
```

---

## Step 6: Start Development Server

```bash
cd client
npm start
```

**Expected Behavior:**
- Landing page shows normally
- After login, MainContainer appears
- Desktop (≥768px): Left sidebar with "Chat" item
- Mobile (<768px): Top header with hamburger menu
- Page indicators (dots) at bottom
- Chat messages display
- Swipe gestures work (if on mobile/tablet)
- Menu click navigates (currently only Chat page)

---

## Step 7: Test Responsive Layout

1. **Desktop (1024px+)**
   - [ ] Sidebar visible on left (250px)
   - [ ] "Chat" menu item highlighted
   - [ ] Content area on right
   - [ ] Page dots visible at bottom-right

2. **Tablet (768px - 1023px)**
   - [ ] Sidebar visible but narrower
   - [ ] Layout adjusts proportionally
   - [ ] Touch targets still 44px

3. **Mobile (<768px)**
   - [ ] Hamburger menu at top
   - [ ] No sidebar visible
   - [ ] Full-width content
   - [ ] Page dots at bottom-center
   - [ ] Hamburger menu overlay works
   - [ ] Swipe left/right works (Chrome DevTools)

---

## Step 8: Troubleshooting

### Issue: Sidebar doesn't appear on desktop
**Solution:** Check CSS media queries in Navigation.css - ensure `@media (min-width: 768px)` is correct.

### Issue: Layout broken, sidebar overlaps content
**Solution:** Verify MainContainer.css grid layout:
```css
.main-container {
  display: grid;
  grid-template-columns: 250px 1fr;  /* Sidebar: 250px, Content: rest */
  grid-template-rows: auto 1fr;
  height: 100vh;
}
```

### Issue: Swipe not working on desktop
**Solution:** Normal - swipe detection is for touch devices. Use DevTools with device emulation to test.

### Issue: Messages not loading
**Solution:** 
1. Check console for errors
2. Verify token is being passed correctly
3. Check API_URL environment variable
4. Verify `/chat/history/{userId}` endpoint works

### Issue: iOS 16+ safe area issues
**Solution:** responsive.css uses `env(safe-area-inset-*)` which requires:
```html
<!-- In client/public/index.html head: -->
<meta name="viewport" content="viewport-fit=cover">
```

---

## Next Phase - Week 3 Checklist

Before moving to Week 3 (PersonalInfo page conversion):

- [ ] MainContainer works on desktop
- [ ] MainContainer works on mobile
- [ ] ChatPage displays messages correctly
- [ ] Send message functionality works
- [ ] Auto-scroll to latest message works
- [ ] No console errors
- [ ] Navigation is responsive
- [ ] Page indicators work
- [ ] Hamburger menu closes after selection
- [ ] Browser back button doesn't break nav

---

## Quick Command Reference

```bash
# Install all dependencies
npm install

# Start development
npm start

# Build for production
npm run build

# Check for unused CSS (optional)
npm audit
```

---

## File Modification Summary

**Modified Files:**
- `client/src/App.jsx` - Add MainContainer import and conditional

**New Files Created:**
- `client/src/layouts/MainContainer.js`
- `client/src/layouts/MainContainer.css`
- `client/src/layouts/Navigation.js`
- `client/src/layouts/Navigation.css`
- `client/src/layouts/PageIndicator.js`
- `client/src/layouts/PageIndicator.css`
- `client/src/pages/ChatPage.js`
- `client/src/pages/ChatPage.css`
- `client/src/styles/responsive.css`

---

## Performance Considerations

1. **Code Splitting**: Each page can be lazy-loaded later
```javascript
const ChatPage = lazy(() => import('../pages/ChatPage'));
```

2. **Image Optimization**: Use responsive images in pages
```html
<img srcSet="... 1x, ... 2x" />
```

3. **State Management**: Currently using local state. Consider Context API if needed:
```javascript
// For complex state across multiple pages
const [globalState, setGlobalState] = useState({});
```

---

## Accessibility Checklist

- [ ] All buttons have `aria-label` or visible text
- [ ] Page indicators have `aria-current`
- [ ] Navigation menu is keyboard accessible
- [ ] Focus states visible
- [ ] Touch targets ≥ 44px
- [ ] Color contrast adequate
- [ ] Semantic HTML used
- [ ] Animations respect `prefers-reduced-motion`

---

Good to go! Follow these steps and you'll have the SPA foundation working. Let me know if you hit any issues! 🚀
