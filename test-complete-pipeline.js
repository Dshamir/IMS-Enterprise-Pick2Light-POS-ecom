// Test the complete enhanced OCR pipeline
console.log('🧪 Testing Complete Enhanced OCR Pipeline...');

const testImageProcessing = () => {
  console.log('📝 Testing image processing with latest uploaded image...');
  
  // Use the image ID from the latest upload (20250111_154255.jpg)
  const testPayload = JSON.stringify({
    imageId: '1748468172642-xnel4vq20c'  // The latest image ID that showed OCR working
  });

  const curlCommand = `curl -X POST http://localhost:3000/api/image-cataloging/process \\
    -H "Content-Type: application/json" \\
    -d '${testPayload}' \\
    --max-time 60 -s`;

  console.log('🔄 Sending request to enhanced pipeline...');

  require('child_process').exec(curlCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Test failed:', error.message);
      return;
    }
    
    if (stderr) {
      console.error('⚠️ Test stderr:', stderr);
    }

    try {
      const response = JSON.parse(stdout);
      console.log('\n✅ Enhanced Pipeline Response:');
      console.log('Success:', response.success);
      
      if (response.aiResults) {
        console.log('\n📊 Results Breakdown:');
        console.log('Extracted Text Length:', response.aiResults.extractedText?.length || 0);
        console.log('Confidence:', response.aiResults.confidence);
        console.log('Objects Detected:', response.aiResults.objects);
        
        // Show first 200 characters of extracted text
        const extractedText = response.aiResults.extractedText || '';
        console.log('\n📝 Extracted Text (first 200 chars):');
        console.log('"' + extractedText.substring(0, 200) + '..."');
        
        // Expected text from OpenAI in another app
        const expectedText = `48-000062-A
CABLE FFC 8POS 1.00MM 1.18"
Molex
152670223
2.94
NEXLESS`;
        
        console.log('\n🎯 Expected Text:');
        console.log('"' + expectedText + '"');
        
        // Check if we're getting better results now
        const hasPartNumber = extractedText.includes('48-000062') || extractedText.includes('000062');
        const hasModuleInfo = extractedText.toLowerCase().includes('cable') || extractedText.toLowerCase().includes('molex');
        const hasNexless = extractedText.toLowerCase().includes('nexless');
        
        console.log('\n🔍 Text Quality Analysis:');
        console.log('Contains Part Number (48-000062):', hasPartNumber ? '✅' : '❌');
        console.log('Contains Product Info (Cable/Molex):', hasModuleInfo ? '✅' : '❌');
        console.log('Contains Company (Nexless):', hasNexless ? '✅' : '❌');
        
        if (hasPartNumber && hasModuleInfo) {
          console.log('\n🎉 SUCCESS: Enhanced pipeline is extracting meaningful text!');
        } else if (response.aiResults.confidence > 0.7) {
          console.log('\n⚠️ PARTIAL SUCCESS: High confidence but text quality needs improvement');
        } else {
          console.log('\n❌ NEEDS IMPROVEMENT: Low quality text extraction');
        }
      }
    } catch (parseError) {
      console.error('❌ Failed to parse response:', parseError.message);
      console.log('Raw response:', stdout);
    }
  });
};

// Check if server is running first
require('child_process').exec('curl -s http://localhost:3000/api/health --max-time 5', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ Server not running. Please start with: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Server is running, testing enhanced pipeline...');
  testImageProcessing();
});

console.log('🔄 Pipeline test initiated. Results will appear shortly...');