export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          stock_quantity: number
          min_stock_level: number
          max_stock_level: number
          reorder_quantity: number
          unit_id: string | null
          created_at: string
          updated_at: string
          image_url: string | null
          category: string
          feature_vector?: number[] | null
          barcode: string | null
          mfgname: string | null
          mfgnum: string | null
          Location: string | null
          loc_tag: string | null
          distributor: string | null
          Product_url_1: string | null
          Product_url_2: string | null
          Product_url_3: string | null
          is_manufactured: number | null
          bom_id: string | null
          default_production_run_id: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price: number
          stock_quantity?: number
          min_stock_level?: number
          max_stock_level?: number
          reorder_quantity?: number
          unit_id?: string | null
          created_at?: string
          updated_at?: string
          image_url?: string | null
          category: string
          feature_vector?: number[] | null
          barcode?: string | null
          mfgname?: string | null
          mfgnum?: string | null
          Location?: string | null
          loc_tag?: string | null
          distributor?: string | null
          Product_url_1?: string | null
          Product_url_2?: string | null
          Product_url_3?: string | null
          is_manufactured?: number | null
          bom_id?: string | null
          default_production_run_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          stock_quantity?: number
          min_stock_level?: number
          max_stock_level?: number
          reorder_quantity?: number
          unit_id?: string | null
          created_at?: string
          updated_at?: string
          image_url?: string | null
          category?: string
          feature_vector?: number[] | null
          barcode?: string | null
          mfgname?: string | null
          mfgnum?: string | null
          Location?: string | null
          loc_tag?: string | null
          distributor?: string | null
          Product_url_1?: string | null
          Product_url_2?: string | null
          Product_url_3?: string | null
          is_manufactured?: number | null
          bom_id?: string | null
          default_production_run_id?: string | null
        }
      }
      units: {
        Row: {
          id: string
          name: string
          display_name: string
          symbol: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          symbol: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          symbol?: string
          created_at?: string
          updated_at?: string
        }
      }
      product_images: {
        Row: {
          id: string
          product_id: string
          image_url: string
          is_primary: boolean
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          image_url: string
          is_primary?: boolean
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          image_url?: string
          is_primary?: boolean
          display_order?: number
          created_at?: string
        }
      }
      inventory_transactions: {
        Row: {
          id: string
          product_id: string
          transaction_type: string
          quantity: number
          previous_quantity: number
          new_quantity: number
          reason: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          transaction_type: string
          quantity: number
          previous_quantity: number
          new_quantity: number
          reason?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          transaction_type?: string
          quantity?: number
          previous_quantity?: number
          new_quantity?: number
          reason?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string
          status: string
          total_amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          status?: string
          total_amount: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          status?: string
          total_amount?: number
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
          created_at?: string
        }
      }
      product_instances: {
        Row: {
          id: string
          product_id: string
          production_run_id: string
          serial_number: string | null
          batch_number: string | null
          instance_status: string
          manufacture_date: string | null
          qa_date: string | null
          release_date: string | null
          shipped_date: string | null
          tracking_number: string | null
          customer_id: string | null
          quality_notes: string | null
          defect_reason: string | null
          repair_notes: string | null
          location: string | null
          warranty_start_date: string | null
          warranty_end_date: string | null
          maintenance_schedule: string | null
          last_maintenance_date: string | null
          next_maintenance_date: string | null
          metadata: string | null
          model: string | null
          serial_number_custom: string | null
          part_number: string | null
          counter: number | null
          kind: string | null
          use_case: string | null
          version: string | null
          production_year: number | null
          num_wells: number | null
          application: string | null
          machine_name: string | null
          note: string | null
          input_specs: string | null
          color_code: string | null
          color: string | null
          self_test_by: string | null
          calibrated_by: string | null
          used_by: string | null
          calibration_date: string | null
          recalibration_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          production_run_id: string
          serial_number?: string | null
          batch_number?: string | null
          instance_status?: string
          manufacture_date?: string | null
          qa_date?: string | null
          release_date?: string | null
          shipped_date?: string | null
          tracking_number?: string | null
          customer_id?: string | null
          quality_notes?: string | null
          defect_reason?: string | null
          repair_notes?: string | null
          location?: string | null
          warranty_start_date?: string | null
          warranty_end_date?: string | null
          maintenance_schedule?: string | null
          last_maintenance_date?: string | null
          next_maintenance_date?: string | null
          metadata?: string | null
          model?: string | null
          serial_number_custom?: string | null
          part_number?: string | null
          counter?: number | null
          kind?: string | null
          use_case?: string | null
          version?: string | null
          production_year?: number | null
          num_wells?: number | null
          application?: string | null
          machine_name?: string | null
          note?: string | null
          input_specs?: string | null
          color_code?: string | null
          color?: string | null
          self_test_by?: string | null
          calibrated_by?: string | null
          used_by?: string | null
          calibration_date?: string | null
          recalibration_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          production_run_id?: string
          serial_number?: string | null
          batch_number?: string | null
          instance_status?: string
          manufacture_date?: string | null
          qa_date?: string | null
          release_date?: string | null
          shipped_date?: string | null
          tracking_number?: string | null
          customer_id?: string | null
          quality_notes?: string | null
          defect_reason?: string | null
          repair_notes?: string | null
          location?: string | null
          warranty_start_date?: string | null
          warranty_end_date?: string | null
          maintenance_schedule?: string | null
          last_maintenance_date?: string | null
          next_maintenance_date?: string | null
          metadata?: string | null
          model?: string | null
          serial_number_custom?: string | null
          part_number?: string | null
          counter?: number | null
          kind?: string | null
          use_case?: string | null
          version?: string | null
          production_year?: number | null
          num_wells?: number | null
          application?: string | null
          machine_name?: string | null
          note?: string | null
          input_specs?: string | null
          color_code?: string | null
          color?: string | null
          self_test_by?: string | null
          calibrated_by?: string | null
          used_by?: string | null
          calibration_date?: string | null
          recalibration_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      search_feedback: {
        Row: {
          id: string
          product_id: string
          search_image_hash: string | null
          feedback_type: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          search_image_hash?: string | null
          feedback_type: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          search_image_hash?: string | null
          feedback_type?: string
          notes?: string | null
          created_at?: string
        }
      }
    }
    Functions: {
      search_similar_products: {
        Args: {
          query_embedding: number[]
          similarity_threshold: number
          match_count: number
        }
        Returns: {
          id: string
          name: string
          description: string | null
          price: number
          stock_quantity: number
          image_url: string | null
          created_at: string
          updated_at: string
          similarity: number
        }[]
      }
    }
  }
}

