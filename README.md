# ScreenArc 🎬

![ScreenArc Banner](https://raw.githubusercontent.com/tamnguyenvan/screenarc/main/docs/assets/small-banner.png?raw=true)

<div align="center">
  <img src="https://img.shields.io/github/v/release/tamnguyenvan/screenarc?style=for-the-badge" alt="Latest Release" />
  <img src="https://img.shields.io/github/license/tamnguyenvan/screenarc?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/github/downloads/tamnguyenvan/screenarc/total?style=for-the-badge&color=green" alt="Total Downloads" />
</div>

<div align="center">
  <h3>✨ Create cinematic screen recordings with automatic pan-and-zoom effects ✨</h3>
</div>

**ScreenArc** is a smart screen recording and editing tool that makes professional video creation effortless. It automatically tracks your mouse movements and clicks, creating smooth cinematic animations that keep viewers focused on what matters. **No manual keyframing needed!**

Perfect for developers, educators, and content creators who want to produce stunning tutorials, demos, and presentations.

## 🎥 Demo

![ScreenArc Demo](https://raw.githubusercontent.com/tamnguyenvan/screenarc/main/docs/assets/screenarc-demo.gif)

---

## ⭐ Features

- 🎥 **Flexible Capture**: Record your full screen, a specific window, or a custom area with seamless multi-monitor support.
- 👤 **Webcam Overlay**: Add a personal touch by including your webcam feed in the recording.
- 🎬 **Cinematic Mouse Tracking**: Automatically generates smooth pan-and-zoom effects that follow your mouse clicks, keeping the action front and center.
- 🎨 **Powerful Editor**: A visual timeline to easily trim clips, customize frames, backgrounds (colors, gradients, wallpapers), shadows, and more.
- 📏 **Instant Aspect Ratios**: Switch between 16:9 (YouTube), 9:16 (Shorts/TikTok), and 1:1 (Instagram) with a single click.
- 💾 **Preset System**: Save your favorite styles and apply them instantly to future projects for a consistent look.
- 📤 **High-Quality Export**: Export your masterpiece as an MP4 or GIF with resolutions up to 2K.

---

## 🚀 Installation

Grab the latest version for your OS from the [**Releases Page**](https://github.com/tamnguyenvan/screenarc/releases/latest).

<details>
<summary><b>🐧 Linux Instructions</b></summary>

> **⚠️ Important:** ScreenArc requires the **X11** display server. It will not work on Wayland.
> To check your session type, run: `echo $XDG_SESSION_TYPE`. If it shows `wayland`, please switch to X11 from your login screen.

- 1️⃣ Download the `ScreenArc-*.*.*-linux-x64.AppImage` file.
- 2️⃣ Make it executable: `chmod +x ScreenArc-*.*.*-linux-x64.AppImage`
- 3️⃣ Double-click or run it in terminal: `./ScreenArc-*.*.*-linux-x64.AppImage`

</details>

<details>
<summary><b>🪟 Windows Instructions</b></summary>

> **🔒 Security Note:** As a new open-source project, we don't have a code signing certificate yet. You may see warnings from your browser or Windows SmartScreen.
>
> - In your browser, click "Keep" or "Keep anyway".
> - On the SmartScreen prompt, click "More info" → "Run anyway".
>
> Our code is fully open source for your review!

- 1️⃣ Download the `ScreenArc-*.*.*-Setup.exe` file.
- 2️⃣ Run the installer and follow the prompts.

</details>

<details>
<summary><b>🍏 macOS Instructions</b></summary>

> **🔒 Security Note:** As a new open-source project, we don't have a code signing certificate yet. You may see warnings from your browser or macOS Gatekeeper.
>
> - In your browser, right-click the downloaded file and select "Open"
> - When prompted, click "Open" in the security warning dialog

- 1️⃣ Download the `ScreenArc-*.*.*-universal.dmg` file.
- 2️⃣ Double-click the downloaded file to install ScreenArc.

</details>

---

## 📖 Quick Start Guide

- 1️⃣ **Record**: Launch ScreenArc, choose your recording source (screen, window, or area), and hit the big red button!

- 2️⃣ **Edit**: The editor opens automatically after recording.
- **Right Panel**: Customize backgrounds, padding, and shadows.
- **Timeline**: Fine-tune the auto-generated zoom effects and trim unwanted sections.

- 3️⃣ **Export**: Click the **Export** button, choose your format (MP4/GIF) and resolution, and let the magic happen. Done! ✅

---

## 🛠️ Tech Stack

- **⚡ Core Framework**: Electron, Vite, TypeScript
- **💅 Frontend**: React, TailwindCSS
- **📦 State Management**: Zustand with Immer & Zundo (for undo/redo)
- **🎥 Backend & Video Processing**: Node.js, FFmpeg

---

<details>
<summary><b>🔧 Development Setup Guide</b></summary>

#### Prerequisites

- **Linux:** Ensure you are on an X11 session, not Wayland.
- **Windows:**
  1.  Install [Build Tools for Visual Studio 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the "Desktop development with C++" workload.
  2.  Install [Python 3.8](https://www.python.org/downloads/release/python-3810/) and add it to your PATH.

#### Setup Steps

1.  **Clone the repo:**
    ```bash
    git clone https://github.com/tamnguyenvan/screenarc.git
    cd screenarc
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up FFmpeg:**
    - Create a `binaries/[os]` directory (e.g., `binaries/linux`).
    - Download the appropriate FFmpeg executable from [screenarc-assets](https://github.com/tamnguyenvan/screenarc-assets/releases/tag/v0.0.1) and place it in the directory.
    - Make it executable on Linux/macOS (`chmod +x ffmpeg`).
4.  **Run in development mode:**
    ```bash
    npm run dev
    ```

</details>

## 🤝 Contributing

We welcome and appreciate all contributions! Feel free to open an issue or submit a pull request.

### ✨ Our Amazing Contributors

A huge thank you to everyone who has contributed to making ScreenArc better!

<a href="https://github.com/tamnguyenvan/screenarc/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=tamnguyenvan/screenarc" />
</a>

<br/>

---

## 🙏 Acknowledgements

ScreenArc stands on the shoulders of giants. This project would not be possible without the incredible work of the open-source community. A special thank you to the authors and maintainers of these key libraries that handle low-level system interactions:

- [global-mouse-events](https://github.com/tamnguyenvan/global-mouse-events)
- [iohook-macos](https://github.com/tamnguyenvan/iohook-macos)
- [node-macos-cursor](https://github.com/tamnguyenvan/node-macos-cursor)
- [node-win-cursor](https://github.com/tamnguyenvan/node-win-cursor)
- [node-x11](https://github.com/tamnguyenvan/node-x11)

---

## 📜 License

This project is licensed under the [GPL-3.0 License](LICENSE).
