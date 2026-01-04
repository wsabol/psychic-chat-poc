# Spanish Translation File Structure - CONFIRMED

## Current Working Structure

### ✅ **esESCore** (es-ES-core.json)
Contains all non-astrology translations:
- common, landing, login, verification, twoFactor
- settings, personalInfo, security, passwords
- menu, chat, voice, validation, errors
- thankyou, onboarding, modals, timers, help
- terms, policies

### ✅ **esESAstrology** (es-ES-astrology.json)
Contains ALL astrology-related translations:
```json
{
  "horoscope": {...},
  "moonPhase": {...},
  "cosmicWeather": {
    "mercury": "Mercurio",
    "venus": "Venus",
    "mars": "Marte",
    "jupiter": "Júpiter",
    "saturn": "Saturno",
    "uranus": "Urano",
    "neptune": "Neptuno",
    "pluto": "Plutón",
    "sun": "Sol",
    "moon": "Luna",
    ...
  },
  "mySign": {
    "aries": "Aries",
    "taurus": "Tauro",
    "gemini": "Géminis",
    "cancer": "Cáncer",
    "leo": "Leo",
    "virgo": "Virgo",
    "libra": "Libra",
    "scorpio": "Escorpio",
    "sagittarius": "Sagitario",
    "capricorn": "Capricornio",
    "aquarius": "Acuario",
    "pisces": "Piscis",
    ...all mySign keys...
  },
  "astrology": {...},
  "elements": {...},
  "planets": {...}
}
```

### ✅ **esESBilling** (es-ES-billing.json)
Contains billing-related translations:
- billing
- paymentMethods
- subscriptions
- invoices

---

## How Pages Use Translations

### Astrology Pages (HoroscopePage, MoonPhasePage, MySignPage, CosmicWeatherPage)
- Use `t('mySign.${signName}')` → **esESAstrology**
- Use `t('cosmicWeather.${planetName}')` → **esESAstrology**
- Use `t('astrology.*')` → **esESAstrology**
- Use `t('elements.*')` → **esESAstrology**
- Use `t('planets.*')` → **esESAstrology**
- Use `t('horoscope.*')` → **esESAstrology**
- Use `t('moonPhase.*')` → **esESAstrology**

### Billing Pages (BillingPage, PaymentMethodPage, SubscriptionsPage, InvoicesPage)
- Use `t('billing.*')` → **esESBilling**
- Use `t('paymentMethods.*')` → **esESBilling**
- Use `t('subscriptions.*')` → **esESBilling**
- Use `t('invoices.*')` → **esESBilling**

### All Other Pages
- Use `t('common.*')` → **esESCore**
- Use `t('landing.*')` → **esESCore**
- Use `t('login.*')` → **esESCore**
- Use `t('chat.*')` → **esESCore**
- Use `t('settings.*')` → **esESCore**
- etc.

---

## Action: What to Do with es-ES.json

**DELETE es-ES.json** - It's redundant!

Current `es-ES.json` is a consolidated copy that combines parts of core + astrology + billing.
Since TranslationContext.jsx merges the 3 files correctly, we don't need it.

---

## Next Steps: Apply to All Languages

Once Spanish is confirmed correct, replicate for:
- **de-DE-core.json** + **de-DE-astrology.json** + **de-DE-billing.json**
- **it-IT-core.json** + **it-IT-astrology.json** + **it-IT-billing.json**
- **pt-BR-core.json** + **pt-BR-astrology.json** + **pt-BR-billing.json**
- **ja-JP-core.json** + **ja-JP-astrology.json** + **ja-JP-billing.json**
- **zh-CN-core.json** + **zh-CN-astrology.json** + **zh-CN-billing.json**

Plus keep:
- **fr-FR-core.json** + **fr-FR-astrology.json** + **fr-FR-billing.json** (already using this pattern)

---

## Status Check

✅ Spanish working correctly with 3-file modular structure
⏳ Billing - partially complete (some keys missing)
⏳ Preferences - missing 1 translation
✅ Horoscope - fully translated
✅ Moon Phase - fully translated
✅ My Sign - fully translated
✅ Cosmic Weather - fully translated (cosmicWeather + planets + elements + mySign sections)
✅ Landing, Firebase, Thank you pages - all working
