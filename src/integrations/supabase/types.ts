export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      abandoned_carts: {
        Row: {
          contact_email: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          reminder_processed_at: string | null
          source: string
          status: string
          updated_at: string
          user_id: string
          webhook_reference: string | null
        }
        Insert: {
          contact_email: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          reminder_processed_at?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id: string
          webhook_reference?: string | null
        }
        Update: {
          contact_email?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          reminder_processed_at?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
          webhook_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_carts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_deliveries: {
        Row: {
          buyer_id: string
          created_at: string
          delivery_instructions: string | null
          delivery_url: string
          id: string
          order_id: string
          order_item_id: string
          product_id: string | null
          released_at: string
          store_id: string
          title: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          delivery_instructions?: string | null
          delivery_url: string
          id?: string
          order_id: string
          order_item_id: string
          product_id?: string | null
          released_at?: string
          store_id: string
          title: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          delivery_instructions?: string | null
          delivery_url?: string
          id?: string
          order_id?: string
          order_item_id?: string
          product_id?: string | null
          released_at?: string
          store_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_deliveries_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: true
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_deliveries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_deliveries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_product_assets: {
        Row: {
          created_at: string
          delivery_instructions: string | null
          delivery_url: string
          product_id: string
          store_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_instructions?: string | null
          delivery_url: string
          product_id: string
          store_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_instructions?: string | null
          delivery_url?: string
          product_id?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_product_assets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_product_assets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      dismissed_order_notifications: {
        Row: {
          created_at: string
          id: string
          order_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dismissed_order_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      mercado_pago_accounts: {
        Row: {
          access_token_encrypted: string
          created_at: string
          mercado_pago_user_id: string
          refresh_token_encrypted: string | null
          store_id: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string
          mercado_pago_user_id: string
          refresh_token_encrypted?: string | null
          store_id: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string
          mercado_pago_user_id?: string
          refresh_token_encrypted?: string | null
          store_id?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mercado_pago_accounts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      mercado_pago_oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          redirect_origin: string
          state_hash: string
          store_id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          redirect_origin: string
          state_hash: string
          store_id: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          redirect_origin?: string
          state_hash?: string
          store_id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mercado_pago_oauth_states_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          order_id: string
          subject: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          order_id: string
          subject?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          order_id?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          commission_rate: number
          created_at: string
          id: string
          order_id: string
          platform_fee: number
          product_id: string | null
          quantity: number
          seller_amount: number
          store_id: string
          title: string
          unit_price: number
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          id?: string
          order_id: string
          platform_fee?: number
          product_id?: string | null
          quantity?: number
          seller_amount?: number
          store_id: string
          title: string
          unit_price: number
        }
        Update: {
          commission_rate?: number
          created_at?: string
          id?: string
          order_id?: string
          platform_fee?: number
          product_id?: string | null
          quantity?: number
          seller_amount?: number
          store_id?: string
          title?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "order_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_tracking_events: {
        Row: {
          created_at: string
          created_by: string
          id: string
          note: string
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          note?: string
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          note?: string
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_tracking_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          checkout_group_id: string
          created_at: string
          expires_at: string
          id: string
          payment_provider: string | null
          payment_reference: string | null
          payment_status: string
          platform_fee: number
          seller_amount: number
          shipping_address: Json | null
          status: string
          total: number
        }
        Insert: {
          buyer_id: string
          checkout_group_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          platform_fee?: number
          seller_amount?: number
          shipping_address?: Json | null
          status?: string
          total: number
        }
        Update: {
          buyer_id?: string
          checkout_group_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          platform_fee?: number
          seller_amount?: number
          shipping_address?: Json | null
          status?: string
          total?: number
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          provider_event_id: string
          provider_payment_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          provider?: string
          provider_event_id: string
          provider_payment_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
          provider_payment_id?: string | null
        }
        Relationships: []
      }
      payment_provider_settings: {
        Row: {
          access_token_encrypted: string
          client_id: string
          client_secret_encrypted: string
          configured_at: string
          configured_by: string
          environment: string
          provider: string
          public_key: string
          updated_at: string
          webhook_secret_encrypted: string
        }
        Insert: {
          access_token_encrypted: string
          client_id: string
          client_secret_encrypted: string
          configured_at?: string
          configured_by: string
          environment?: string
          provider: string
          public_key: string
          updated_at?: string
          webhook_secret_encrypted: string
        }
        Update: {
          access_token_encrypted?: string
          client_id?: string
          client_secret_encrypted?: string
          configured_at?: string
          configured_by?: string
          environment?: string
          provider?: string
          public_key?: string
          updated_at?: string
          webhook_secret_encrypted?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          buyer_id: string
          checkout_url: string | null
          created_at: string
          currency: string
          failure_reason: string | null
          gross_amount: number
          id: string
          inventory_released: boolean
          order_id: string
          paid_at: string | null
          payment_expires_at: string | null
          payment_method: string | null
          pix_qr_code: string | null
          pix_qr_code_base64: string | null
          platform_fee: number
          provider: string
          provider_payload: Json | null
          provider_payment_id: string | null
          provider_preference_id: string | null
          seller_amount: number
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          checkout_url?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          gross_amount: number
          id?: string
          inventory_released?: boolean
          order_id: string
          paid_at?: string | null
          payment_expires_at?: string | null
          payment_method?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          platform_fee: number
          provider?: string
          provider_payload?: Json | null
          provider_payment_id?: string | null
          provider_preference_id?: string | null
          seller_amount: number
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          checkout_url?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          gross_amount?: number
          id?: string
          inventory_released?: boolean
          order_id?: string
          paid_at?: string | null
          payment_expires_at?: string | null
          payment_method?: string | null
          pix_qr_code?: string | null
          pix_qr_code_base64?: string | null
          platform_fee?: number
          provider?: string
          provider_payload?: Json | null
          provider_payment_id?: string | null
          provider_preference_id?: string | null
          seller_amount?: number
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          commission_rate: number
          id: boolean
          payment_provider: string
          updated_at: string
        }
        Insert: {
          commission_rate?: number
          id?: boolean
          payment_provider?: string
          updated_at?: string
        }
        Update: {
          commission_rate?: number
          id?: boolean
          payment_provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_media: {
        Row: {
          created_at: string
          id: string
          media_type: string
          mime_type: string
          position: number
          product_id: string
          size_bytes: number
          storage_path: string
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type: string
          mime_type: string
          position: number
          product_id: string
          size_bytes: number
          storage_path: string
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          mime_type?: string
          position?: number
          product_id?: string
          size_bytes?: number
          storage_path?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_media_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          compare_at_price: number | null
          created_at: string
          description: string | null
          description_long: string | null
          free_shipping: boolean
          gallery_urls: string[]
          id: string
          image_url: string | null
          is_active: boolean
          price: number
          product_type: string
          rating: number
          reviews_count: number
          sold_count: number
          specifications: Json
          stock: number
          store_id: string
          supplier: string | null
          supplier_cost: number | null
          supplier_last_synced_at: string | null
          supplier_product_id: string | null
          supplier_sku: string | null
          supplier_variant_id: string | null
          title: string
          variations: Json
        }
        Insert: {
          category?: string
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          description_long?: string | null
          free_shipping?: boolean
          gallery_urls?: string[]
          id?: string
          image_url?: string | null
          is_active?: boolean
          price: number
          product_type?: string
          rating?: number
          reviews_count?: number
          sold_count?: number
          specifications?: Json
          stock?: number
          store_id: string
          supplier?: string | null
          supplier_cost?: number | null
          supplier_last_synced_at?: string | null
          supplier_product_id?: string | null
          supplier_sku?: string | null
          supplier_variant_id?: string | null
          title: string
          variations?: Json
        }
        Update: {
          category?: string
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          description_long?: string | null
          free_shipping?: boolean
          gallery_urls?: string[]
          id?: string
          image_url?: string | null
          is_active?: boolean
          price?: number
          product_type?: string
          rating?: number
          reviews_count?: number
          sold_count?: number
          specifications?: Json
          stock?: number
          store_id?: string
          supplier?: string | null
          supplier_cost?: number | null
          supplier_last_synced_at?: string | null
          supplier_product_id?: string | null
          supplier_sku?: string | null
          supplier_variant_id?: string | null
          title?: string
          variations?: Json
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["app_role"]
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["app_role"]
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      stores: {
        Row: {
          balance: number
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          mercado_pago_access_token_encrypted: string | null
          mercado_pago_refresh_token_encrypted: string | null
          mercado_pago_status: string
          mercado_pago_token_expires_at: string | null
          mercado_pago_user_id: string | null
          name: string
          owner_id: string | null
          pix_key: string | null
          pix_key_type: string | null
          rating: number
          slug: string
          status: string
        }
        Insert: {
          balance?: number
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          mercado_pago_access_token_encrypted?: string | null
          mercado_pago_refresh_token_encrypted?: string | null
          mercado_pago_status?: string
          mercado_pago_token_expires_at?: string | null
          mercado_pago_user_id?: string | null
          name: string
          owner_id?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          rating?: number
          slug: string
          status?: string
        }
        Update: {
          balance?: number
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          mercado_pago_access_token_encrypted?: string | null
          mercado_pago_refresh_token_encrypted?: string | null
          mercado_pago_status?: string
          mercado_pago_token_expires_at?: string | null
          mercado_pago_user_id?: string | null
          name?: string
          owner_id?: string | null
          pix_key?: string | null
          pix_key_type?: string | null
          rating?: number
          slug?: string
          status?: string
        }
        Relationships: []
      }
      supplier_catalog_categories: {
        Row: {
          category_id: string
          category_name: string
          category_path: string
          completed_at: string | null
          created_at: string
          id: string
          imported_count: number
          last_error: string | null
          next_product_index: number
          product_ids: Json
          provider: string
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          category_name: string
          category_path: string
          completed_at?: string | null
          created_at?: string
          id?: string
          imported_count?: number
          last_error?: string | null
          next_product_index?: number
          product_ids?: Json
          provider: string
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          category_name?: string
          category_path?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          imported_count?: number
          last_error?: string | null
          next_product_index?: number
          product_ids?: Json
          provider?: string
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_catalog_categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_fulfillments: {
        Row: {
          attempts: number
          created_at: string
          external_order_id: string | null
          id: string
          last_checked_at: string | null
          last_error: string | null
          next_attempt_at: string
          order_id: string
          provider: string
          provider_payload: Json | null
          request_payload: Json | null
          status: string
          store_id: string
          submitted_at: string | null
          tracking_carrier: string | null
          tracking_code: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          external_order_id?: string | null
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          next_attempt_at?: string
          order_id: string
          provider: string
          provider_payload?: Json | null
          request_payload?: Json | null
          status?: string
          store_id: string
          submitted_at?: string | null
          tracking_carrier?: string | null
          tracking_code?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          external_order_id?: string | null
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          next_attempt_at?: string
          order_id?: string
          provider?: string
          provider_payload?: Json | null
          request_payload?: Json | null
          status?: string
          store_id?: string
          submitted_at?: string | null
          tracking_carrier?: string | null
          tracking_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_fulfillments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_fulfillments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_import_jobs: {
        Row: {
          completed_at: string | null
          completed_categories: number
          created_at: string
          id: string
          imported_products: number
          lock_expires_at: string | null
          pause_reason: string | null
          provider: string
          skipped_products: number
          started_at: string | null
          status: string
          store_id: string
          total_categories: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          completed_categories?: number
          created_at?: string
          id?: string
          imported_products?: number
          lock_expires_at?: string | null
          pause_reason?: string | null
          provider: string
          skipped_products?: number
          started_at?: string | null
          status?: string
          store_id: string
          total_categories?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          completed_categories?: number
          created_at?: string
          id?: string
          imported_products?: number
          lock_expires_at?: string | null
          pause_reason?: string | null
          provider?: string
          skipped_products?: number
          started_at?: string | null
          status?: string
          store_id?: string
          total_categories?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_import_jobs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_integrations: {
        Row: {
          access_token_encrypted: string | null
          auto_fulfill: boolean
          auto_sync: boolean
          created_at: string
          id: string
          last_catalog_sync_at: string | null
          last_error: string | null
          last_stock_sync_at: string | null
          margin_percent: number
          provider: string
          refresh_token_encrypted: string | null
          status: string
          store_id: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_encrypted?: string | null
          auto_fulfill?: boolean
          auto_sync?: boolean
          created_at?: string
          id?: string
          last_catalog_sync_at?: string | null
          last_error?: string | null
          last_stock_sync_at?: string | null
          margin_percent?: number
          provider: string
          refresh_token_encrypted?: string | null
          status?: string
          store_id: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string | null
          auto_fulfill?: boolean
          auto_sync?: boolean
          created_at?: string
          id?: string
          last_catalog_sync_at?: string | null
          last_error?: string | null
          last_stock_sync_at?: string | null
          margin_percent?: number
          provider?: string
          refresh_token_encrypted?: string | null
          status?: string
          store_id?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_integrations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_addresses: {
        Row: {
          city: string
          complement: string
          created_at: string
          id: string
          is_default: boolean
          label: string
          phone: string
          postal_code: string
          recipient_name: string
          state: string
          street_address: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city: string
          complement?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          phone?: string
          postal_code?: string
          recipient_name: string
          state: string
          street_address: string
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string
          complement?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          phone?: string
          postal_code?: string
          recipient_name?: string
          state?: string
          street_address?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_mercado_pago_status: {
        Args: {
          _payment_method: string
          _provider_payload: Json
          _provider_payment_id: string
          _status: string
          _transaction_id: string
        }
        Returns: undefined
      }
      cancel_unpaid_marketplace_order: {
        Args: { _order_id: string }
        Returns: undefined
      }
      cancel_unpaid_marketplace_order_for_buyer: {
        Args: { _buyer_id: string; _order_id: string }
        Returns: undefined
      }
      create_marketplace_order: {
        Args: { _items: Json; _shipping_address: Json }
        Returns: string
      }
      create_seller_product: {
        Args: {
          _category: string
          _delivery_url: string
          _media: Json
          _price: number
          _product_type: string
          _stock: number
          _title: string
        }
        Returns: string
      }
      create_seller_product_v2: {
        Args: {
          _category: string
          _delivery_url: string
          _description: string
          _media: Json
          _price: number
          _product_type: string
          _stock: number
          _title: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      release_expired_marketplace_orders: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "seller" | "buyer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "seller", "buyer"],
    },
  },
} as const
