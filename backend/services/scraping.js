const puppeteer = require('puppeteer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

class ScrapingService {
  constructor() {
    this.browser = null;
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: process.env.PUPPETEER_HEADLESS !== 'false',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  async scrapeProductData(url) {
    let page;
    try {
      const browser = await this.initBrowser();
      page = await browser.newPage();
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      console.log(`Navigating to: ${url}`);
      await page.goto(url, { 
        waitUntil: 'networkidle2', 
        timeout: parseInt(process.env.PUPPETEER_TIMEOUT) || 30000 
      });

      // Wait for content to load
      await page.waitForTimeout(3000);

      // Extract product data using comprehensive selectors
      const productData = await page.evaluate(() => {
        const data = {
          title: '',
          description: '',
          price: '',
          images: [],
          keyFeatures: [],
          category: '',
          brand: '',
          url: window.location.href,
          availability: '',
          productType: ''
        };

        // Enhanced Title extraction with more specific selectors
        const titleSelectors = [
          // Books.toscrape.com specific
          '.product_main h1',
          'div.product_main h1',
          // Generic selectors
          'h1',
          '[data-testid="product-title"]',
          '.product-title',
          '#product-title',
          '.pdp-product-name',
          '[data-automation-id="product-title"]',
          '.product-name',
          '.title',
          '.book-title'
        ];

        for (const selector of titleSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            data.title = element.textContent.trim();
            break;
          }
        }

        // Enhanced Description extraction
        const descSelectors = [
          // Books.toscrape.com specific
          '#product_description + p',
          '.product_page p',
          '[id*="description"] + p',
          // Generic selectors
          '.product-description',
          '[data-testid="product-description"]',
          '.product-details',
          '.product-info',
          '.description',
          '.product-summary',
          '[data-automation-id="product-description"]',
          '.content p',
          '.book-description'
        ];

        for (const selector of descSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            data.description = element.textContent.trim();
            break;
          }
        }

        // Enhanced Price extraction
        const priceSelectors = [
          // Books.toscrape.com specific
          '.product_main .price_color',
          'p.price_color',
          '.price_color',
          // Generic selectors
          '.price',
          '.product-price',
          '[data-testid="price"]',
          '.price-current',
          '.current-price',
          '.sale-price',
          '.offer-price',
          '[data-automation-id="product-price"]'
        ];

        for (const selector of priceSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            data.price = element.textContent.trim();
            break;
          }
        }

        // Enhanced Image extraction
        const imageSelectors = [
          // Books.toscrape.com specific
          '#product_gallery img',
          '.product_page img',
          '.item.active img',
          // Generic selectors
          '.product-image img',
          '[data-testid="product-image"] img',
          '.product-gallery img',
          '.hero-image img',
          '.main-image img',
          '.product-photo img'
        ];

        const images = new Set();
        for (const selector of imageSelectors) {
          const elements = document.querySelectorAll(selector);
          elements.forEach(img => {
            let src = img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy');
            if (src) {
              // Handle relative URLs
              if (src.startsWith('..')) {
                const baseUrl = window.location.origin;
                src = new URL(src, window.location.href).href;
              } else if (src.startsWith('/')) {
                src = window.location.origin + src;
              }
              if (src.startsWith('http')) {
                images.add(src);
              }
            }
          });
        }
        data.images = Array.from(images).slice(0, 5);

        // Enhanced Features extraction
        const featureSelectors = [
          // Books.toscrape.com specific - extract from product information table
          '.table.table-striped tr',
          '.product-information tr',
          // Generic selectors
          '.product-features li',
          '.key-features li',
          '.bullet-points li',
          '.highlights li',
          '.features li',
          '.specs li',
          '.attributes li'
        ];

        // Try table-based extraction first (for books.toscrape.com)
        const tableRows = document.querySelectorAll('.table.table-striped tr, .product-information tr, table tr');
        if (tableRows.length > 0) {
          tableRows.forEach(row => {
            const cells = row.querySelectorAll('th, td');
            if (cells.length >= 2) {
              const key = cells[0].textContent.trim();
              const value = cells[1].textContent.trim();
              if (key && value && key !== 'Price (excl. tax)' && key !== 'Price (incl. tax)') {
                data.keyFeatures.push(`${key}: ${value}`);
              }
            }
          });
        }

        // Fallback to list-based extraction
        if (data.keyFeatures.length === 0) {
          for (const selector of featureSelectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              const features = Array.from(elements)
                .map(el => el.textContent.trim())
                .filter(text => text.length > 0 && !text.match(/^\d+$/) && text.length < 200)
                .slice(0, 8);
              if (features.length > 0) {
                data.keyFeatures = features;
                break;
              }
            }
          }
        }

        // Extract availability
        const availabilitySelectors = [
          '.product_main .availability',
          '.availability',
          '.stock-status',
          '.in-stock'
        ];

        for (const selector of availabilitySelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            data.availability = element.textContent.trim();
            break;
          }
        }

        // Extract category/product type
        const categorySelectors = [
          '.breadcrumb a:last-child',
          '.breadcrumbs a:last-child',
          '.category',
          '.product-type'
        ];

        for (const selector of categorySelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            data.category = element.textContent.trim();
            break;
          }
        }

        // Extract brand (may not be available for books)
        const brandSelectors = [
          '.brand',
          '[data-testid="brand"]',
          '.product-brand',
          '.manufacturer',
          '.author',
          '.publisher'
        ];

        for (const selector of brandSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            data.brand = element.textContent.trim();
            break;
          }
        }

        return data;
      });

      // Download and save images locally
      if (productData.images.length > 0) {
        try {
          productData.localImages = await this.downloadImages(productData.images);
        } catch (error) {
          console.warn('Failed to download images:', error.message);
          productData.localImages = [];
        }
      }

      // Enhanced data validation and fallbacks
      if (!productData.title || productData.title.length === 0) {
        // Try to extract from URL or page title as fallback
        const urlTitle = url.split('/').pop().replace(/[_-]/g, ' ').replace('.html', '');
        productData.title = urlTitle || 'Product';
      }
      
      if (!productData.description || productData.description === 'Amazing product with great features') {
        // Try to extract from meta description or first paragraph
        productData.description = await page.evaluate(() => {
          const metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) return metaDesc.getAttribute('content');
          
          const firstPara = document.querySelector('p');
          if (firstPara && firstPara.textContent.trim().length > 20) {
            return firstPara.textContent.trim().substring(0, 300);
          }
          
          return 'Product information not available';
        });
      }

      if (!productData.price || productData.price === 'Contact for pricing') {
        productData.price = 'Price not available';
      }

      // Ensure keyFeatures is always an array
      if (!Array.isArray(productData.keyFeatures)) {
        productData.keyFeatures = [];
      }

      // Add availability to keyFeatures if available
      if (productData.availability && !productData.keyFeatures.some(f => f.includes('Availability'))) {
        productData.keyFeatures.unshift(`Availability: ${productData.availability}`);
      }

      console.log('Scraped product data:', {
        title: productData.title,
        hasDescription: !!productData.description && productData.description !== 'Product information not available',
        hasPrice: !!productData.price && productData.price !== 'Price not available',
        imageCount: productData.images.length,
        featureCount: productData.keyFeatures.length,
        category: productData.category,
        availability: productData.availability
      });

      return {
        productData: {
          title: productData.title,
          description: productData.description,
          price: productData.price,
          keyFeatures: productData.keyFeatures,
          images: productData.images,
          category: productData.category,
          brand: productData.brand,
          url: productData.url,
          availability: productData.availability,
          localImages: productData.localImages || []
        }
      };

    } catch (error) {
      console.error('Scraping error:', error);
      throw new Error(`Failed to scrape product data: ${error.message}`);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  async downloadImages(imageUrls) {
    const localImages = [];
    const uploadsDir = path.join(__dirname, '../uploads');

    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    for (let i = 0; i < Math.min(imageUrls.length, 3); i++) {
      try {
        const imageUrl = imageUrls[i];
        console.log(`Downloading image ${i + 1}: ${imageUrl}`);
        
        const response = await axios({
          method: 'GET',
          url: imageUrl,
          responseType: 'stream',
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/*,*/*;q=0.8'
          },
          maxRedirects: 5
        });

        const fileName = `product_${Date.now()}_${i + 1}.jpg`;
        const filePath = path.join(uploadsDir, fileName);
        
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
          setTimeout(() => reject(new Error('Download timeout')), 20000);
        });

        localImages.push({
          original: imageUrl,
          local: filePath,
          filename: fileName,
          url: `/uploads/${fileName}`
        });

        console.log(`Successfully downloaded image ${i + 1}`);

      } catch (error) {
        console.error(`Failed to download image ${i + 1}:`, error.message);
      }
    }

    return localImages;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

const scrapingService = new ScrapingService();

// Export functions
module.exports = {
  scrapeProductData: (url) => scrapingService.scrapeProductData(url),
  closeBrowser: () => scrapingService.closeBrowser()
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  await scrapingService.closeBrowser();
});

process.on('SIGINT', async () => {
  await scrapingService.closeBrowser();
});