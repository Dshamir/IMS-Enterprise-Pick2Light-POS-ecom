# Supabase Store - Inventory Management System

A comprehensive inventory management application built with Next.js, featuring AI-powered insights, dynamic categorization, and real-time stock tracking.

## 🚀 Features

### 📦 **Core Inventory Management**
- **CRUD Operations**: Full product lifecycle management
- **Stock Tracking**: Real-time inventory levels with automatic alerts
- **Transaction History**: Complete audit trail of all inventory changes
- **Barcode Support**: Product identification and management via barcode scanning

### 🏷️ **Dynamic Category Management** *(NEW)*
- **Unlimited Categories**: Create custom product categories on-demand
- **Real-time Updates**: Instant UI refresh when categories are added
- **+ Button Interface**: Intuitive category creation directly from product forms
- **Fallback Safety**: Graceful degradation to default categories if needed

### 🎨 **Per-Page Theme Customization** *(NEW - v2.10.0)*
- **4 Professional Themes**: Standard, Bumblebee, Modern Punch, and Marvel
- **Visual Theme Previews**: See theme appearance before applying
- **Light/Dark Variants**: Toggle support for 3 themes (Bumblebee always dark)
- **Database-Driven**: No code changes needed for theme customization
- **Automatic Application**: Themes apply instantly when navigating pages
- **Per-Page Control**: Each navigation item can have unique theme
- **Marvel Theme**: Premium lavender theme with vibrant colorful gradient icons
- **Settings Integration**: Manage themes through Settings → Navigation interface

### 🤖 **AI-Powered Features** *(ENHANCED)*
- **Smart Assistant**: Chat interface with natural language database queries
- **Professional Error Handling**: Intelligent error detection with actionable solutions
- **Real-time Usage Analytics**: OpenAI API monitoring with cost optimization
- **6 Specialized AI Agents**: Inventory analysis, stock monitoring, search, reorder planning, image processing, and category management
- **Image Analysis**: OCR and AI vision for product cataloging
- **Vector Search**: Semantic search across product descriptions and images
- **Quota Monitoring**: Proactive alerts for API usage and billing management

### 📸 **Image Management** *(ENHANCED)*
- **Multi-image Support**: Upload and manage multiple product images
- **Manufacturing Image Support**: Complete image upload and display for Production Lines, BOMs, and Production Runs
- **Camera Integration**: Direct photo capture from mobile devices
- **Image Cataloging**: AI-powered image organization and search
- **Quality Validation**: Automatic image quality assessment
- **Visual Dashboard**: Professional card layouts with image thumbnails across all manufacturing entities

### 📊 **Reports & Analytics** *(ENHANCED)*
- **Stock Reports**: Low stock alerts and reorder recommendations
- **Category Analytics**: Consumption patterns by category
- **Trend Analysis**: Historical usage and forecasting
- **Custom Dashboards**: Real-time inventory metrics
- **AI Usage Analytics**: Professional dashboard with OpenAI API monitoring
- **Cost Tracking**: Real-time token usage and billing analysis
- **Performance Metrics**: Response times, success rates, and efficiency tracking
- **Quota Management**: Visual quota status with direct billing integration

### 🔄 **Data Management**
- **CSV Import/Export**: Bulk data operations with validation
- **Backup System**: Automated database backups
- **Network Sync**: Multi-device access with real-time updates
- **Mobile Optimization**: Full functionality on mobile devices

### 💡 **WLED Device Management & LED Location Tracking** *(NEW)*
- **Device Management**: Complete CRUD operations for WLED WiFi LED controllers
- **Real-time Connection Testing**: Instant connectivity validation with visual feedback
- **LED Segment Configuration**: Precise mapping of LED ranges to inventory locations
- **Animation Preview System**: Live visualization of LED behaviors (flash, chaser, solid patterns)
- **Professional Interface**: Responsive device management with search, filtering, and status indicators
- **Unlimited Configurations**: Dynamic device creation replacing hardcoded limitations
- **Visual Inventory Feedback**: LED-based location identification and stock level indication
- **Settings Integration**: Seamless access through Settings → LED Devices interface

