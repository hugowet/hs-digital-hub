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
    PostgrestVersion: "14.17"
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
      account_notifications: {
        Row: {
          body: string
          created_at: string
          event_key: string
          id: string
          kind: string
          read_at: string | null
          target_id: string
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          event_key: string
          id?: string
          kind: string
          read_at?: string | null
          target_id: string
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          event_key?: string
          id?: string
          kind?: string
          read_at?: string | null
          target_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      arcade_game_sessions: {
        Row: {
          accepted_coins: number | null
          expires_at: string
          game_type: string
          id: string
          started_at: string
          submitted_at: string | null
          submitted_coins: number | null
          user_id: string
        }
        Insert: {
          accepted_coins?: number | null
          expires_at?: string
          game_type: string
          id?: string
          started_at?: string
          submitted_at?: string | null
          submitted_coins?: number | null
          user_id: string
        }
        Update: {
          accepted_coins?: number | null
          expires_at?: string
          game_type?: string
          id?: string
          started_at?: string
          submitted_at?: string | null
          submitted_coins?: number | null
          user_id?: string
        }
        Relationships: []
      }
      cj_translation_cache: {
        Row: {
          created_at: string
          id: string
          translated_text: string
        }
        Insert: {
          created_at?: string
          id: string
          translated_text: string
        }
        Update: {
          created_at?: string
          id?: string
          translated_text?: string
        }
        Relationships: []
      }
      cj_translation_daily_usage: {
        Row: {
          day: string
          used_bytes: number
        }
        Insert: {
          day: string
          used_bytes?: number
        }
        Update: {
          day?: string
          used_bytes?: number
        }
        Relationships: []
      }
      clube_hs_pix_payments: {
        Row: {
          amount: number
          checkout_url: string | null
          created_at: string
          expires_at: string | null
          id: string
          paid_at: string | null
          preference_id: string | null
          provider_payment_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount?: number
          checkout_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          paid_at?: string | null
          preference_id?: string | null
          provider_payment_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          checkout_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          paid_at?: string | null
          preference_id?: string | null
          provider_payment_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clube_hs_pix_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clube_hs_subscriptions: {
        Row: {
          external_reference: string | null
          id: string
          preapproval_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          external_reference?: string | null
          id?: string
          preapproval_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          external_reference?: string | null
          id?: string
          preapproval_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clube_hs_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      game_plays: {
        Row: {
          created_at: string
          game_type: string
          id: string
          outcome: string
          played_on: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_type: string
          id?: string
          outcome: string
          played_on?: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_type?: string
          id?: string
          outcome?: string
          played_on?: string
          user_id?: string
        }
        Relationships: []
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
          supplier_variant_id_snapshot: string | null
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
          supplier_variant_id_snapshot?: string | null
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
          supplier_variant_id_snapshot?: string | null
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
      order_shipments: {
        Row: {
          amount: number
          carrier_name: string
          created_at: string
          delivery_days_max: number | null
          delivery_days_min: number | null
          destination_postal_code: string
          id: string
          order_id: string
          provider: string
          quote_id: string | null
          service_code: string
          service_name: string
          store_id: string
        }
        Insert: {
          amount: number
          carrier_name: string
          created_at?: string
          delivery_days_max?: number | null
          delivery_days_min?: number | null
          destination_postal_code: string
          id?: string
          order_id: string
          provider: string
          quote_id?: string | null
          service_code: string
          service_name: string
          store_id: string
        }
        Update: {
          amount?: number
          carrier_name?: string
          created_at?: string
          delivery_days_max?: number | null
          delivery_days_min?: number | null
          destination_postal_code?: string
          id?: string
          order_id?: string
          provider?: string
          quote_id?: string | null
          service_code?: string
          service_name?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_shipments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "shipping_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_shipments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
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
          coupon_discount: number
          created_at: string
          expires_at: string
          id: string
          payment_provider: string | null
          payment_reference: string | null
          payment_status: string
          payout_released_at: string | null
          payout_status: string
          platform_fee: number
          seller_amount: number
          shipping_address: Json | null
          status: string
          total: number
        }
        Insert: {
          buyer_id: string
          checkout_group_id?: string
          coupon_discount?: number
          created_at?: string
          expires_at?: string
          id?: string
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          payout_released_at?: string | null
          payout_status?: string
          platform_fee?: number
          seller_amount?: number
          shipping_address?: Json | null
          status?: string
          total: number
        }
        Update: {
          buyer_id?: string
          checkout_group_id?: string
          coupon_discount?: number
          created_at?: string
          expires_at?: string
          id?: string
          payment_provider?: string | null
          payment_reference?: string | null
          payment_status?: string
          payout_released_at?: string | null
          payout_status?: string
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
      product_conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          product_id: string
          store_id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          product_id: string
          store_id: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          product_id?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_conversations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_conversations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
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
      product_messages: {
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
            foreignKeyName: "product_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "product_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          author: string
          comment: string
          created_at: string
          id: string
          photo_paths: string[]
          product_id: string
          rating: number
          user_id: string
          verified: boolean
        }
        Insert: {
          author: string
          comment: string
          created_at?: string
          id?: string
          photo_paths?: string[]
          product_id: string
          rating: number
          user_id: string
          verified?: boolean
        }
        Update: {
          author?: string
          comment?: string
          created_at?: string
          id?: string
          photo_paths?: string[]
          product_id?: string
          rating?: number
          user_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          catalog_search_text: string
          category: string
          compare_at_price: number | null
          created_at: string
          description: string | null
          description_long: string | null
          free_shipping: boolean
          gallery_urls: string[]
          height_cm: number | null
          id: string
          image_url: string | null
          is_active: boolean
          length_cm: number | null
          price: number
          product_type: string
          rating: number
          reviews_count: number
          sold_count: number
          specifications: Json
          stock: number
          store_id: string
          supplier: string | null
          supplier_content_version: number
          supplier_cost: number | null
          supplier_cost_currency: string | null
          supplier_details_original: Json | null
          supplier_details_synced_at: string | null
          supplier_exchange_rate: number | null
          supplier_exchange_rate_at: string | null
          supplier_last_synced_at: string | null
          supplier_locale: string | null
          supplier_product_id: string | null
          supplier_sku: string | null
          supplier_title_original: string | null
          supplier_translation_version: number
          supplier_variant_id: string | null
          supplier_variant_label: string | null
          supplier_variant_parent_id: string | null
          title: string
          variations: Json
          weight_kg: number | null
          width_cm: number | null
        }
        Insert: {
          catalog_search_text?: string
          category?: string
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          description_long?: string | null
          free_shipping?: boolean
          gallery_urls?: string[]
          height_cm?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          length_cm?: number | null
          price: number
          product_type?: string
          rating?: number
          reviews_count?: number
          sold_count?: number
          specifications?: Json
          stock?: number
          store_id: string
          supplier?: string | null
          supplier_content_version?: number
          supplier_cost?: number | null
          supplier_cost_currency?: string | null
          supplier_details_original?: Json | null
          supplier_details_synced_at?: string | null
          supplier_exchange_rate?: number | null
          supplier_exchange_rate_at?: string | null
          supplier_last_synced_at?: string | null
          supplier_locale?: string | null
          supplier_product_id?: string | null
          supplier_sku?: string | null
          supplier_title_original?: string | null
          supplier_translation_version?: number
          supplier_variant_id?: string | null
          supplier_variant_label?: string | null
          supplier_variant_parent_id?: string | null
          title: string
          variations?: Json
          weight_kg?: number | null
          width_cm?: number | null
        }
        Update: {
          catalog_search_text?: string
          category?: string
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          description_long?: string | null
          free_shipping?: boolean
          gallery_urls?: string[]
          height_cm?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          length_cm?: number | null
          price?: number
          product_type?: string
          rating?: number
          reviews_count?: number
          sold_count?: number
          specifications?: Json
          stock?: number
          store_id?: string
          supplier?: string | null
          supplier_content_version?: number
          supplier_cost?: number | null
          supplier_cost_currency?: string | null
          supplier_details_original?: Json | null
          supplier_details_synced_at?: string | null
          supplier_exchange_rate?: number | null
          supplier_exchange_rate_at?: string | null
          supplier_last_synced_at?: string | null
          supplier_locale?: string | null
          supplier_product_id?: string | null
          supplier_sku?: string | null
          supplier_title_original?: string | null
          supplier_translation_version?: number
          supplier_variant_id?: string | null
          supplier_variant_label?: string | null
          supplier_variant_parent_id?: string | null
          title?: string
          variations?: Json
          weight_kg?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_variant_parent_id_fkey"
            columns: ["supplier_variant_parent_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: Database["public"]["Enums"]["app_role"]
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          is_clube_hs: boolean
          phone: string | null
          status_text: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["app_role"]
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_clube_hs?: boolean
          phone?: string | null
          status_text?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["app_role"]
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_clube_hs?: boolean
          phone?: string | null
          status_text?: string | null
        }
        Relationships: []
      }
      seller_shipping_integrations: {
        Row: {
          access_token_encrypted: string | null
          created_at: string
          id: string
          last_error: string | null
          oauth_state_expires_at: string | null
          oauth_state_hash: string | null
          provider: string
          redirect_origin: string | null
          refresh_token_encrypted: string | null
          status: string
          store_id: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_encrypted?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          oauth_state_expires_at?: string | null
          oauth_state_hash?: string | null
          provider: string
          redirect_origin?: string | null
          refresh_token_encrypted?: string | null
          status?: string
          store_id: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          oauth_state_expires_at?: string | null
          oauth_state_hash?: string | null
          provider?: string
          redirect_origin?: string | null
          refresh_token_encrypted?: string | null
          status?: string
          store_id?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_shipping_integrations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_quotes: {
        Row: {
          amount: number
          buyer_id: string
          carrier_name: string
          consumed_order_id: string | null
          created_at: string
          currency: string
          delivery_days_max: number | null
          delivery_days_min: number | null
          destination_postal_code: string
          expires_at: string
          id: string
          items: Json
          provider: string
          provider_payload: Json
          service_code: string
          service_name: string
          store_id: string
        }
        Insert: {
          amount: number
          buyer_id: string
          carrier_name: string
          consumed_order_id?: string | null
          created_at?: string
          currency?: string
          delivery_days_max?: number | null
          delivery_days_min?: number | null
          destination_postal_code: string
          expires_at: string
          id?: string
          items: Json
          provider: string
          provider_payload?: Json
          service_code: string
          service_name: string
          store_id: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          carrier_name?: string
          consumed_order_id?: string | null
          created_at?: string
          currency?: string
          delivery_days_max?: number | null
          delivery_days_min?: number | null
          destination_postal_code?: string
          expires_at?: string
          id?: string
          items?: Json
          provider?: string
          provider_payload?: Json
          service_code?: string
          service_name?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_quotes_consumed_order_id_fkey"
            columns: ["consumed_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_quotes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      social_conversations: {
        Row: {
          created_at: string
          id: string
          member_a: string
          member_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_a: string
          member_b: string
        }
        Update: {
          created_at?: string
          id?: string
          member_a?: string
          member_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_conversations_member_a_fkey"
            columns: ["member_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_conversations_member_b_fkey"
            columns: ["member_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_group_members: {
        Row: {
          added_at: string
          group_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          group_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          group_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "social_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_group_messages: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          kind: string
          media_path: string | null
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          kind?: string
          media_path?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          kind?: string
          media_path?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "social_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_group_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_groups: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          edited_at: string | null
          id: string
          kind: string
          media_path: string | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          kind?: string
          media_path?: string | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          kind?: string
          media_path?: string | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "social_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_presence: {
        Row: {
          last_seen_at: string
          typing_at: string | null
          typing_conversation_id: string | null
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          typing_at?: string | null
          typing_conversation_id?: string | null
          user_id: string
        }
        Update: {
          last_seen_at?: string
          typing_at?: string | null
          typing_conversation_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_presence_typing_conversation_id_fkey"
            columns: ["typing_conversation_id"]
            isOneToOne: false
            referencedRelation: "social_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_stories: {
        Row: {
          caption: string
          created_at: string
          expires_at: string
          id: string
          media_path: string | null
          user_id: string
        }
        Insert: {
          caption?: string
          created_at?: string
          expires_at?: string
          id?: string
          media_path?: string | null
          user_id: string
        }
        Update: {
          caption?: string
          created_at?: string
          expires_at?: string
          id?: string
          media_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_daily_ranking: {
        Row: {
          day: string
          position: number
          product_id: string
        }
        Insert: {
          day: string
          position: number
          product_id: string
        }
        Update: {
          day?: string
          position?: number
          product_id?: string
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
          origin_postal_code: string | null
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
          origin_postal_code?: string | null
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
          origin_postal_code?: string | null
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
          priority: number
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
          priority?: number
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
          priority?: number
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
      supplier_content_jobs: {
        Row: {
          id: string
          lock_expires_at: string | null
          lock_token: string | null
          next_attempt_at: string | null
          operation: string
          pause_reason: string | null
          processed: number
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          lock_expires_at?: string | null
          lock_token?: string | null
          next_attempt_at?: string | null
          operation: string
          pause_reason?: string | null
          processed?: number
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          lock_expires_at?: string | null
          lock_token?: string | null
          next_attempt_at?: string | null
          operation?: string
          pause_reason?: string | null
          processed?: number
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_content_jobs_store_id_fkey"
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
          shipping_amount: number | null
          shipping_service_code: string | null
          shipping_service_name: string | null
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
          shipping_amount?: number | null
          shipping_service_code?: string | null
          shipping_service_name?: string | null
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
          shipping_amount?: number | null
          shipping_service_code?: string | null
          shipping_service_name?: string | null
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
          api_base_url: string | null
          auto_fulfill: boolean
          auto_sync: boolean
          created_at: string
          id: string
          integrator_id: string | null
          last_catalog_sync_at: string | null
          last_error: string | null
          last_stock_sync_at: string | null
          margin_percent: number
          product_endpoint: string
          product_mapping: Json
          provider: string
          refresh_token_encrypted: string | null
          status: string
          store_id: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_encrypted?: string | null
          api_base_url?: string | null
          auto_fulfill?: boolean
          auto_sync?: boolean
          created_at?: string
          id?: string
          integrator_id?: string | null
          last_catalog_sync_at?: string | null
          last_error?: string | null
          last_stock_sync_at?: string | null
          margin_percent?: number
          product_endpoint?: string
          product_mapping?: Json
          provider: string
          refresh_token_encrypted?: string | null
          status?: string
          store_id: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string | null
          api_base_url?: string | null
          auto_fulfill?: boolean
          auto_sync?: boolean
          created_at?: string
          id?: string
          integrator_id?: string | null
          last_catalog_sync_at?: string | null
          last_error?: string | null
          last_stock_sync_at?: string | null
          margin_percent?: number
          product_endpoint?: string
          product_mapping?: Json
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
      supplier_price_refresh_jobs: {
        Row: {
          cursor_id: string | null
          last_error: string | null
          lease_token: string | null
          lease_until: string | null
          next_attempt_at: string
          store_id: string
          updated_at: string
        }
        Insert: {
          cursor_id?: string | null
          last_error?: string | null
          lease_token?: string | null
          lease_until?: string | null
          next_attempt_at?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          cursor_id?: string | null
          last_error?: string | null
          lease_token?: string | null
          lease_until?: string | null
          next_attempt_at?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_price_refresh_jobs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      trend_comments: {
        Row: {
          content: string
          created_at: string
          edited_at: string | null
          id: string
          parent_id: string | null
          user_avatar: string | null
          user_id: string
          user_name: string
          video_id: string
        }
        Insert: {
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          parent_id?: string | null
          user_avatar?: string | null
          user_id: string
          user_name: string
          video_id: string
        }
        Update: {
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          parent_id?: string | null
          user_avatar?: string | null
          user_id?: string
          user_name?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trend_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "trend_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trend_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trend_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "trend_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      trend_follows: {
        Row: {
          created_at: string
          followed_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          followed_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          followed_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trend_follows_followed_id_fkey"
            columns: ["followed_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trend_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trend_likes: {
        Row: {
          created_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trend_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trend_likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "trend_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      trend_pinned_comments: {
        Row: {
          comment_id: string
          pinned_at: string
          video_id: string
        }
        Insert: {
          comment_id: string
          pinned_at?: string
          video_id: string
        }
        Update: {
          comment_id?: string
          pinned_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trend_pinned_comments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: true
            referencedRelation: "trend_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trend_pinned_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "trend_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      trend_videos: {
        Row: {
          audio_path: string | null
          author_avatar: string | null
          author_name: string
          created_at: string
          description: string
          duration_seconds: number
          id: string
          likes_count: number
          music_title: string
          post_type: string
          title: string
          user_id: string
          video_url: string
          views_count: number
        }
        Insert: {
          audio_path?: string | null
          author_avatar?: string | null
          author_name: string
          created_at?: string
          description?: string
          duration_seconds?: number
          id?: string
          likes_count?: number
          music_title?: string
          post_type?: string
          title: string
          user_id: string
          video_url: string
          views_count?: number
        }
        Update: {
          audio_path?: string | null
          author_avatar?: string | null
          author_name?: string
          created_at?: string
          description?: string
          duration_seconds?: number
          id?: string
          likes_count?: number
          music_title?: string
          post_type?: string
          title?: string
          user_id?: string
          video_url?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "trend_videos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trend_views: {
        Row: {
          created_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trend_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trend_views_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "trend_videos"
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
      user_coupons: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          kind: string
          max_discount: number
          percent_off: number | null
          redeemed_order_id: string | null
          source: string
          status: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          kind: string
          max_discount?: number
          percent_off?: number | null
          redeemed_order_id?: string | null
          source: string
          status?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          kind?: string
          max_discount?: number
          percent_off?: number | null
          redeemed_order_id?: string | null
          source?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_coupons_redeemed_order_id_fkey"
            columns: ["redeemed_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_game_wallets: {
        Row: {
          coin_balance: number
          lifetime_coins: number
          rewarded_milestones: number
          updated_at: string
          user_id: string
        }
        Insert: {
          coin_balance?: number
          lifetime_coins?: number
          rewarded_milestones?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          coin_balance?: number
          lifetime_coins?: number
          rewarded_milestones?: number
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
      webauthn_challenges: {
        Row: {
          challenge: string
          challenge_type: string
          created_at: string
          expires_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          challenge: string
          challenge_type: string
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          challenge?: string
          challenge_type?: string
          created_at?: string
          expires_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      webauthn_credentials: {
        Row: {
          backed_up: boolean
          counter: number
          created_at: string
          credential_id: string
          device_type: string
          id: string
          last_used_at: string | null
          nickname: string
          public_key: string
          revoked_at: string | null
          transports: string[]
          user_id: string
        }
        Insert: {
          backed_up?: boolean
          counter?: number
          created_at?: string
          credential_id: string
          device_type: string
          id?: string
          last_used_at?: string | null
          nickname?: string
          public_key: string
          revoked_at?: string | null
          transports?: string[]
          user_id: string
        }
        Update: {
          backed_up?: boolean
          counter?: number
          created_at?: string
          credential_id?: string
          device_type?: string
          id?: string
          last_used_at?: string | null
          nickname?: string
          public_key?: string
          revoked_at?: string | null
          transports?: string[]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_club_pix_payment: {
        Args: {
          _amount: number
          _currency: string
          _id: string
          _payment_id: string
          _status: string
        }
        Returns: undefined
      }
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
      approve_seller_store: { Args: { _store_id: string }; Returns: undefined }
      cancel_unpaid_marketplace_order: {
        Args: { _order_id: string }
        Returns: undefined
      }
      cancel_unpaid_marketplace_order_for_buyer: {
        Args: { _buyer_id: string; _order_id: string }
        Returns: undefined
      }
      cj_quoted_unit_price: {
        Args: {
          _product_id: string
          _quantity: number
          _quote_id: string
          _zip: string
        }
        Returns: number
      }
      claim_cj_price_refresh: {
        Args: { _store_id: string }
        Returns: {
          cursor_id: string | null
          last_error: string | null
          lease_token: string | null
          lease_until: string | null
          next_attempt_at: string
          store_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "supplier_price_refresh_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      club_has_access: { Args: { _user_id: string }; Returns: boolean }
      create_marketplace_checkout: {
        Args: {
          _coupon_id?: string
          _items: Json
          _shipping_address: Json
          _shipping_quote_ids: Json
          _warranty_id?: string
        }
        Returns: string
      }
      create_marketplace_order: {
        Args: { _items: Json; _shipping_address: Json }
        Returns: string
      }
      create_marketplace_order_v2: {
        Args: {
          _items: Json
          _shipping_address: Json
          _shipping_quote_ids: Json
        }
        Returns: string
      }
      create_marketplace_order_v3: {
        Args: {
          _coupon_id?: string
          _items: Json
          _shipping_address: Json
          _shipping_quote_ids: Json
        }
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
      create_seller_product_v3: {
        Args: {
          _category: string
          _delivery_url: string
          _description: string
          _height_cm: number
          _length_cm: number
          _media: Json
          _price: number
          _product_type: string
          _stock: number
          _title: string
          _weight_kg: number
          _width_cm: number
        }
        Returns: string
      }
      daily_storefront_selection: {
        Args: { p_day?: string; p_limit?: number; p_offset?: number }
        Returns: Json
      }
      expire_club_pix_memberships: { Args: never; Returns: undefined }
      finish_arcade_game: {
        Args: { _coins: number; _session_id: string }
        Returns: {
          accepted_coins: number
          coupon_code: string
          total_coins: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      normalize_catalog_text: { Args: { value: string }; Returns: string }
      play_daily_game: {
        Args: { _game_type: string }
        Returns: {
          coupon_code: string
          coupon_id: string
          expires_at: string
          outcome: string
        }[]
      }
      publish_product_review: {
        Args: {
          _author: string
          _comment: string
          _id: string
          _photo_paths: string[]
          _product_id: string
          _rating: number
        }
        Returns: string
      }
      read_trend_pin: { Args: { _video_id: string }; Returns: string }
      refresh_storefront_daily_ranking: {
        Args: { p_day?: string }
        Returns: number
      }
      refresh_storefront_daily_ranking_if_missing: {
        Args: never
        Returns: number
      }
      release_expired_marketplace_orders: { Args: never; Returns: number }
      reprice_cj_products_brl: {
        Args: {
          _margin_percent: number
          _store_id: string
          _usd_brl_rate: number
        }
        Returns: number
      }
      reserve_cj_free_translation: {
        Args: { _bytes: number }
        Returns: boolean
      }
      reserve_cj_identified_free_translation: {
        Args: { _bytes: number }
        Returns: boolean
      }
      search_catalog_ids: {
        Args: {
          _category: string
          _free: boolean
          _groups: Json
          _limit: number
          _max: number
          _min: number
          _offset: number
          _sort: string
        }
        Returns: string[]
      }
      social_contact_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          full_name: string
          id: string
        }[]
      }
      social_heartbeat: { Args: never; Returns: undefined }
      social_mark_read: {
        Args: { _conversation_id: string }
        Returns: undefined
      }
      social_normalize_phone: { Args: { _phone: string }; Returns: string }
      social_open_by_phone: {
        Args: { _phone: string }
        Returns: {
          conversation_id: string
          full_name: string
          profile_id: string
        }[]
      }
      social_open_by_user: {
        Args: { _user_id: string }
        Returns: {
          conversation_id: string
          full_name: string
          profile_id: string
        }[]
      }
      social_publish_story: {
        Args: { _caption: string; _media_path?: string }
        Returns: string
      }
      social_set_typing: {
        Args: { _conversation_id: string; _typing: boolean }
        Returns: undefined
      }
      start_arcade_game: {
        Args: { _game_type: string }
        Returns: {
          hard_mode: boolean
          session_id: string
          total_coins: number
        }[]
      }
      trend_pin_comment: {
        Args: { _comment_id?: string; _video_id: string }
        Returns: undefined
      }
      trend_register_view: { Args: { _video_id: string }; Returns: number }
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
