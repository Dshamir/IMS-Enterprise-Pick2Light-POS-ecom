-- =============================================
-- FOR SALE MODULE - AI Background Processing Columns
-- Migration: 019_add_forsale_ai_columns.sql
-- Date: January 2, 2026
-- =============================================

-- AI processing status tracking
ALTER TABLE product_for_sale ADD COLUMN ai_processing_status TEXT CHECK(ai_processing_status IN ('pending', 'processing', 'completed', 'failed'));
ALTER TABLE product_for_sale ADD COLUMN ai_processing_error TEXT;
ALTER TABLE product_for_sale ADD COLUMN ai_processed_at TEXT;

-- Vision analysis result (reusable for all descriptions)
ALTER TABLE product_for_sale ADD COLUMN vision_description TEXT;

-- Platform-specific descriptions (in addition to existing marketplace_description)
ALTER TABLE product_for_sale ADD COLUMN description_ebay TEXT;
ALTER TABLE product_for_sale ADD COLUMN description_facebook TEXT;
ALTER TABLE product_for_sale ADD COLUMN description_craigslist TEXT;

-- Index for AI processing status queries
CREATE INDEX IF NOT EXISTS idx_product_for_sale_ai_status ON product_for_sale(ai_processing_status);