### 🏭 **Manufacturing Management** *(ENHANCED)*
- **Complete Visual Dashboard**: Professional image support across all manufacturing entities
- **Production Lines**: Create and manage manufacturing lines with image documentation
- **Bill of Materials (BOMs)**: Visual BOM management with schematic upload capability
- **Production Runs**: Track production with process documentation and images
- **Projects Integration**: Seamless workflow from projects to production execution
- **Serial Number Management**: Advanced tracking with template-based generation

### 📚 **In-App Documentation System** *(NEW)*
- **Integrated Wiki**: Complete documentation accessible from app navigation
- **Smart Search**: Full-text search across all documentation
- **Auto-categorization**: Documents organized by type and purpose
- **Mobile-friendly**: Responsive design with table of contents
- **Always Current**: Reads directly from markdown files in project

## 🛠️ Technology Stack

- **Frontend**: Next.js 15.5.5, React 19.2.0, TypeScript 5.9.3
- **Styling**: Tailwind CSS 3.4.18, Shadcn/ui components
- **Database**: SQLite (local) + Supabase (cloud sync)
- **AI Integration**: OpenAI GPT-4, Anthropic Claude
- **Search**: ChromaDB for vector search
- **Image Processing**: Enhanced AI vision pipeline
- **Deployment**: Vercel-ready with environment configuration

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- SQLite3
- Git

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone [repository-url]
cd supabase-store
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create `.env.local` file:
```env
# AI Providers (Optional)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Supabase (Optional - uses SQLite fallback)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### 4. Initialize Database
```bash
# Database will auto-initialize on first run
npm run dev
```

### 5. Start Development Server
```bash
# Local development
npm run dev

# Network access (mobile testing)
npm run dev:network

# WAN access (external devices)
npm run dev:wan_dev
```

Visit `http://localhost:3000` to access the application.

## 📱 Usage Guide

### Adding Products
1. Navigate to **"Add New Item"** from any category page
2. Fill in product details (name, description, price, etc.)
3. Select or create a category using the **+** button
4. Upload product images via camera or file upload
5. Set stock levels and reorder points
6. Submit to add to inventory

### Managing Categories
1. Click the **+** button next to any category dropdown
2. Enter a category name (1-50 characters)
3. Category is instantly created and available system-wide
4. All existing categories remain accessible

### AI Assistant
1. Access via the chat widget on the dashboard
2. Ask natural language questions about inventory
3. Get insights on stock levels, trends, and recommendations
4. Query specific products or categories

### Reports & Analytics
1. Visit **Reports** section for comprehensive analytics
2. View category consumption patterns
3. Check low stock alerts and reorder recommendations
4. Export data in CSV format

## 🔧 Development

### Project Structure
```
supabase-store/
├── app/                    # Next.js app router pages
│   ├── api/               # API endpoints
│   ├── products/          # Product management pages
│   └── dashboard/         # Main dashboard
├── components/            # Reusable React components
│   ├── ui/               # Base UI components
│   └── category-modal.tsx # Category creation modal
├── lib/                   # Utility functions and services
│   ├── database/         # Database clients and helpers
│   └── ai/              # AI provider integrations
├── data/                  # SQLite database storage
└── public/               # Static assets and uploads
```

### Key Commands
```bash
npm run dev              # Start development server
npm run dev:network      # Start with network access
npm run dev:wan_dev      # Start with WAN access
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run linting
```

### Database Management
```bash
# View categories
sqlite3 data/inventory.db "SELECT * FROM categories;"

# View products  
sqlite3 data/inventory.db "SELECT name, category, stock_quantity FROM products;"

# Backup database
cp data/inventory.db data/backup-$(date +%Y%m%d).db
```

## 🔌 API Reference

