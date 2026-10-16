# Apekshya — Product Designer Portfolio

A modern, responsive personal portfolio showcasing UX/UI design work across complex domains (AI, migration tech, computer vision, and industrial manufacturing).

---

## Project Structure

```
portfolio/
├── index.html                  # Main portfolio landing page
├── README.md                   # Project documentation & setup instructions
├── css/
│   └── style.css               # Design tokens, layouts, animations & responsive rules
├── js/
│   └── main.js                 # Smooth scroll, stacking cards, modals, gallery & password gate
├── pages/
│   ├── skillx.html             # SkillX Case Study
│   ├── builderlytics.html      # Builderlytics Case Study (Password protected)
│   ├── nutrunner.html          # Nut Runner Case Study (Password protected)
│   └── layman.html             # The Layman AI Case Study
└── assets/
    ├── images/                 # Profile, hero visuals, and section graphics
    ├── logos/                  # Client & product logos
    ├── illustrations/          # Illustrations for the Beyond UI/UX gallery
    └── posts/                  # Social media graphics
```

---

## Features & Enhancements

* **Sticky 3D Stacking Project Cards**: Smooth desktop scroll scaling & brightness dynamics that automatically adjust to a clean, non-overlapping vertical flow on mobile screens (`<= 760px`).
* **Beyond UI/UX Interactive Deck**: 3-card rotating 3D stack with autoplay (every 3.6s) that pauses seamlessly when hovering or when the gallery modal is active, and resumes upon closing.
* **Protected Case Studies**: Clean modal password gate for confidential projects:
  * **Builderlytics**: password is `unlockcasestudy`
  * **Nut Runner**: password is `unlockbolt`
  * Includes shake feedback on incorrect entries and auto-focus.
* **Graceful Asset Fallbacks**: Every image element is equipped with inline SVG/CSS fallbacks to ensure the UI never appears broken if local image files or external MCP links are pending.
* **Accessibility & Keyboard Navigation**: Fully keyboard navigable (`Esc` to dismiss modals, focus management on dialog launch/close, ARIA states for mobile menus).

---

## How to Run Locally

You can preview the portfolio locally with any standard static HTTP server.

### Option 1: Python HTTP Server (Recommended)
```bash
# In your terminal, navigate to the portfolio directory:
cd "C:\Users\A C E R\.gemini\antigravity\scratch\portfolio"

# Start the server:
python -m http.server 8000
```
Then open your browser to [http://localhost:8000](http://localhost:8000).

### Option 2: VS Code / Live Server Extension
Open the `portfolio` directory in VS Code or Antigravity and click **"Go Live"** in the status bar.

---

## Adding Your Own Assets

To replace placeholder images with your actual design files:
1. Place your headshot in `assets/images/profile.jpg`.
2. Place your resume PDF in `assets/Apekshyaresume.pdf`.
3. Drop project assets into `assets/images/` and `assets/logos/`.
4. Drop gallery images for Logos, Illustrations, and Social Posts into their respective folders under `assets/`.
