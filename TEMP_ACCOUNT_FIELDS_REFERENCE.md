# Temporary Account Fields Reference

## Summary of All Fields for Temporary Users During Onboarding

### ✅ VISIBLE FIELDS (User Must Provide or Can Select)

| Field | Required? | Type | Default/Auto-fill | Notes |
|-------|-----------|------|-------------------|-------|
| **Email** | ✅ YES | Text | `tempuser@example.com` | Pre-filled automatically |
| **Birth Date** | ✅ YES | Date | None (user enters) | Format: `dd-mmm-yyyy` (e.g., 09-Feb-1956) |
| **Sex** | ❌ NO | Select | `Unspecified` | User can choose: Male, Female, Non-binary, Prefer not to say, Unspecified |
| **Birth Time** | ❌ NO | Time | `NULL` (if empty) | Optional - for accurate astrological calculations |
| **Birth Country** | ❌ NO | Select | `NULL` (if empty) | Optional - from dropdown list |
| **Birth Province/State** | ❌ NO | Text | `NULL` (if empty) | Optional - e.g., California, Ontario |
| **Birth City** | ❌ NO | Text | `NULL` (if empty) | Optional - e.g., New York, Toronto |
| **Birth Timezone** | ❌ NO | Text | `NULL` (if empty) | Optional - e.g., America/New_York |
| **Address Preference** | ❌ NO | Text | `NULL` (if empty) | Optional - how oracle should address user |

---

### 🔒 HIDDEN FIELDS (Automatically Filled by Code)

| Field | Hidden? | Default Value | Source |
|-------|---------|----------------|--------|
| **First Name** | ✅ YES | `'Seeker'` | Frontend auto-fill in PersonalInfoModal.js |
| **Last Name** | ✅ YES | `'Soul'` | Frontend auto-fill in PersonalInfoModal.js |

---

### 📋 REQUIRED FIELDS FOR SAVE

**For Temporary Accounts (tempuser@example.com):**
- ✅ Email
- ✅ Birth Date

**That's it!** Everything else is optional.

---

### 🔧 Backend Default Handling

The backend has these fallbacks when fields are empty or `NULL`:

```javascript
firstName || 'Temporary'    // If not provided, becomes 'Temporary'
lastName || 'User'          // If not provided, becomes 'User'
sex || 'Unspecified'        // If not provided, becomes 'Unspecified'
birthTime → NULL            // If empty string, converted to NULL
birthCountry → NULL         // If empty string, converted to NULL
birthProvince → NULL        // If empty string, converted to NULL
birthCity → NULL            // If empty string, converted to NULL
birthTimezone → NULL        // If empty string, converted to NULL
addressPreference → NULL    // If empty string, converted to NULL
```

---

## ⚠️ Root Cause of Previous Error

**Problem:** PostgreSQL TIME field cannot accept empty strings `""`
**Error Message:** `invalid input syntax for type time: ""`
**Solution:** Convert empty strings to `NULL` before database insert

This has now been fixed in `api/routes/user-profile.js` with:
```javascript
const safeTime = birthTime && birthTime.trim() ? birthTime : null;
const safeCountry = birthCountry && birthCountry.trim() ? birthCountry : null;
// ... etc for all optional fields
```

---

## Onboarding Flow for Temporary User

1. **Landing Page** → Click "Try for Free"
2. **Auto-create temp account** with `tempuser@example.com` email
3. **First Oracle Response** → Receive greeting message
4. **First Response Received** → After 45 seconds, show astrology prompt
5. **Astrology Prompt** → "Would you like to enhance your reading?"
   - Click "Yes, Enter My Birth Info"
6. **Personal Info Modal Opens** with:
   - ✅ Email: `tempuser@example.com` (pre-filled)
   - ❌ First/Last Name: Hidden (auto-filled as 'Seeker'/'Soul')
   - ⚠️ Birth Date: **MUST ENTER** (user input)
   - 📍 Optional: Country, Province, City
   - ⏰ Optional: Birth Time, Timezone
   - Sex: Optional (can select or auto-fills with 'Unspecified')
   - Address Preference: Optional
7. **Click Save** → Validates required fields (email, birthDate) ✅ NOW FIXED
8. **Show "My Sign"** → Display zodiac sign based on birthdate
9. **Second Oracle Question** → User can ask oracle again
10. **After Second Response** → Show account creation prompt
11. **Exit Flow** → Option to create real account

---

## Testing Checklist

- [ ] Temp account created successfully (tempuser@example.com)
- [ ] Email field shows correct value
- [ ] Birth date can be entered (dd-mmm-yyyy format)
- [ ] Sex field is visible and optional
- [ ] Optional fields can be left empty
- [ ] **Save succeeds WITHOUT errors** ✅ NOW FIXED
- [ ] Zodiac sign displays correctly
- [ ] No "Failed to save personal information" error

