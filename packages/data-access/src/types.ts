export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email?: string;
          full_name: string;
          first_name: string | null;
          last_name: string | null;
          role: "customer" | "admin" | "staff" | "rider";
          phone: string;
          address: string;
          street_address: string;
          region_id: string | null;
          province_id: string | null;
          town_id: string | null;
          barangay_id: string | null;
          zip_code: string;
          avatar_url: string | null;
          rider_status: "pending_approval" | "available" | "vacant" | "occupied" | "rejected" | null;
          vehicle_type: string | null;
          plate_number: string | null;
          license_number: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string;
          full_name: string;
          first_name?: string | null;
          last_name?: string | null;
          role?: "customer" | "admin" | "staff" | "rider";
          phone?: string;
          address?: string;
          street_address?: string;
          region_id?: string | null;
          province_id?: string | null;
          town_id?: string | null;
          barangay_id?: string | null;
          zip_code?: string;
          avatar_url?: string | null;
          rider_status?: "pending_approval" | "available" | "vacant" | "occupied" | "rejected" | null;
          vehicle_type?: string | null;
          plate_number?: string | null;
          license_number?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          first_name?: string | null;
          last_name?: string | null;
          role?: "customer" | "admin" | "staff" | "rider";
          phone?: string;
          address?: string;
          street_address?: string;
          region_id?: string | null;
          province_id?: string | null;
          town_id?: string | null;
          barangay_id?: string | null;
          zip_code?: string;
          avatar_url?: string | null;
          rider_status?: "pending_approval" | "available" | "vacant" | "occupied" | "rejected" | null;
          vehicle_type?: string | null;
          plate_number?: string | null;
          license_number?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          category_id: string | null;
          base_price: number;
          variant_type: "none" | "size" | "preparation" | "sugar_level";
          rating: number;
          quantity: number;
          buffer_quantity: number;
          low_stock_alerted_at: string | null;
          availability: "available" | "sold_out";
          is_featured: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          category_id?: string | null;
          base_price: number;
          variant_type?: "none" | "size" | "preparation" | "sugar_level";
          rating?: number;
          quantity?: number;
          buffer_quantity?: number;
          low_stock_alerted_at?: string | null;
          availability?: "available" | "sold_out";
          is_featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          category_id?: string | null;
          base_price?: number;
          variant_type?: "none" | "size" | "preparation" | "sugar_level";
          rating?: number;
          quantity?: number;
          buffer_quantity?: number;
          low_stock_alerted_at?: string | null;
          availability?: "available" | "sold_out";
          is_featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          price: number;
          quantity: number;
          is_active: boolean;
          sort_order: number;
        };
        Insert: {
          id?: string;
          product_id: string;
          name: string;
          price: number;
          quantity?: number;
          is_active?: boolean;
          sort_order?: number;
        };
        Update: {
          id?: string;
          product_id?: string;
          name?: string;
          price?: number;
          quantity?: number;
          is_active?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          user_id: string;
          status:
            | "pending"
            | "confirmed"
            | "preparing"
            | "ready_for_pickup"
            | "claimed_by_rider"
            | "out_for_delivery"
            | "near_customer"
            | "delivered"
            | "cancelled";
          payment_method: "cod" | "gcash" | "maya";
          payment_status: "pending" | "verified" | "rejected" | "refunded";
          payment_proof_url: string | null;
          gcash_reference_no: string | null;
          maya_reference_no: string | null;
          delivery_address: string;
          delivery_lat: number | null;
          delivery_lng: number | null;
          delivery_contact: string;
          delivery_notes: string | null;
          rider_id: string | null;
          staff_id: string | null;
          subtotal: number;
          delivery_fee: number;
          total: number;
          rider_earnings: number;
          confirmed_at: string | null;
          prepared_at: string | null;
          picked_up_at: string | null;
          delivered_at: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number?: string;
          user_id: string;
          status?:
            | "pending"
            | "confirmed"
            | "preparing"
            | "ready_for_pickup"
            | "claimed_by_rider"
            | "out_for_delivery"
            | "near_customer"
            | "delivered"
            | "cancelled";
          payment_method: "cod" | "gcash" | "maya";
          payment_status?: "pending" | "verified" | "rejected" | "refunded";
          payment_proof_url?: string | null;
          gcash_reference_no?: string | null;
          maya_reference_no?: string | null;
          delivery_address: string;
          delivery_lat?: number | null;
          delivery_lng?: number | null;
          delivery_contact: string;
          delivery_notes?: string | null;
          rider_id?: string | null;
          staff_id?: string | null;
          subtotal: number;
          delivery_fee?: number;
          total: number;
          rider_earnings?: number;
          confirmed_at?: string | null;
          prepared_at?: string | null;
          picked_up_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          user_id?: string;
          status?:
            | "pending"
            | "confirmed"
            | "preparing"
            | "ready_for_pickup"
            | "claimed_by_rider"
            | "out_for_delivery"
            | "near_customer"
            | "delivered"
            | "cancelled";
          payment_method?: "cod" | "gcash" | "maya";
          payment_status?: "pending" | "verified" | "rejected" | "refunded";
          payment_proof_url?: string | null;
          gcash_reference_no?: string | null;
          maya_reference_no?: string | null;
          delivery_address?: string;
          delivery_lat?: number | null;
          delivery_lng?: number | null;
          delivery_contact?: string;
          delivery_notes?: string | null;
          rider_id?: string | null;
          staff_id?: string | null;
          subtotal?: number;
          delivery_fee?: number;
          total?: number;
          rider_earnings?: number;
          confirmed_at?: string | null;
          prepared_at?: string | null;
          picked_up_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          variant_id: string | null;
          product_name: string;
          variant_name: string | null;
          quantity: number;
          unit_price: number;
          total_price: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          variant_id?: string | null;
          product_name: string;
          variant_name?: string | null;
          quantity?: number;
          unit_price: number;
          total_price: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          variant_id?: string | null;
          product_name?: string;
          variant_name?: string | null;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
        };
        Relationships: [];
      };
      business: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          phone: string | null;
          email: string | null;
          logo_url: string | null;
          registration_no: string | null;
          gcash_qr_url: string | null;
          maya_qr_url: string | null;
          delivery_fee: number;
          free_delivery_min: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          registration_no?: string | null;
          gcash_qr_url?: string | null;
          maya_qr_url?: string | null;
          delivery_fee?: number;
          free_delivery_min?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          logo_url?: string | null;
          registration_no?: string | null;
          gcash_qr_url?: string | null;
          maya_qr_url?: string | null;
          delivery_fee?: number;
          free_delivery_min?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          type: "region" | "province" | "city" | "barangay";
          name: string;
          code: string | null;
          parent_id: string | null;
          is_custom: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          type: "region" | "province" | "city" | "barangay";
          name: string;
          code?: string | null;
          parent_id?: string | null;
          is_custom?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          type?: "region" | "province" | "city" | "barangay";
          name?: string;
          code?: string | null;
          parent_id?: string | null;
          is_custom?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      rider_earnings: {
        Row: {
          id: string;
          rider_id: string;
          order_id: string;
          amount: number;
          status: "pending" | "paid";
          earned_at: string;
        };
        Insert: {
          id?: string;
          rider_id: string;
          order_id: string;
          amount?: number;
          status?: "pending" | "paid";
          earned_at?: string;
        };
        Update: {
          id?: string;
          rider_id?: string;
          order_id?: string;
          amount?: number;
          status?: "pending" | "paid";
          earned_at?: string;
        };
        Relationships: [];
      };
      rider_cashouts: {
        Row: {
          id: string;
          rider_id: string;
          amount: number;
          status: "requested" | "approved" | "paid" | "rejected";
          requested_at: string;
          processed_at: string | null;
          processed_by: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          rider_id: string;
          amount: number;
          status?: "requested" | "approved" | "paid" | "rejected";
          requested_at?: string;
          processed_at?: string | null;
          processed_by?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          rider_id?: string;
          amount?: number;
          status?: "requested" | "approved" | "paid" | "rejected";
          requested_at?: string;
          processed_at?: string | null;
          processed_by?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      order_status_log: {
        Row: {
          id: string;
          order_id: string;
          status:
            | "pending"
            | "confirmed"
            | "preparing"
            | "ready_for_pickup"
            | "claimed_by_rider"
            | "out_for_delivery"
            | "near_customer"
            | "delivered"
            | "cancelled";
          changed_by: string | null;
          changed_at: string;
          notes: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          status:
            | "pending"
            | "confirmed"
            | "preparing"
            | "ready_for_pickup"
            | "claimed_by_rider"
            | "out_for_delivery"
            | "near_customer"
            | "delivered"
            | "cancelled";
          changed_by?: string | null;
          changed_at?: string;
          notes?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          status?:
            | "pending"
            | "confirmed"
            | "preparing"
            | "ready_for_pickup"
            | "claimed_by_rider"
            | "out_for_delivery"
            | "near_customer"
            | "delivered"
            | "cancelled";
          changed_by?: string | null;
          changed_at?: string;
          notes?: string | null;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data: Json | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data?: Json | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          data?: Json | null;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      user_carts: {
        Row: {
          user_id: string;
          items: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          items?: Json;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          items?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      rider_locations: {
        Row: {
          id: string;
          rider_id: string;
          order_id: string | null;
          latitude: number;
          longitude: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rider_id: string;
          order_id?: string | null;
          latitude: number;
          longitude: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          rider_id?: string;
          order_id?: string | null;
          latitude?: number;
          longitude?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_staff_or_admin: { Args: Record<string, never>; Returns: boolean };
      is_rider: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      user_role: "customer" | "admin" | "staff" | "rider";
      rider_status: "pending_approval" | "available" | "vacant" | "occupied" | "rejected";
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready_for_pickup"
        | "claimed_by_rider"
        | "out_for_delivery"
        | "near_customer"
        | "delivered"
        | "cancelled";
      payment_method: "cod" | "gcash" | "maya";
      payment_status: "pending" | "verified" | "rejected" | "refunded";
      location_type: "region" | "province" | "city" | "barangay";
      earning_status: "pending" | "paid";
      cashout_status: "requested" | "approved" | "paid" | "rejected";
    };
  };
}
