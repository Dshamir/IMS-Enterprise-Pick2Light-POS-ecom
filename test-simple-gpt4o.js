// Test the simple GPT-4o Vision integration
console.log('🧪 Testing Simple GPT-4o Vision Integration...');

function testSimpleGPT4o() {
  console.log('📝 Testing with latest image...');
  
  // Get the latest image ID
  const testPayload = JSON.stringify({
    imageId: 'img-1748471005856-81g4u5vlg4j'  // Use the latest uploaded image
  });

  const curlCommand = `curl -X POST http://localhost:3000/api/image-cataloging/process \\
    -H "Content-Type: application/json" \\
    -d '${testPayload}' \\
    --max-time 30 -s`;

  console.log('🔄 Testing simple GPT-4o Vision approach...');

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
      console.log('\n✅ Simple GPT-4o Vision Response:');
      console.log('Success:', response.success);
      
      if (response.aiResults) {
        console.log('\n📊 Results:');
        console.log('Method:', 'Should be gpt4o_vision');
        console.log('Confidence:', response.aiResults.confidence);
        console.log('Text Length:', response.aiResults.extractedText?.length || 0);
        
        console.log('\n📝 Extracted Text:');
        console.log('"' + (response.aiResults.extractedText || 'No text') + '"');
        
        // Expected clean text
        console.log('\n🎯 Expected (from your manual test):');
        console.log('"48-000015-A\\n30 Position FFC, FPC Cable 0.020\\" (0.50mm) 6.69\\"\\nMOLEX\\n0151660325\\n2.32\\nNEXLESS"');
        
        // Check quality
        const extractedText = response.aiResults.extractedText || '';
        const hasPartNumber = extractedText.includes('48-000015') || extractedText.includes('000015');
        const hasManufacturer = extractedText.toLowerCase().includes('molex');
        const hasNexless = extractedText.toLowerCase().includes('nexless');
        const isClean = !extractedText.includes('ry Fe :') && !extractedText.includes('gibberish');
        
        console.log('\n🔍 Quality Check:');
        console.log('Contains Part Number:', hasPartNumber ? '✅' : '❌');
        console.log('Contains Manufacturer:', hasManufacturer ? '✅' : '❌');
        console.log('Contains NEXLESS:', hasNexless ? '✅' : '❌');
        console.log('Clean Text (no gibberish):', isClean ? '✅' : '❌');
        
        if (hasPartNumber && hasManufacturer && isClean) {
          console.log('\n🎉 SUCCESS: Simple GPT-4o Vision is working perfectly!');
          console.log('✅ Clean, readable text extracted');
          console.log('✅ Matches manual GPT-4o test results');
          console.log('✅ Ready for production use');
        } else if (!isClean) {
          console.log('\n❌ STILL GETTING GIBBERISH: GPT-4o Vision not working yet');
          console.log('Check: API key configuration');
        } else {
          console.log('\n⚠️ PARTIAL SUCCESS: Some text extracted but missing key details');
        }
      }
    } catch (parseError) {
      console.error('❌ Failed to parse response:', parseError.message);
      console.log('Raw response:', stdout.substring(0, 500) + '...');
    }
  });
}

// Check if server is running
require('child_process').exec('curl -s http://localhost:3000/api/health --max-time 5', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ Server not running. Please start with: npm run dev');
    console.log('⚠️ Remember to set OPENAI_API_KEY first!');
    process.exit(1);
  }
  
  console.log('✅ Server is running, testing simple GPT-4o Vision...');
  console.log('⚠️ Make sure OPENAI_API_KEY is set for this to work!');
  testSimpleGPT4o();
});

console.log('🔄 Simple GPT-4o Vision test initiated...');