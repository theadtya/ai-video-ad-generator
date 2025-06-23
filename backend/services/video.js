const ffmpeg = require('fluent-ffmpeg');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs');

class VideoService {
  constructor() {
    this.outputDir = path.join(__dirname, '../output');
    this.tempDir = path.join(__dirname, '../temp');
    
    // Ensure directories exist
    [this.outputDir, this.tempDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async generateVideo(videoData) {
    try {
      const { id, productData, script, aspectRatio } = videoData;
      
      console.log(`Generating video ${id} for product: ${productData.title}`);
      
      // Set dimensions based on aspect ratio
      const dimensions = this.getDimensions(aspectRatio);
      
      console.log("DIMENSION SET")
      // Generate frames for each scene
      const framesPaths = await this.generateFrames(script.scenes, productData, dimensions);
      console.log("FRAMES for each scene ")
      
      // Create video from frames
      const videoPath = await this.createVideoFromFrames(framesPaths, id, dimensions);
      console.log("video from FRAMES ")
      
      // Cleanup temp frames
      this.cleanupFrames(framesPaths);
      
      console.log(`Video generated successfully: ${videoPath}`);
      return videoPath;
      
    } catch (error) {
      console.error('Video generation error:', error);
      throw new Error(`Video generation failed: ${error.message}`);
    }
  }

  getDimensions(aspectRatio) {
    switch (aspectRatio) {
      case '9:16':
        return { width: 720, height: 1280 }; // Vertical (TikTok/Instagram Stories)
      case '1:1':
        return { width: 1000, height: 1000 }; // Square (Instagram post)
      case '16:9':
      default:
        return { width: 1280, height: 720 }; // Horizontal (YouTube/Facebook)
    }
  }

  async generateFrames(scenes, productData, dimensions) {
    // Additional validation
    if (!scenes || !Array.isArray(scenes)) {
      throw new Error('Scenes must be an array');
    }
    
    if (scenes.length === 0) {
      throw new Error('At least one scene is required');
    }
    
    const framesPaths = [];
    
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      console.log(`Generating frame ${i + 1}/${scenes.length}:`, scene);
      
      // Validate scene structure
      if (!scene) {
        console.warn(`Scene ${i} is null or undefined, skipping`);
        continue;
      }
      
      const framePath = await this.createSceneFrame(scene, productData, dimensions, i);
      framesPaths.push(framePath);
    }
    
    if (framesPaths.length === 0) {
      throw new Error('No valid frames were generated');
    }
    
    return framesPaths;
  }

  async createSceneFrame(scene, productData, dimensions, sceneIndex) {
    const { width, height } = dimensions;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Background - use scene background color if available
    const bgColor = scene.backgroundColor || '#667eea';
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, bgColor);
    gradient.addColorStop(1, this.getDarkerColor(bgColor));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Add product image if available
    if (productData.localImages && productData.localImages.length > 0) {
      try {
        const imagePath = productData.localImages[0].local;
        if (fs.existsSync(imagePath)) {
          const image = await loadImage(imagePath);
          
          // Calculate image dimensions to fit nicely
          const imageSize = Math.min(width * 0.4, height * 0.4);
          const imageX = (width - imageSize) / 2;
          const imageY = height * 0.15;
          
          // Draw image with rounded corners
          ctx.save();
          this.roundRect(ctx, imageX, imageY, imageSize, imageSize, 20);
          ctx.clip();
          ctx.drawImage(image, imageX, imageY, imageSize, imageSize);
          ctx.restore();
        }
      } catch (error) {
        console.log('Could not load product image, using fallback:', error.message);
      }
    }
    
    // Add text overlay
    this.addTextOverlay(ctx, scene, productData, dimensions);
    
    // Add decorative elements
    this.addDecorations(ctx, scene, dimensions);
    
    // Save frame
    const framePath = path.join(this.tempDir, `frame_${sceneIndex}_${Date.now()}.png`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(framePath, buffer);
    
    return framePath;
  }

  // Helper method to get a darker version of a color
  getDarkerColor(color) {
    // Simple color darkening - you can improve this
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const num = parseInt(hex, 16);
      const r = (num >> 16) - 30;
      const g = (num >> 8 & 0x00FF) - 30;
      const b = (num & 0x0000FF) - 30;
      return `rgb(${Math.max(0, r)}, ${Math.max(0, g)}, ${Math.max(0, b)})`;
    }
    return '#444444'; // fallback darker color
  }