### Categories API
```http
GET /api/categories
# Returns all available categories

POST /api/categories
Content-Type: application/json
{
  "name": "new-category-name"
}
# Creates a new category
```

### Products API
```http
GET /api/products
# Returns all products with optional filtering

POST /api/products
# Creates a new product

PUT /api/products/[id]
# Updates existing product

DELETE /api/products/[id] 
# Deletes product (soft delete)
```

### Search API
```http
GET /api/search/image
# AI-powered image search

POST /api/ai/chat
# AI assistant chat interface
```

## 🧪 Testing

### Manual Testing
1. **Category Creation**: Test + button functionality
2. **Product CRUD**: Verify all operations work correctly
3. **Image Upload**: Test camera and file upload features
4. **AI Features**: Verify chat and search functionality
5. **Mobile Access**: Test responsive design and touch interfaces

### Automated Testing
```bash
npm run build           # Verify TypeScript compilation
npm run lint           # Check code quality
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Self-hosted
1. Build the application: `npm run build`
2. Start production server: `npm start`
3. Configure reverse proxy (nginx/Apache)
4. Set up SSL certificates

## 📚 Documentation

### 🌐 **In-App Documentation (Recommended)**
Access comprehensive documentation directly from the app:
- Navigate to **Documentation** in the app's main menu
- Browse by category or use the search function
- Mobile-responsive with table of contents and syntax highlighting

### 📄 **Key Documentation Files**
- **[Navigation Theme System](NAVIGATION-THEME-SYSTEM.md)** - Complete theming guide with 4 professional themes
- **[Theme Quick Reference](NAVIGATION-THEME-QUICK-REFERENCE.md)** - Fast theme selection guide
- **[Navigation Menu Editor](NAVIGATION-MENU-EDITOR-USER-GUIDE.md)** - Dynamic navigation customization
- **[Technical Implementation](CATEGORY_IMPLEMENTATION.md)** - Detailed technical documentation
- **[Changelog](CHANGELOG.md)** - Version history and changes
- **[Project Notes](CLAUDE.md)** - Development notes and session information
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Executive summary of latest features
- **[Quick Guide](docs/CATEGORY_QUICK_GUIDE.md)** - User-friendly reference guide

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly
4. Commit with descriptive messages
5. Push to your fork and create a pull request

### Development Guidelines
- Follow TypeScript best practices
- Use existing UI components from `components/ui/`
- Add proper error handling and loading states
- Update documentation for new features
- Test on multiple devices and screen sizes

## 🐛 Troubleshooting

### Common Issues

**Categories not loading:**
- Check database file permissions
- Verify API endpoint is accessible
- Clear browser cache and restart server

**Images not uploading:**
- Check `public/uploads/` directory permissions
- Verify file size limits
- Test camera permissions on mobile

**AI features not working:**
- Verify API keys are set correctly
- Check network connectivity
- Review console for error messages

**Database issues:**
- Backup current database before troubleshooting
- Check SQLite file integrity
- Restart application to trigger re-initialization

## 🔧 CSV Import Troubleshooting

### Common CSV Import Issues

If you encounter CSV import failures, the system provides comprehensive analysis and automated solutions:

#### **Quick Troubleshooting Steps**

1. **Check for whitespace/tab characters** in barcode fields
   - Symptoms: Import fails with validation errors
   - Solution: Use plain text editor, avoid copy-paste from Excel
   - Auto-fix: System generates cleaned CSV files automatically

2. **Validate unit_id formats**
   - Use database format (`FT2`) instead of mathematical notation (`FT^2`)
   - Check valid units: UNITS, FT, FT2, INCHES, GRAMS, ML, METERS, etc.

3. **Resolve duplicate barcodes**
   - Each barcode should appear only once in CSV
   - Review manual-review-report.json for duplicate resolution guidance

4. **Ensure data completeness**
   - Required fields: barcode, price, stock_quantity, unit_id
   - Empty fields cause validation failures

#### **Automated Solution System**

The system provides intelligent failure analysis with:

- **✅ Immediate fixes**: `fixed-update-products.csv` for 85% of failures
- **⚠️ Manual review**: `manual-review-report.json` for complex issues  
- **📊 Complete analysis**: `complete-solution-summary.json` for full details

#### **For Detailed Analysis**

See [CSV_FAILURE_ANALYSIS.md](CSV_FAILURE_ANALYSIS.md) for:
- Comprehensive troubleshooting guide
- Root cause analysis methodology
- Best practices for CSV preparation
- Technical implementation details

#### **Getting Help**

- Review generated analysis files for specific guidance
- Check audit logs for detailed error messages
- Use the AI Assistant for CSV-related questions
- Contact development team for complex issues

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/) and [React](https://reactjs.org/)
- UI components from [Shadcn/ui](https://ui.shadcn.com/)
- AI integrations with [OpenAI](https://openai.com/) and [Anthropic](https://anthropic.com/)
- Database powered by [SQLite](https://sqlite.org/) and [Supabase](https://supabase.com/)

---

## 🆕 Latest Updates

**v3.0.1 (October 2025)**
- 🔄 **Dependency Upgrades**: Next.js 15.5.5, Chart.js 4.5.1, Puppeteer 24.24.1
- 🐛 **Critical Build Fixes**: Resolved ChromaDB bundling errors
- ⚡ **Dynamic Rendering**: Fixed static generation issues on 3 critical pages
- 📦 **Production-Ready**: 107 pages building successfully
- 🔧 **Webpack Optimization**: ChromaDB external configuration for faster builds
- ✅ **Build Validation**: Zero errors, maintained 60-second build time

**v2.11.0 (October 2025)**
- 🎨 **Theme Editor & Management System**: Complete visual theme editor with color pickers
- 🛠️ **Create Custom Themes**: Build unlimited themes without writing CSS code
- 🎭 **Live Preview**: See theme changes in real-time as you edit colors
- 📋 **Duplicate Themes**: Clone any theme to create variations quickly
- 🔧 **Full CRUD Operations**: Create, edit, duplicate, and delete custom themes
- 🎯 **HEX/HSL Color Pickers**: User-friendly color selection with automatic conversion
- 📊 **Theme Statistics**: Dashboard showing system and custom theme counts
- 📥 **Import Themes**: Upload theme files (.js, .json) with automatic format conversion
- 🏷️ **Badge System**: Color-coded badges (System-blue, Created-purple, Imported-green)
- 🏭 **Warehouse Theme**: First imported theme successfully converted from warehouse-theme.js

**v2.10.0 (October 2025)**
- 🎨 **Per-Page Theme Customization**: 4 professional themes with light/dark variants
- ⭐ **Marvel Theme**: Premium lavender theme with vibrant colorful gradient icons
- 🖌️ **Visual Theme Previews**: See themes before applying
- 🔄 **Automatic Application**: Themes apply instantly when navigating pages
- 🎯 **Database-Driven**: Theme customization without code changes
- 📱 **Settings Integration**: Manage themes through Navigation editor

**v2.9.1 (October 2025)**
- 🧹 AI Assistant cleanup and analytics fix
- 📊 Fixed SQL analytics queries for proper usage tracking
- ♻️ Removed ~400 lines of redundant code

**v2.9.0 (October 2025)**
- 📡 Real-time WLED connectivity monitoring
- 📶 Signal strength indicators for device health
- ⚡ One-click LED profile activation
- 🔧 Complete WLED device management system

**v2.8.0 (October 2025)**
- 💡 WLED device management with LED animation previews
- 🎬 Real-time LED animation visualization
- 🔌 Connection testing and device validation
- 🏭 Manufacturing image support across all entities

For detailed changes, see [CHANGELOG.md](CHANGELOG.md).

---

*Last updated: October 15, 2025*