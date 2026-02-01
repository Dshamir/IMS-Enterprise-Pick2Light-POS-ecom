// Quick test script for the enhanced OCR pipeline
const { exec } = require('child_process');

console.log('🧪 Testing Enhanced OCR Pipeline...');

// Test the API endpoint
const testImageProcessing = () => {
  console.log('📝 Testing image processing API endpoint...');
  
  const testPayload = JSON.stringify({
    imageId: '1748467779733-w7cggy2yh5k'
  });

  const curlCommand = `curl -X POST http://localhost:3000/api/image-cataloging/process \\
    -H "Content-Type: application/json" \\
    -d '${testPayload}' \\
    --max-time 30`;

  exec(curlCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Test failed:', error.message);
      return;
    }
    
    if (stderr) {
      console.error('⚠️ Test stderr:', stderr);
    }

    try {
      const response = JSON.parse(stdout);
      console.log('✅ Test response received:', {
        success: response.success,
        extractedText: response.aiResults?.extractedText?.substring(0, 100) + '...',
        confidence: response.aiResults?.confidence,
        objects: response.aiResults?.objects
      });
      
      if (response.success && response.aiResults?.confidence > 0.5) {
        console.log('🎉 Enhanced pipeline test PASSED!');
      } else {
        console.log('⚠️ Enhanced pipeline test completed but with low confidence');
      }
    } catch (parseError) {
      console.error('❌ Failed to parse response:', parseError.message);
      console.log('Raw response:', stdout);
    }
  });
};

// Check if server is running first
exec('curl -s http://localhost:3000/api/health', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ Server not running. Please start with: npm run dev');
    process.exit(1);
  }
  
  console.log('✅ Server is running, proceeding with test...');
  testImageProcessing();
});

console.log('🔄 Test initiated. Results will appear shortly...');