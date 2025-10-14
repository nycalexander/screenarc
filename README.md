# ScreenArc 🎬

![ScreenArc Banner](https://raw.githubusercontent.com/tamnguyenvan/screenarc/main/docs/assets/banner.png?raw=true)

<div align="center">
  <img src="https://img.shields.io/github/v/release/tamnguyenvan/screenarc?style=for-the-badge" alt="Latest Release" />
  <img src="https://img.shields.io/github/license/tamnguyenvan/screenarc?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/github/downloads/tamnguyenvan/screenarc/total?style=for-the-badge&color=green" alt="Total Downloads" />
</div>

<div align="center">
  <h3>✨ Create cinematic screen recordings with automatic pan-and-zoom effects ✨</h3>
</div>

---

## 🎯 What is ScreenArc?

**ScreenArc** is your go-to screen recording and editing tool that makes professional video creation effortless. Perfect for developers, educators, and content creators who want to produce stunning tutorials, demos, and presentations without the tedious editing work.

### 💡 The Magic

ScreenArc automatically tracks your mouse movements and clicks, creating smooth cinematic animations that keep viewers focused on what matters. **No manual keyframing needed!**

---

## ⭐ Features

### 🎥 Recording

- **🖥️ Flexible capture** - Record full screen, specific windows, or custom areas
- **🖱️ Multi-monitor support** - Works seamlessly with multiple displays
- **📹 Webcam overlay** - Add your face to recordings for a personal touch

### ✨ Automatic Magic

- **🎬 Cinematic mouse tracking** - Auto-generates smooth pan-and-zoom effects on clicks
- **🎯 Smart focus** - Automatically highlights areas of action

### 🎨 Powerful Editor

- **📐 Frame customization** - Switch aspect ratios (16:9, 9:16, 1:1) instantly
- **🌈 Beautiful backgrounds** - Choose from colors, gradients, or custom wallpapers
- **✂️ Visual timeline** - Edit, trim, and remove unwanted sections easily
- **💾 Preset system** - Save and reuse your favorite styles
- **🎭 Effects control** - Fine-tune auto-generated animations

### 📤 Export Options

- **🎞️ Multiple formats** - Export as MP4 or GIF
- **📏 Quality control** - Choose resolution (up to 2K) and frame rate

---

## 🚀 Installation

Head to the [**Releases Page**](https://github.com/tamnguyenvan/screenarc/releases/latest) and grab the latest version for your OS.

### 🐧 Linux (Ubuntu/Debian, Fedora/RHEL)

> **⚠️ Important:** ScreenArc requires X11 display server (Wayland is not supported)
>
> Check your display server:
>
> ```bash
> echo $XDG_SESSION_TYPE
> ```
>
> If it shows `wayland`, switch to X11 in your login screen settings ⚙️

**Installation steps:**

1. Download `ScreenArc-x.x.x.AppImage`
2. Make it executable:
   ```bash
   chmod +x ScreenArc-*.AppImage
   ```
3. Run the app:
   ```bash
   ./ScreenArc-*.AppImage
   ```

**💡 Pro tip:** Want macOS-style cursors?

```bash
# Download from: https://www.gnome-look.org/p/1408466
tar -xvf macOS.tar
mv macOS* ~/.icons/
```

Then apply via system settings or GNOME Tweaks.

### 🪟 Windows

> **🔒 Security Note**
>
> We're a small open-source project and can't afford code signing certificates yet. You might see security warnings:
>
> 1. Browser warning → Click "Keep" or "Keep anyway"
> 2. Windows SmartScreen → Click "More info" → "Run anyway"
>
> Our code is fully open source on GitHub for your review! 🔍

**Installation steps:**

1. Download `ScreenArc-x.x.x-Setup.exe`
2. Run the installer and follow the prompts

### 🍏 macOS

Coming soon! 🎉

---

## 📖 Quick Start

### 1️⃣ Record

- Launch ScreenArc
- Choose your recording source (Full Screen / Area / Window)
- Select which display to record (if you have multiple)
- Toggle webcam on/off
- Hit the record button
- Stop recording via the system tray icon

### 2️⃣ Edit

- The editor opens automatically with your recording
- **Right panel** → Customize backgrounds, padding, shadows, borders
- **Timeline** → Adjust auto-generated zoom effects and cut unwanted sections
- **Presets** → Save your style for future projects

### 3️⃣ Export

- Click **Export** (top-right corner)
- Choose format (MP4/GIF), resolution, and save location
- Click **Start Export**
- Done! ✅

---

## 🛠️ Tech Stack

Built with modern, powerful technologies:

- **⚡ Core** - Electron, Vite, TypeScript
- **💅 UI** - React, TailwindCSS
- **📦 State** - Zustand
- **🎥 Video** - Node.js, FFmpeg
- **📦 Build** - Electron Builder

---

## 🤝 Contribute

We love contributions! Whether it's bug fixes, new features, or improvements, feel free to:

- 🐛 Open an issue
- 🔧 Submit a pull request
- 💬 Join the discussion

### 🔧 Development Setup

#### Prerequisites

**🐧 Linux users:**

- Ensure you're on X11 (not Wayland)
  ```bash
  echo $XDG_SESSION_TYPE
  ```

**🪟 Windows users:**

1. Install [Build Tools for Visual Studio 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
   - Select "Desktop development with C++"
   - Ensure these are checked:
     - MSVC v143 - VS 2022 C++ x64/x86 build tools
     - Windows 10/11 SDK
     - C++ CMake tools for Windows

2. Install [Python 3.8](https://www.python.org/downloads/release/python-3810/)
   - Check "Add Python 3.8 to PATH" during installation

#### Setup

1. **Clone the repo:**

   ```bash
   git clone https://github.com/tamnguyenvan/screenarc.git
   cd screenarc
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up FFmpeg:**

   **Linux:**

   ```bash
   mkdir -p binaries/linux
   wget https://github.com/tamnguyenvan/screenarc-assets/releases/download/v0.0.1/ffmpeg -O binaries/linux/ffmpeg
   chmod +x binaries/linux/ffmpeg
   ```

   **Windows (PowerShell):**

   ```powershell
   New-Item -ItemType Directory -Force -Path "binaries\windows"
   Invoke-WebRequest -Uri "https://github.com/tamnguyenvan/screenarc-assets/releases/download/v0.0.1/ffmpeg.exe" -OutFile "binaries\windows\ffmpeg.exe"
   ```

   **macOS:**

   ```bash
   mkdir -p binaries/darwin
   wget https://github.com/tamnguyenvan/screenarc-assets/releases/download/v0.0.1/ffmpeg -O binaries/darwin/ffmpeg
   chmod +x binaries/darwin/ffmpeg
   ```

4. **Run development server:**

   ```bash
   npm run dev
   ```

5. **Build the app (optional):**

   ```bash
   # Linux
   npm run dist:appimage

   # Windows
   npm run dist:win
   ```

---

## 📜 License

Licensed under [GPL-3.0 License](LICENSE)

---

<div align="center">
  <p>Made with ❤️ by the ScreenArc community</p>
  <p>⭐ Star us on GitHub if you find this useful! ⭐</p>
</div>
