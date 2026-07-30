# 🚀 Render Deployment Guide for Hancia Manga Reader

This repository is pre-configured for seamless, zero-config deployment on **[Render.com](https://render.com)**.

---

## 📋 Steps to Deploy on Render

### Method 1: Blueprint Deployment (Recommended)
1. Push your changes or ensure your repository is updated on GitHub (`testings` or `main` branch).
2. Log into your **[Render Dashboard](https://dashboard.render.com/)**.
3. Click **New +** in the top right corner and select **Blueprint**.
4. Connect your GitHub account and select the **`12345noubia/hancia`** repository.
5. Render will automatically detect the `render.yaml` file in the root directory.
6. Click **Apply**. Render will automatically build and publish your web app with HTTPS enabled.

---

### Method 2: Manual Static Site Deployment
If you prefer manual setup without blueprints:
1. Go to your **Render Dashboard**.
2. Click **New +** -> **Static Site**.
3. Connect repository: `12345noubia/hancia`.
4. Fill in the deployment details:
   - **Name:** `hancia-manga-reader`
   - **Branch:** `testings` (or `main`)
   - **Build Command:** *(Leave blank)*
   - **Publish Directory:** `.` (root directory)
5. Click **Create Static Site**.

---

## ⚙️ How it Works & CORS Capabilities
- **Static Hosting:** Hancia is a lightweight, ultra-fast client-side single page application built with HTML5, CSS3, and modern JavaScript ES6+.
- **Real-Time MangaDex API:** The app communicates live with `https://api.mangadex.org`.
- **CORS Resiliency:** Includes automatic CORS proxy failover (`corsproxy.io`, `allorigins`) to ensure uninterrupted real-time fetching across all devices and hosting platforms.
- **Vertical Webtoon Reader:** Built with vertical continuous scrolling optimized for webtoons and manga chapters.
- **Dark Mode:** Supports automatic system dark/light preference detection and manual toggle saved in `localStorage`.
