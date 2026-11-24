# Security and privacy

## What Photobylens does with your data
- **Photos never leave your device** unless you connect Gemini. Rendering, retouching and downloads all happen locally in your browser, the Android app or the extension.
- **Gemini (optional):** when you connect your own key, a 1280px copy of each photo is sent directly from your device to Google's Gemini API for analysis. On Google's free tier, Google may use it to improve its products. Photobylens servers never see your photo or your key.
- **Your Gemini key** is stored only on your device (browser storage). Remove it anytime with **Change Gemini key → Remove key**. The Android app excludes its data from Android backups.
- **HD purchases:** payment is handled by Stripe Checkout; Photobylens never sees card details. To restore your photo after paying, it is kept in your device's storage for up to 24 hours, then deleted, and deleted immediately once your HD file is generated.
- **No tracking:** no analytics, no ads, no cookies, no third-party fonts or scripts. The site and apps only talk to Google's Gemini API (if you connect it) and the payment API.

## Protections in place
- Strict Content Security Policy: only Photobylens's own code can run, and network access is limited to Gemini and the payment API.
- Android release builds are signed, not debuggable, and exclude app data from backups.
- Payment unlocks are verified with Stripe on the server and tied to one photo.
- Build pipeline: pinned GitHub Actions, locked dependency versions with install scripts blocked, and the signing key exposed only to the signing step.

## Reporting a problem
Please report security issues privately through GitHub: **Security → Report a vulnerability** on this repository. Don't open a public issue.
