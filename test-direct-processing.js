// Direct test of enhanced processing on actual image
const path = require('path');

async function testDirectProcessing() {
  console.log('🔍 Testing enhanced processing directly on image file...');
  
  const imagePath = path.join(__dirname, 'public/uploads/image-cataloging/1748468172642-xnel4vq20c.jpg');
  
  try {
    // Import the modules directly
    const { DualPathProcessor } = await import('./lib/dual-path-processor.js');
    
    console.log('📁 Image path:', imagePath);
    console.log('🚀 Starting dual-path processing...');
    
    const processor = new DualPathProcessor({
      enableOCRPath: true,
      enableAIPath: true,
      preferAIForTextExtraction: true,
      confidenceThreshold: 0.7,
      parallelProcessing: true,
      fallbackStrategy: 'best_confidence'
    });
    
    const startTime = Date.now();
    const result = await processor.processImage(imagePath);
    const duration = Date.now() - startTime;
    
    console.log('\n✅ Processing Complete!');
    console.log('Duration:', duration + 'ms');
    console.log('Success:', result.success);
    console.log('Method:', result.method);
    console.log('Final Confidence:', result.finalConfidence);
    console.log('Final Text Length:', result.finalText.length);
    
    console.log('\n📝 Extracted Text:');
    console.log('"' + result.finalText.substring(0, 300) + '"');
    
    console.log('\n📊 Processing Details:');
    console.log('OCR Results Count:', result.processingDetails.ocrResults.length);
    console.log('AI Results Success:', result.processingDetails.aiResults.confidence > 0);
    console.log('Merge Strategy:', result.processingDetails.mergeStrategy);
    
    // Show OCR results
    if (result.processingDetails.ocrResults.length > 0) {
      console.log('\n🔍 OCR Results:');
      result.processingDetails.ocrResults.forEach(ocr => {
        console.log(`  - ${ocr.method}: confidence=${ocr.confidence}, length=${ocr.text.length}`);
        console.log(`    Text: "${ocr.text.substring(0, 100)}..."`);
      });
    }
    
    // Show AI results
    if (result.processingDetails.aiResults.confidence > 0) {
      console.log('\n🤖 AI Vision Results:');
      console.log(`  - Confidence: ${result.processingDetails.aiResults.confidence}`);
      console.log(`  - Text Length: ${result.processingDetails.aiResults.extractedText.length}`);
      console.log(`  - Text: "${result.processingDetails.aiResults.extractedText.substring(0, 200)}..."`);
    } else {
      console.log('\n❌ AI Vision Failed:', result.processingDetails.aiResults.reasoning);
    }
    
  } catch (error) {
    console.error('❌ Direct processing failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testDirectProcessing();