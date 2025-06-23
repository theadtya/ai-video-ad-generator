const OpenAI = require('openai');

class AIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required in environment variables');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateAdScript(productData) {
    try {
      // Validate and sanitize input data
      const sanitizedProductData = this.sanitizeProductData(productData);
      
      console.log('Generating AI script with OpenAI for product:', sanitizedProductData.title);
      
      const prompt = this.buildPrompt(sanitizedProductData);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert copywriter specializing in creating compelling video advertisement scripts. Create engaging, concise scripts that grab attention and drive action. Always format your response with clear sections: HOOK, BENEFITS, CTA, and FULL_SCRIPT."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 600,
        temperature: 0.8,
      });

      const scriptContent = completion.choices[0]?.message?.content;
      
      if (!scriptContent) {
        throw new Error('No content generated from OpenAI');
      }

      // Parse and structure the script
      const script = this.parseScript(scriptContent, sanitizedProductData);
      
      console.log('AI script generated successfully');
      return script;

    } catch (error) {
      console.error('AI generation error:', error);
      
      // Fallback script if AI fails
      if (error.message.includes('API key') || error.message.includes('quota') || error.message.includes('rate limit')) {
        console.log('Using fallback script due to API issues');
        return this.generateFallbackScript(this.sanitizeProductData(productData));
      }
      
      // For other errors, still try to provide a fallback
      console.log('Using fallback script due to error:', error.message);
      return this.generateFallbackScript(this.sanitizeProductData(productData));
    }
  }

  sanitizeProductData(productData) {
    // Handle both nested productData structure and direct structure
    const data = productData?.productData || productData || {};
    
    return {
      title: data.title || 'Amazing Product',
      description: data.description || 'A fantastic product that will enhance your life',
      price: data.price || 'Contact for pricing',
      keyFeatures: Array.isArray(data.keyFeatures) ? data.keyFeatures : 
                   (data.keyFeatures ? [data.keyFeatures] : ['High quality', 'Great value', 'Perfect choice']),
      brand: data.brand || 'Premium Brand',
      category: data.category || 'Product',
      availability: data.availability || 'Available now',
      url: data.url || ''
    };
  }

  buildPrompt(productData) {
    const { title, description, price, keyFeatures, brand, category } = productData;
    
    // Ensure keyFeatures is an array and has content
    const features = Array.isArray(keyFeatures) && keyFeatures.length > 0 ? keyFeatures : ['Premium quality', 'Great value', 'Perfect for you'];
    
    return `Create a compelling 15-20 second video advertisement script for the following product:

Product: ${title}
Brand: ${brand}
Category: ${category}
Price: ${price}
Description: ${description}
Key Features: ${features.slice(0, 5).join(', ')}

Requirements:
- Hook viewers in the first 3 seconds with excitement
- Highlight 2-3 key benefits that matter to customers
- Include a strong, urgent call-to-action
- Keep it conversational and exciting
- Perfect for social media (Instagram/TikTok/Facebook style)
- Total length: 15-20 seconds when spoken
- Use emotional triggers and power words

Please format your response EXACTLY as follows:
HOOK: [Opening line to grab attention - make it exciting!]
BENEFITS: [2-3 key selling points separated by commas]
CTA: [Strong call-to-action with urgency]
FULL_SCRIPT: [Complete script with natural flow, including timing cues if needed]`;
  }

  parseScript(scriptContent, productData) {
    const lines = scriptContent.split('\n').filter(line => line.trim());
    
    let hook = '';
    let benefits = [];
    let cta = '';
    let fullScript = scriptContent;

    // Extract structured parts with better parsing
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('HOOK:')) {
        hook = trimmedLine.replace('HOOK:', '').trim();
      } else if (trimmedLine.startsWith('BENEFITS:')) {
        const benefitsText = trimmedLine.replace('BENEFITS:', '').trim();
        benefits = benefitsText.split(',').map(b => b.trim()).filter(b => b.length > 0);
      } else if (trimmedLine.startsWith('CTA:')) {
        cta = trimmedLine.replace('CTA:', '').trim();
      } else if (trimmedLine.startsWith('FULL_SCRIPT:')) {
        fullScript = trimmedLine.replace('FULL_SCRIPT:', '').trim();
      }
    });

    // Fallback extraction if structured format isn't found
    if (!hook || !cta) {
      const sentences = scriptContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length > 0) {
        hook = hook || sentences[0].trim() + '!';
        cta = cta || sentences[sentences.length - 1].trim() + '!';
      }
    }

    // Ensure we have fallback values
    hook = hook || `Discover the amazing ${productData.title}!`;
    benefits = benefits.length > 0 ? benefits : productData.keyFeatures.slice(0, 3);
    cta = cta || 'Get yours today - limited time offer!';
    
    // If fullScript is just the original content, try to clean it up
    if (fullScript === scriptContent && scriptContent.includes('HOOK:')) {
      fullScript = `${hook} ${benefits.join(', ')}. ${productData.price}. ${cta}`;
    }

    // Generate scenes for video
    const scenes = this.generateScenes(hook, benefits, cta, productData);

    return {
      hook,
      benefits,
      cta,
      fullScript,
      scenes,
      duration: 20, // seconds
      wordCount: fullScript.split(' ').length,
      generatedAt: new Date().toISOString(),
      productTitle: productData.title
    };
  }

  generateScenes(hook, benefits, cta, productData) {
    // Ensure benefits is an array
    const benefitsArray = Array.isArray(benefits) ? benefits : [benefits].filter(Boolean);
    
    const scenes = [
      {
        id: 1,
        duration: 3,
        text: hook,
        type: "hook",
        visual: "product_hero",
        animation: "fade_in",
        backgroundColor: "#ff6b6b",
        textColor: "#ffffff"
      },
      {
        id: 2,
        duration: 8,
        text: benefitsArray.length > 0 ? benefitsArray.join('. ') : `${productData.title} offers exceptional value`,
        type: "benefits",
        visual: "product_features",
        animation: "slide_in",
        backgroundColor: "#4ecdc4",
        textColor: "#ffffff"
      },
      {
        id: 3,
        duration: 4,
        text: cta,
        type: "cta",
        visual: "product_price",
        animation: "zoom_in",
        backgroundColor: "#45b7d1",
        textColor: "#ffffff"
      },
      {
        id: 4,
        duration: 5,
        text: `${productData.price} - Don't miss out!`,
        type: "closing",
        visual: "product_final",
        animation: "pulse",
        backgroundColor: "#96ceb4",
        textColor: "#ffffff"
      }
    ];

    return scenes;
  }

  generateFallbackScript(productData) {
    console.log('Generating fallback script for:', productData.title);
    
    const hook = `🔥 Introducing the incredible ${productData.title}!`;
    const benefits = productData.keyFeatures && productData.keyFeatures.length > 0 
      ? productData.keyFeatures.slice(0, 3) 
      : ['Premium quality guaranteed', 'Exceptional value for money', 'Perfect for your needs'];
    
    const cta = 'Order now and experience the difference!';
    const fullScript = `${hook} ${benefits.join(', ')}. Only ${productData.price}. ${cta} Limited time offer - act fast!`;

    const scenes = this.generateScenes(hook, benefits, cta, productData);

    return {
      hook,
      benefits,
      cta,
      fullScript,
      scenes,
      duration: 20,
      wordCount: fullScript.split(' ').length,
      generatedAt: new Date().toISOString(),
      fallback: true,
      productTitle: productData.title
    };
  }

  // Additional utility method to validate script quality
  validateScript(script) {
    const issues = [];
    
    if (!script.hook || script.hook.length < 10) {
      issues.push('Hook is too short or missing');
    }
    
    if (!script.benefits || script.benefits.length === 0) {
      issues.push('No benefits provided');
    }
    
    if (!script.cta || script.cta.length < 5) {
      issues.push('Call-to-action is too short or missing');
    }
    
    if (script.wordCount > 60) {
      issues.push('Script may be too long for 20 seconds');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      score: Math.max(0, 100 - (issues.length * 25))
    };
  }
}

const aiService = new AIService();

module.exports = {
  generateAdScript: (productData) => aiService.generateAdScript(productData),
  validateScript: (script) => aiService.validateScript(script)
};