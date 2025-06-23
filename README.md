# AI Video Ad Generator

A full-stack application that transforms product URLs into compelling video advertisements using AI.  
**Features:** Product scraping, AI script generation, and automatic video creation.

---

## 🗂 Project Structure

```
ai-video-ad-generator/
├── backend/   # Node.js/Express backend (API, scraping, AI, video)
├── frontend/  # React + Vite frontend (UI)
```

---

## 🚀 Features

- **URL Scraping:** Extract product data from e-commerce sites
- **AI Script Generation:** Create ad copy using OpenAI GPT
- **Video Generation:** Compose MP4 videos from product data and scripts
- **Multi-Platform:** Shopify, Amazon, eBay, Etsy, and more
- **Flexible Output:** Videos in 16:9, 9:16, or 1:1 aspect ratios

---

## 📋 Requirements

- Node.js 16+ and npm
- FFmpeg (for video processing)
- OpenAI API key
- macOS, Linux, or Windows (see FFmpeg install below)
- At least 2GB free disk space

---

## ⚡️ Quickstart

### 1. Clone the repository

```bash
git clone <repository-url>
cd ai-video-ad-generator
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

#### Install FFmpeg

- **macOS:** `brew install ffmpeg`
- **Ubuntu/Debian:** `sudo apt update && sudo apt install ffmpeg`
- **Windows:** [Download from ffmpeg.org](https://ffmpeg.org/download.html) and add to PATH

#### Environment Variables

Create a `.env` file in `backend/` with:

```
OPENAI_API_KEY=your_openai_api_key_here
PORT=9000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

Or `cp .env.example .env` and replace the OPENAI_API_KEY with your own OpenAI API keys


#### Start the Backend

- **Development:** `npm run dev`
- **Production:** `npm start`

Backend runs at: [http://localhost:9000](http://localhost:9000)

---

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

#### Start the Frontend

```bash
npm run dev
```

Frontend runs at: [http://localhost:5173](http://localhost:5173)

---

## 🖥 Usage

1. Open the frontend in your browser: [http://localhost:5173](http://localhost:5173)
2. Enter a product URL (Shopify, Amazon, etc.)
3. Click "Generate Video Ad"
4. Wait for scraping, AI script, and video generation steps
5. Preview or download your generated video ad!

---

## 🛠 API Endpoints (Backend)

### Health Check

```http
GET /api/health
```

### Scrape Product Data

```http
POST /api/scraping/extract
Content-Type: application/json

{
  "url": "https://example-store.com/products/awesome-product"
}
```

### Generate AI Script

```http
POST /api/ai/generate-script
Content-Type: application/json

{
  "productData": {
    "title": "Product Name",
    "description": "Product description",
    "price": "$99.99",
    "keyFeatures": ["Feature 1", "Feature 2"]
  }
}
```

### Generate Video

```http
POST /api/video/generate
Content-Type: application/json

{
  "productData": { /* product data */ },
  "script": { /* generated script */ },
  "aspectRatio": "16:9"
}
```

### Download Video

```http
GET /output/{filename}.mp4
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key (required) | - |
| `PORT` | Server port | 9000 |
| `NODE_ENV` | Environment mode | development |
| `CORS_ORIGIN` | Allowed CORS origin | <http://localhost:5173> |
| `PUPPETEER_HEADLESS` | Run browser in headless mode | true |
| `PUPPETEER_TIMEOUT` | Page load timeout (ms) | 30000 |

### Supported Platforms

- ✅ Shopify stores
- ✅ Amazon products
- ✅ Generic e-commerce sites
- ✅ eBay listings
- ✅ Etsy products

---

## 📁 Backend Project Structure

```
backend/
├── server.js              # Main server file
├── routes/
│   ├── scraping.js        # URL scraping endpoints
│   ├── ai.js             # AI script generation
│   └── video.js          # Video generation
├── services/
│   ├── scraping.js       # Web scraping logic
│   ├── ai.js            # OpenAI integration
│   └── video.js         # Video creation logic
├── utils/
│   └── validation.js    # Input validation utilities
├── uploads/             # Downloaded product images
├── output/             # Generated video files
└── temp/              # Temporary processing files
```

---

## 🎥 Video Generation Process

1. **Extract Product Data**: Scrape title, description, price, images
2. **Generate AI Script**: Create compelling ad copy with scenes
3. **Create Video Frames**: Generate individual frames with product images and text
4. **Compose Video**: Use FFmpeg to create final MP4 video

---

## 🐛 Troubleshooting

### Common Issues

**"FFmpeg not found"**

```bash
# Check if FFmpeg is installed
ffmpeg -version

# If not installed, install it (see Installation section)
```

**"OpenAI API quota exceeded"**

- Check your OpenAI account usage
- Verify API key is correct
- The system will use fallback scripts if AI fails

**"Puppeteer fails to launch"**

```bash
# Install required dependencies (Linux)
sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
```

**"Canvas build failed"**

```bash
# Install canvas dependencies (Linux)
sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# macOS
brew install pkg-config cairo pango libpng jpeg giflib librsvg
```

### Debug Mode

Enable debug logging:

```bash
DEBUG=* npm run dev
```

---

## 🔒 Security

- Input validation for all URLs and data
- Rate limiting on API endpoints
- Sanitization of user inputs
- Prevention of directory traversal attacks
- CORS protection

---

## 📝 Logging

- HTTP requests: Morgan
- Application events: Console

---

## 🧪 Testing API

Use the test endpoints to verify functionality:

```bash
# Test scraping service
curl -X GET http://localhost:9000/api/scraping/test

# Test AI service
curl -X POST http://localhost:9000/api/ai/test \
  -H "Content-Type: application/json" \
  -d '{}'

# Check server health
curl -X GET http://localhost:9000/api/health
```

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 👤 Author

Aditya

---

## 🆘 Support

For issues and questions:

1. Check the troubleshooting section
2. Verify all dependencies are installed
3. Check server logs for detailed error messages
4. Ensure your OpenAI API key has sufficient credits 



## Loom Video Demonstrations

- [🔗 Live Demo & Walkthrough (Video 1)](https://www.loom.com/share/1d41c4aa2ab9459d8722d726cf0cf5bc?sid=7c8d5f44-5d55-4e20-86e5-18b9ded87e23)
- [🔗 Code Walkthrough (Video 2)](https://www.loom.com/share/83b5431dd1e94f4da9c2a084ff67ba3c?sid=8c2da020-fa73-4a4c-8864-d3536cfccb46)



## Sample Output Videos

Here are a few generated product videos:

- 🎥 [Generated Video 1](sample_outputs/generated_ad_1.mp4)
- 🎥 [Generated Video 2](sample_outputs/generated_ad_2.mp4)
- 🎥 [Generated Video 3](sample_outputs/generated_ad_3.mp4)