  addTextOverlay(ctx, scene, productData, dimensions) {
    const { width, height } = dimensions;
    
    // Use scene background color if available
    const bgColor = scene.backgroundColor || '#667eea';
    const textColor = scene.textColor || '#ffffff';
    
    // Set font properties
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Main text
    const fontSize = Math.min(width * 0.06, 48);
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    
    // Text shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Get text from scene with multiple fallback options
    const text = scene.text || scene.content || scene.description || productData.title || 'Amazing Product!';
    const textY = height * 0.7;
    
    // Wrap text if too long
    const maxWidth = width * 0.8;
    this.wrapText(ctx, text, width / 2, textY, maxWidth, fontSize * 1.2);
    
    // Add price if it's a CTA scene or price scene
    if ((scene.type === 'cta' || scene.type === 'closing' || scene.type === 'price') && productData.price) {
      ctx.font = `bold ${fontSize * 1.2}px Arial, sans-serif`;
      ctx.fillStyle = '#ffeb3b';
      ctx.fillText(productData.price, width / 2, textY + fontSize * 2);
    }
    
    // Reset shadow
    ctx.shadowColor = 'transparent';
  }

  addDecorations(ctx, scene, dimensions) {
    const { width, height } = dimensions;
    
    // Add animated elements based on scene type
    const animation = scene.animation || scene.type || 'default';
    
    switch (animation) {
      case 'pulse':
        // Add pulsing circles
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(width * 0.1, height * 0.1, 20 + i * 10, 0, 2 * Math.PI);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.3 - i * 0.1})`;
          ctx.fill();
        }
        break;
        
      case 'zoom_in':
      case 'cta':
        // Add corner decorations
        ctx.fillStyle = 'rgba(255, 235, 59, 0.8)';
        ctx.fillRect(0, 0, 50, 5);
        ctx.fillRect(0, 0, 5, 50);
        ctx.fillRect(width - 50, 0, 50, 5);
        ctx.fillRect(width - 5, 0, 5, 50);
        break;
        
      default:
        // Add subtle border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, width - 20, height - 20);
    }
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }

  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  async createVideoFromFrames(framesPaths, videoId, dimensions) {
    return new Promise((resolve, reject) => {
      const safeVideoId = videoId.replace(/[^a-zA-Z0-9-_]/g, '_');
      const outputPath = path.join(this.outputDir, `video_${safeVideoId}.mp4`);

      console.log("CREATE VIDEO FROM FRAMES");
      console.log("Output path:", outputPath);
      console.log("Frames paths:", framesPaths);

      // Verify all frame files exist
      const validFrames = framesPaths.filter(framePath => {
        const exists = fs.existsSync(framePath);
        if (!exists) {
          console.warn(`Frame file does not exist: ${framePath}`);
        }
        return exists;
      });

      if (validFrames.length === 0) {
        reject(new Error('No valid frames found'));
        return;
      }

      // Create a text file listing all frames for FFmpeg concat
      const frameListPath = path.join(this.tempDir, `framelist_${Date.now()}.txt`);
      const frameDuration = 3; // seconds per frame
      
      // Create frame list content
      let frameListContent = '';
      validFrames.forEach(framePath => {
        frameListContent += `file '${framePath}'\n`;
        frameListContent += `duration ${frameDuration}\n`;
      });
      // Add the last frame again without duration for proper ending
      if (validFrames.length > 0) {
        frameListContent += `file '${validFrames[validFrames.length - 1]}'`;
      }

      fs.writeFileSync(frameListPath, frameListContent);

      // Use simpler FFmpeg approach with concat demuxer
      ffmpeg()
        .input(frameListPath)
        .inputOptions(['-f', 'concat', '-safe', '0'])
        .outputOptions([
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-r', '30',
          '-crf', '23',
          '-movflags', '+faststart'
        ])
        .size(`${dimensions.width}x${dimensions.height}`)
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
          console.log('FFmpeg process started for video:', videoId);
        })
        .on('progress', (progress) => {
          try {
            if (progress.percent) {
              console.log(`Video generation progress: ${Math.round(progress.percent)}%`);
            }
          } catch (err) {
            console.error('Progress handler error:', err);
          }
        })
        .on('end', () => {
          console.log('Video generation completed:', outputPath);
          // Cleanup the frame list file
          try {
            fs.unlinkSync(frameListPath);
          } catch (err) {
            console.warn('Could not cleanup frame list file:', err);
          }
          resolve(outputPath);
        })
        .on('error', (error) => {
          console.error('FFmpeg error:', error);
          // Cleanup the frame list file
          try {
            fs.unlinkSync(frameListPath);
          } catch (err) {
            console.warn('Could not cleanup frame list file:', err);
          }
          reject(new Error(`FFmpeg failed: ${error.message}`));
        })
        .run();
    });
  }

  cleanupFrames(framesPaths) {
    framesPaths.forEach(framePath => {
      try {
        if (fs.existsSync(framePath)) {
          fs.unlinkSync(framePath);
        }
      } catch (error) {
        console.error('Error cleaning up frame:', error);
      }
    });
  }
}

const videoService = new VideoService();

module.exports = {
  generateVideo: (videoData) => videoService.generateVideo(videoData)
};