const express = require('express');
const { scrapeProductData } = require('../services/scraping');
const { validateUrl } = require('../utils/validation');

const router = express.Router();

// POST /api/scraping/extract
router.post('/extract', async (req, res) => {
  try {
    const { url } = req.body;

    // Validate URL
    if (!url) {
      return res.status(400).json({
        error: 'URL is required'
      });
    }

    if (!validateUrl(url)) {
      return res.status(400).json({
        error: 'Invalid URL format'
      });
    }

    console.log(`Scraping URL: ${url}`);

    // Scrape product data
    const productData = await scrapeProductData(url);

    if (!productData) {
      return res.status(404).json({
        error: 'Could not extract product data from the provided URL'
      });
    }

    res.json({
      success: true,
      data: productData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scraping error:', error);
    res.status(500).json({
      error: 'Failed to scrape product data',
      details: error.message
    });
  }
});

// GET /api/scraping/test
router.get('/test', (req, res) => {
  res.json({
    message: 'Scraping service is running',
    supportedPlatforms: ['Shopify', 'Amazon', 'General E-commerce'],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;