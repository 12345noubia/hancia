# 🚀 Render Deployment Guide for Hancia Manga Reader

This repository is pre-configured for seamless deployment on **[Render.com](https://render.com)** with an explicit build step.

---

## 📋 Steps to Deploy on Render

### Method 1: Blueprint Deployment (Recommended)
1. Push your changes or ensure your repository is updated on GitHub (`testings` or `main` branch).
2. Log into your **[Render Dashboard](https://dashboard.render.com/)**.
3. Click **New +** in the top right corner and select **Blueprint**.
4. Connect your GitHub account and select the **`12345noubia/hancia`** repository (branch `testings`).
5. Render will automatically detect the `render.yaml` file in the root directory.
6. Click **Apply**. Render will run the build command (`npm run build`) and deploy the static site from `./dist` with HTTPS enabled.

---

### Method 2: Manual Static Site Deployment
If you prefer manual setup without blueprints:
1. Go to your **Render Dashboard**.
2. Click **New +** -> **Static Site**.
3. Connect repository: `12345noubia/hancia`.
4. Fill in the deployment details:
   - **Name:** `hancia-manga-reader`
   - **Branch:** `testings` (or `main`)
   - **Build Command:** `npm run build`
   - **Publish Directory:** `./dist`
5. Click **Create Static Site**.

---

## ⚙️ Build Process & Configuration
- **Package Config (`package.json`):** Defines `npm run build`, which creates a clean production `./dist` directory containing `index.html`, `css`, `js`, and `img` assets.
- **Render Config (`render.yaml`):** Sets `buildCommand: npm run build` and `staticPublishPath: ./dist`.
- **Real-Time MangaDex API:** The app communicates live with `https://api.mangadex.org`.
- **CORS Resiliency:** Includes automatic CORS proxy failover (`corsproxy.io`, `allorigins`) to ensure uninterrupted real-time fetching.
- **Vertical Webtoon Reader:** Continuous scrolling reader optimized for both standard manga and vertical webtoons.
- **Dark Mode:** System theme auto-detection and manual toggle saved in `localStorage`.
