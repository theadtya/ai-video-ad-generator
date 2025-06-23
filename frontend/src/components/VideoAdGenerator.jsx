import React, { useState, useRef } from 'react';
import { Upload, Play, Download, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

const API_BASE_URL = 'http://localhost:9000';

const VideoAdGenerator = () => {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [productData, setProductData] = useState(null);
  const [script, setScript] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [error, setError] = useState(null);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const videoRef = useRef(null);
  const [rawScrapingResponse, setRawScrapingResponse] = useState(null);

  const steps = [
    { title: 'Scraping Product Data', description: 'Extracting product information from URL' },
    { title: 'Generating AI Script', description: 'Creating compelling ad copy with AI' },
    { title: 'Creating Video', description: 'Composing final video advertisement' }
  ];

  const resetState = () => {
    setCurrentStep(0);
    setProductData(null);
    setScript(null);
    setVideoUrl(null);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!url.trim()) return;

    resetState();
    setIsProcessing(true);

    try {
      // Step 1: Scrape product data
      setCurrentStep(0);
      const scrapingResponse = await fetch(`${API_BASE_URL}/api/scraping/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!scrapingResponse.ok) {
        throw new Error('Failed to scrape product data');
      }

      const scrapingResponseJson = await scrapingResponse.json();
      setRawScrapingResponse(scrapingResponseJson);
      console.log('Scraping response:', scrapingResponseJson);
      let scrapedProductData = scrapingResponseJson.data?.productData || scrapingResponseJson.data;
      if (!scrapedProductData || !scrapedProductData.title) {
        setError('No valid product data found after scraping.');
        setIsProcessing(false);
        return;
      }
      setProductData(scrapedProductData);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause for UX

      // Step 2: Generate AI script
      setCurrentStep(1);
      if (!scrapedProductData || typeof scrapedProductData !== 'object' || Array.isArray(scrapedProductData) || !scrapedProductData.title) {
        console.error('Invalid or missing productData for AI script:', scrapedProductData);
        setError('No valid product data to send to AI script. Please try scraping again.');
        setIsProcessing(false);
        return;
      }
      console.log('Sending productData to AI script:', scrapedProductData);
      const scriptResponse = await fetch(`${API_BASE_URL}/api/ai/generate-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productData: scrapedProductData })
      });

      if (!scriptResponse.ok) {
        const errorJson = await scriptResponse.json().catch(() => ({}));
        console.error('AI script error response:', errorJson);
        setError(errorJson.error || 'Failed to generate AI script');
        setIsProcessing(false);
        return;
      }

      const scriptResponseJson = await scriptResponse.json();
      console.log('AI script response:', scriptResponseJson);
      const scriptObj = scriptResponseJson.data?.script;
      setScript(scriptObj);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Generate video
      setCurrentStep(2);
      console.log('Sending to video generation:', {
        productData: scrapedProductData,
        script: scriptObj,
        aspectRatio
      });
      const videoResponse = await fetch(`${API_BASE_URL}/api/video/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productData: scrapedProductData, 
          script: scriptObj, 
          aspectRatio 
        })
      });

      if (!videoResponse.ok) {
        const errorJson = await videoResponse.json().catch(() => ({}));
        console.error('Video generation error response:', errorJson);
        setError(errorJson.error || 'Failed to generate video');
        setIsProcessing(false);
        return;
      }

      const videoData = await videoResponse.json();
      console.log('Video generation response:', videoData);
      if (videoData.success && videoData.data && videoData.data.downloadUrl) {
        setVideoUrl(`${API_BASE_URL}${videoData.data.downloadUrl}`);
        setCurrentStep(3); // Completed
      } else {
        setError(videoData.error?.message || 'Failed to generate video');
        setIsProcessing(false);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadVideo = () => {
    if (videoUrl) {
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = 'ai-generated-video-ad.mp4';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            AI Video Ad Generator
          </h1>
          <p className="text-gray-600 text-lg">
            Transform any product URL into compelling video advertisements
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {/* URL Input Section */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                  Product URL
                </label>
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example-store.com/products/awesome-product"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={isProcessing}
                />
              </div>
              
              <div className="sm:w-32">
                <label htmlFor="aspectRatio" className="block text-sm font-medium text-gray-700 mb-2">
                  Aspect Ratio
                </label>
                <select
                  id="aspectRatio"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={isProcessing}
                >
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                  <option value="1:1">1:1</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isProcessing || !url.trim()}
              className="mt-4 w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Generate Video Ad
                </>
              )}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-800">Error</h3>
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
              {rawScrapingResponse && (
                <details className="mt-2 bg-gray-100 p-2 rounded text-xs text-gray-700">
                  <summary>Show raw scraping response</summary>
                  <pre className="whitespace-pre-wrap break-all">{JSON.stringify(rawScrapingResponse, null, 2)}</pre>
                </details>
              )}
            </div>
          )}

          {/* Progress Steps */}
          {(isProcessing || productData) && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress</h3>
              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index < currentStep ? 'bg-green-500 text-white' :
                      index === currentStep && isProcessing ? 'bg-indigo-500 text-white' :
                      index === currentStep && !isProcessing ? 'bg-green-500 text-white' :
                      'bg-gray-200 text-gray-500'
                    }`}>
                      {index < currentStep || (index === currentStep && !isProcessing) ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : index === currentStep && isProcessing ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{step.title}</h4>
                      <p className="text-sm text-gray-600">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Product Data Display */}
          {productData && (
            <div className="mb-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ExternalLink className="w-5 h-5" />
                Product Information
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700">Title</h4>
                  <p className="text-gray-900">{productData.title}</p>
                </div>
                {productData.price && (
                  <div>
                    <h4 className="font-medium text-gray-700">Price</h4>
                    <p className="text-gray-900 font-semibold">{productData.price}</p>
                  </div>
                )}
                {productData.description && (
                  <div className="md:col-span-2">
                    <h4 className="font-medium text-gray-700">Description</h4>
                    <p className="text-gray-900 text-sm">{productData.description.substring(0, 200)}...</p>
                  </div>
                )}
                {productData.keyFeatures && productData.keyFeatures.length > 0 && (
                  <div className="md:col-span-2">
                    <h4 className="font-medium text-gray-700">Key Features</h4>
                    <ul className="list-disc list-inside text-gray-900 text-sm">
                      {productData.keyFeatures.slice(0, 3).map((feature, index) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Script Display */}
          {script && (
            <div className="mb-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Script</h3>
              <div className="space-y-4">
                {script.scenes && script.scenes.map((scene, index) => (
                  <div key={index} className="border-l-4 border-indigo-400 pl-4">
                    <h4 className="font-medium text-gray-700">Scene {index + 1}</h4>
                    <p className="text-gray-900 text-sm">{scene.text}</p>
                    <p className="text-xs text-gray-500 mt-1">Duration: {scene.duration}s</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Video Preview */}
          {videoUrl && (
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Video Ad is Ready!</h3>
              
              <div className="mb-6 inline-block">
                <video
                  ref={videoRef}
                  controls
                  className="max-w-full h-auto rounded-lg shadow-lg"
                  style={{ maxHeight: '400px' }}
                >
                  <source src={videoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => videoRef.current?.play()}
                  className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  Play Video
                </button>
                
                <button
                  onClick={downloadVideo}
                  className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download MP4
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600">
          <p className="text-sm">
            Supported platforms: Shopify, Amazon, eBay, Etsy, and more
          </p>
        </div>
      </div>
    </div>
  );
};

export default VideoAdGenerator;