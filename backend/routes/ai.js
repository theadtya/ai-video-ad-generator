const express = require('express');
const { generateAdScript } = require('../services/ai');

const router = express.Router();

// POST /api/ai/generate-script
router.post('/generate-script', async (req, res) => {
  try {
    const { productData } = req.body;

    if (!productData) {
      return res.status(400).json({
        error: 'Product data is required'
      });
    }

    console.log('Generating AI script for product:', productData.title);

    const script = await generateAdScript(productData);

    if (!script) {
      return res.status(500).json({
        error: 'Failed to generate ad script'
      });
    }

    res.json({
      success: true,
      data: {
        script,
        productData
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({
      error: 'Failed to generate ad script',
      details: error.message
    });
  }
});

// POST /api/ai/test
router.post('/test', async (req, res) => {
  try {
    const testData = {
      title: 'Test Product',
      description: 'A amazing test product',
      price: '$99.99',
      keyFeatures: ['Feature 1', 'Feature 2']
    };

    const script = await generateAdScript(testData);

    res.json({
      success: true,
      message: 'AI service is working',
      testScript: script,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI test error:', error);
    res.status(500).json({
      error: 'AI service test failed',
      details: error.message
    });
  }
});

module.exports = router;