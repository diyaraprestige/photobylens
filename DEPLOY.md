# Photobylens: owner's setup guide

You upload a phone photo, pick one of 40 lenses and tap to focus. AI retouches the photo like a finished edit (white balance, exposure, highlights, shadows, colour, aperture and focus). The site then renders it as if that lens took it. Zoom and macro lenses crop in around the subject without cutting off heads or bodies. Everything runs in the visitor's browser. Standard downloads (1280px) are free. HD downloads (full original resolution, up to 6000px) are paid through Stripe Checkout.

## What's inside

```
index.html            the website
assets/styles.css     the design
assets/lenses.js      the lens catalogue: names, specs and rendering character for each lens
assets/engine.js      the WebGL optics engine: depth of field, bokeh and lens character
assets/lens3d.js      the realistic 3D lens models (Three.js)
assets/app.js         the page logic: upload, focus, AI depth, downloads, payment flow
assets/vendor/        Three.js r150, bundled so the site needs no CDN
api/config.js         tells the page which features are switched on (no secrets)
api/checkout.js       starts Stripe Checkout for one HD download
api/verify.js         confirms the payment when the buyer comes back
server.js             runs the whole site on any Node 18+ server
```

## How the GitHub repo works
- **Website:** every push to `main` publishes the site to GitHub Pages (`.github/workflows/pages.yml`) at `https://diyaraprestige.github.io/photobylens/`.
- **Apps:** every tag starting with `v` (for example `v1.0.1`), or a manual run of **Release** in the Actions tab, builds:
  - `Photobylens.apk`, the Android app (Capacitor 8),
  - `Photobylens-extension.zip`, the Chrome/Edge extension (Manifest V3),
  - `Photobylens-web.zip`, the website files,

  and publishes them as a GitHub Release. Download links of the form `releases/latest/download/...` always point to the newest release.
- **New version:** change `"version"` in `package.json`, push, then create a tag: `git tag v1.0.1 && git push --tags`.
- **APK signing:** the release workflow signs the APK with the repo secrets `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD` and `ANDROID_KEY_ALIAS`. Keep a private backup of the keystore: Android only installs updates signed with the same key.
- **Payments for the app, extension and GitHub Pages:** GitHub Pages can't run the payment API. Deploy this same repo to Vercel (below), then in GitHub go to Settings → Secrets and variables → Actions → **Variables** and add `PBL_API_BASE` = your Vercel address (for example `https://photobylens.vercel.app/`). Re-run the workflows. Until then, HD shows "being set up" and the free standard download works everywhere.

## Go live

### Option A: Vercel (easiest)
1. Push this folder to a GitHub repo, then import it at vercel.com. No build step is needed.
2. In Project → Settings → Environment Variables, add the values from `.env.example`.
3. Redeploy, then connect your domain.

### Option B: any VPS, cPanel Node app or Render/Railway
1. Upload the folder, then copy `.env.example` to `.env` and fill it in.
2. Run `node server.js`, or `npm start`. It listens on `PORT`, 3000 by default.
3. Put it behind HTTPS (Nginx, Caddy or your host's SSL).

The site needs HTTPS: browsers only allow the camera-roll upload and payments on secure pages.

## Settings (.env)

| Name | What it does |
|---|---|
| `STRIPE_SECRET_KEY` | Your Stripe secret key. Use `sk_test_…` while testing and `sk_live_…` for real payments. |
| `HD_PRICE_SEN` | HD price in sen, e.g. `990` = RM9.90. While this is `0`, the HD button shows "being set up". |
| `CURRENCY` | `MYR` by default. |
| `SITE_URL` | Your live address. Buyers are sent back here after paying. |

In the Stripe Dashboard → Settings → Payment methods, switch on FPX, cards, and GrabPay if you want it. Checkout then offers them automatically.

## AI retouch: each visitor's own free Gemini
- Visitors click **Connect free Gemini**, create a free API key at aistudio.google.com/apikey with their Google account, and paste it in. No billing is needed.
- The key is saved only in their browser (localStorage). Photos go straight from their browser to Google, never through your server, so you pay nothing for AI.
- The site finds the newest free Gemini Flash model on that key automatically, so it keeps working as Google renames its models.
- Gemini only *reads* the photo: it returns the depth, subject, focus point, aperture and edit values. The browser applies them to the real photo, so nothing is redrawn or invented.
- Without a key, the site still runs an on-device auto retouch: automatic white balance, exposure and tone.
- On Google's free tier, Google may use the data sent to improve its products. The connect dialog tells visitors this.

## How the HD payment works
1. The buyer clicks **Download HD** and sees the price, then clicks **Pay securely**.
2. The photo and their lens settings are saved in their own browser (IndexedDB), and they go to Stripe Checkout.
3. After paying, Stripe sends them back to `/?paid=<session>`. The site restores their photo and `api/verify` confirms the payment with Stripe. The HD file is then generated automatically in their browser, and a **Download HD** button appears for them to click.
4. If they cancel, they come back with their photo and settings still in place.

Note: the rendering runs in the buyer's browser, which keeps the site fast and private. As with any browser-based editor, a determined developer could get around the HD lock by editing the page code. Ordinary buyers can't. If you later need it locked down completely, add server-side HD rendering.

## Using real lens product photos
The lens images are original 3D renders, so no brand photos are copied. If you get licensed product photos (for example from a press kit or with the maker's permission), save them as PNGs with transparent backgrounds in `assets/lenses/`. Then add `img:'assets/lenses/<id>.png'` to that lens in `assets/lenses.js`. The site uses the photo instead of the render.

## Adding or editing lenses
Each entry in `assets/lenses.js` has:
- the name, category, focal length (`f`) and widest aperture (`N`)
- a short `look` line and `best` uses
- the rendering character `ch`: contrast, saturation, warmth, clarity, vignette, glow, flare, bokeh shape, swirl, fisheye, tilt-shift and so on
- the 3D body shape `b`: length, diameter and colour, where `k` is black, `w` white, `s` silver and `b` brass
