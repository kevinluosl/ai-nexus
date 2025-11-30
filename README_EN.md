<div align="center">

# AI Nexus / Browser-Side AI Exploration Platform

**Exploring cutting-edge browser-side artificial intelligence technologies, continuously updating AI programming demos combined with open-source projects**

<img src="images/banner.jpg" alt="AI Nexus Banner" width="800"/>

</div>

---

## 📖 Project Introduction

**AI Nexus** is a platform dedicated to showcasing and exploring browser-side artificial intelligence technologies. This platform aims to create various demos that demonstrate the infinite possibilities of real-time computer vision, generative models, and related open-source projects in the Web environment.

We will continuously update AI programming demos combined with open-source projects, providing developers with cutting-edge technology learning and practical references.

### 🎯 Project Features

- 🌐 **Browser-Side Execution** - All demos run entirely in the browser, no complex configuration required
- 🚀 **AI Programming Examples** - Integrates the latest AI open-source projects and programming practices
- 🎨 **Real-Time Interactive Experience** - Provides smooth user interaction and real-time feedback
- 📦 **Continuous Updates** - Regularly adding new AI programming demos and open-source project integrations
- 💡 **Learning Reference** - Each demo is carefully designed and can serve as a learning reference

## 🎮 Current Demos

### 1. Hand Tracking

A high-performance hand skeleton detection demo based on MediaPipe, running entirely on the client side, utilizing WebAssembly and GPU acceleration for real-time interaction.

**Features:**
- 🤲 Real-time detection of 21 hand keypoints
- ⚡ WebAssembly + GPU acceleration
- 🎯 Pixel Battle interactive game
- 💾 Local leaderboard storage (IndexedDB)

**Use Cases:**
- Control games through gestures
- Learn MediaPipe applications in browsers
- Understand WebAssembly performance optimization

---

### 2. YOLO Object Detection

Upload images and use the YOLOv11 model for real-time object recognition, supporting multi-object classification and confidence analysis.

**Features:**
- 🎯 YOLOv11 object detection model
- 📸 Image upload (click or drag-and-drop)
- 📊 Multi-object classification and confidence analysis
- 🔍 Real-time detection result visualization

**Use Cases:**
- Image object recognition and classification
- Learn YOLO model applications in web environments
- Understand deep learning model deployment methods

---

## 🛠️ Tech Stack

- **Frontend Framework**: React 19 + TypeScript
- **Build Tool**: Vite 6
- **AI Models**: 
  - MediaPipe Hands (Hand Tracking)
  - YOLOv11 (Object Detection)
- **Data Storage**: IndexedDB
- **Styling**: Tailwind CSS
- **HTTP Service**: Python Flask (YOLO Demo Backend)

## 📦 Quick Start

### Requirements

- Node.js 18+ 
- Python 3.8+ (for YOLO Demo backend)
- Modern browser (supports Camera API)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-nexus
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env.local` file in the project root directory and set `GEMINI_API_KEY` (if you need to use Gemini API):
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Run the frontend project**
   ```bash
   npm run dev
   ```
   
   Visit `https://localhost:3000` (Vite will automatically configure HTTPS)

5. **Run YOLO backend service** (Optional, only needed for YOLO Demo)
   
   Navigate to the `yolo` directory and refer to the README there to configure and run the backend service.

## 🚀 Project Roadmap

This project will be continuously updated, with plans to add more AI programming demos combined with open-source projects:

- 🔄 Generative LLM applications
- 🖼️ Image generation and editing
- 🎤 Speech recognition and synthesis
- 🔍 More computer vision applications
- 💬 Natural language processing demos
- And other cutting-edge AI technology practices in browser environments

## 🤝 Contributing

Welcome to submit Issues and Pull Requests!

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## 🔗 Related Links

- [GitHub Repository](<repository-url>)
- [Issue Tracker](<repository-url>/issues)

## ⭐ If this project helps you, please give it a Star!

---

<div align="center">

**Exploring the Infinite Possibilities of Browser-Side AI** ❤️

Made with ❤️ by AI

</div>
