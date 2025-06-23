const url = require('url');

/**
 * Validate URL format and basic security checks
 */
function validateUrl(inputUrl) {
  try {
    const parsedUrl = new URL(inputUrl);
    
    // Check for valid protocols
    const allowedProtocols = ['http:', 'https:'];
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      return false;
    }
    
    // Check for localhost/private IPs in production
    if (process.env.NODE_ENV === 'production') {
      const hostname = parsedUrl.hostname.toLowerCase();
      const privatePatterns = [
        /^localhost$/,
        /^127\./,
        /^192\.168\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^0\./
      ];
      
      if (privatePatterns.some(pattern => pattern.test(hostname))) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validate product data structure
 */
function validateProductData(productData) {
  if (!productData || typeof productData !== 'object') {
    return { valid: false, error: 'Product data must be an object' };
  }
  
  // Required fields
  const requiredFields = ['title', 'url'];
  for (const field of requiredFields) {
    if (!productData[field]) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }
  
  // Optional but recommended fields
  const optionalFields = ['description', 'price', 'images', 'keyFeatures'];
  const warnings = [];
  
  optionalFields.forEach(field => {
    if (!productData[field] || (Array.isArray(productData[field]) && productData[field].length === 0)) {
      warnings.push(`Missing recommended field: ${field}`);
    }
  });
  
  return { valid: true, warnings };
}

/**
 * Validate script data structure
 */
function validateScript(script) {
  if (!script || typeof script !== 'object') {
    return { valid: false, error: 'Script must be an object' };
  }
  
  const requiredFields = ['scenes', 'fullScript'];
  for (const field of requiredFields) {
    if (!script[field]) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }
  
  // Validate scenes array
  if (!Array.isArray(script.scenes) || script.scenes.length === 0) {
    return { valid: false, error: 'Scenes must be a non-empty array' };
  }
  
  // Validate each scene
  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    if (!scene.text || !scene.type) {
      return { valid: false, error: `Scene ${i + 1} missing required fields (text, type)` };
    }
  }
  
  return { valid: true };
}

/**
 * Sanitize text input
 */
function sanitizeText(text) {
  if (typeof text !== 'string') {
    return '';
  }
  
  return text
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 1000); // Limit length
}

/**
 * Validate file path for security
 */
function validateFilePath(filePath) {
  // Prevent directory traversal
  const normalizedPath = path.normalize(filePath);
  const basePath = path.resolve(__dirname, '..');
  const absolutePath = path.resolve(basePath, normalizedPath);
  
  return absolutePath.startsWith(basePath);
}

/**
 * Check if URL is from supported e-commerce platforms
 */
function getSupportedPlatform(url) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    
    // Shopify stores
    if (hostname.includes('myshopify.com') || 
        parsedUrl.pathname.includes('/products/')) {
      return 'shopify';
    }
    
    // Amazon
    if (hostname.includes('amazon.')) {
      return 'amazon';
    }
    
    // eBay
    if (hostname.includes('ebay.')) {
      return 'ebay';
    }
    
    // Etsy
    if (hostname.includes('etsy.')) {
      return 'etsy';
    }
    
    // Generic e-commerce patterns
    if (parsedUrl.pathname.includes('/product') ||
        parsedUrl.pathname.includes('/item') ||
        parsedUrl.pathname.includes('/shop')) {
      return 'generic';
    }
    
    return 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Rate limiting helper
 */
function createRateLimiter(maxRequests = 10, windowMs = 60000) {
  const requests = new Map();
  
  return (req, res, next) => {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Clean old entries
    for (const [id, timestamps] of requests.entries()) {
      requests.set(id, timestamps.filter(time => now - time < windowMs));
      if (requests.get(id).length === 0) {
        requests.delete(id);
      }
    }
    
    // Check current client
    const clientRequests = requests.get(clientId) || [];
    
    if (clientRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    // Add current request
    clientRequests.push(now);
    requests.set(clientId, clientRequests);
    
    next();
  };
}

module.exports = {
  validateUrl,
  validateProductData,
  validateScript,
  sanitizeText,
  validateFilePath,
  getSupportedPlatform,
  createRateLimiter
};