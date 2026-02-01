# OCR Setup Guide

## Image Text Extraction with Tesseract OCR

The AI Image Cataloging feature includes real OCR (Optical Character Recognition) capabilities to extract text from uploaded images. However, it requires the Tesseract OCR engine to be installed on the system.

### Current Status
- ✅ Server-side OCR implementation is complete
- ✅ Intelligent fallback system with enhanced filename analysis
- ⚠️ Tesseract OCR engine needs to be installed

### Installation Instructions

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install tesseract-ocr
```

#### macOS:
```bash
brew install tesseract
```

#### Windows:
Download and install from: https://github.com/UB-Mannheim/tesseract/wiki

### Verification
After installation, verify Tesseract is available:
```bash
tesseract --version
```

### How It Works

1. **With Tesseract Installed**: Real OCR text extraction from image content
2. **Without Tesseract**: Intelligent filename analysis with clear feedback

### Current Behavior
When processing images, the system will:
- First attempt real OCR if Tesseract is available
- Fall back to intelligent filename analysis if OCR fails
- Provide clear feedback about OCR availability in the extracted text

### Features
- Multi-language support (currently configured for English)
- Confidence scoring based on text quality
- Automatic fallback to filename analysis
- Clear error messages and status reporting

### Installation Benefits
Installing Tesseract will enable:
- Real text extraction from product labels, barcodes, and documentation
- Higher accuracy for product identification
- Better inventory cataloging with actual image content analysis