const express = require('express');
const path = require('path');
const fs = require('fs');
const { generateVideo } = require('../services/video');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// POST /api/video/generate
router.post('/generate', async (req, res) => {
  try {
    const { productData, script, aspectRatio = '16:9' } = req.body;

    if (!productData || !script) {
      return res.status(400).json({
        error: 'Product data and script are required'
      });
    }

    console.log('Generating video for product:', productData.title);

    const videoId = uuidv4();
    const videoData = {
      id: videoId,
      productData,
      script,
      aspectRatio,
      timestamp: new Date().toISOString()
    };

    // Generate video
    const videoPath = await generateVideo(videoData);

    if (!videoPath || !fs.existsSync(videoPath)) {
      return res.status(500).json({
        error: 'Failed to generate video'
      });
    }

    const fileName = path.basename(videoPath);
    const downloadUrl = `/output/${fileName}`;

    res.json({
      success: true,
      data: {
        videoId,
        fileName,
        downloadUrl,
        videoPath: videoPath,
        size: fs.statSync(videoPath).size,
        duration: '20s', // Estimated duration
        aspectRatio
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Video generation error:', error);
    res.status(500).json({
      error: 'Failed to generate video',
      details: error.message
    });
  }
});

// GET /api/video/status/:id
router.get('/status/:id', (req, res) => {
  const { id } = req.params;
  
  // Check if video exists
  const outputDir = path.join(__dirname, '../output');
  const files = fs.readdirSync(outputDir).filter(file => file.includes(id));
  
  if (files.length > 0) {
    const filePath = path.join(outputDir, files[0]);
    const stats = fs.statSync(filePath);
    
    res.json({
      success: true,
      status: 'completed',
      data: {
        videoId: id,
        fileName: files[0],
        downloadUrl: `/output/${files[0]}`,
        size: stats.size,
        createdAt: stats.birthtime
      }
    });
  } else {
    res.json({
      success: false,
      status: 'not_found',
      message: 'Video not found'
    });
  }
});

// DELETE /api/video/:id
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const outputDir = path.join(__dirname, '../output');
    const files = fs.readdirSync(outputDir).filter(file => file.includes(id));
    
    if (files.length > 0) {
      files.forEach(file => {
        const filePath = path.join(outputDir, file);
        fs.unlinkSync(filePath);
      });
      
      res.json({
        success: true,
        message: 'Video deleted successfully'
      });
    } else {
      res.status(404).json({
        error: 'Video not found'
      });
    }
  } catch (error) {
    console.error('Video deletion error:', error);
    res.status(500).json({
      error: 'Failed to delete video',
      details: error.message
    });
  }
});

module.exports = router;