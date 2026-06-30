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
      bowl_components: {
        Row: {
          bowl_id: string
          created_at: string
          id: string
          ingredient_id: string
          is_default: boolean
          quantity: number
        }
        Insert: {
          bowl_id: string
          created_at?: string
          id?: string
          ingredient_id: string
          is_default?: boolean
          quantity?: number
        }
        Update: {
          bowl_id?: string
          created_at?: string
          id?: string
          ingredient_id?: string
          is_default?: boolean
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "bowl_components_bowl_id_fkey"
            columns: ["bowl_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bowl_components_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          allergens: string[] | null
          calories: number
          carbs_g: number
          category: string | null
          component_role: string | null
          created_at: string
          description: string | null
          fat_g: number
          fiber_g: number
          food_type: Database["public"]["Enums"]["food_type"]
          glycemic_index: number | null
          id: string
          image_url: string | null
          is_active: boolean
          is_addon: boolean
          is_available: boolean
          kind: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          name: string
          price_inr: number
          protein_g: number
          serving_size: string | null
          sodium_mg: number | null
          status: Database["public"]["Enums"]["content_status"]
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          allergens?: string[] | null
          calories?: number
          carbs_g?: number
          category?: string | null
          component_role?: string | null
          created_at?: string
          description?: string | null
          fat_g?: number
          fiber_g?: number
          food_type?: Database["public"]["Enums"]["food_type"]
          glycemic_index?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_addon?: boolean
          is_available?: boolean
          kind?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          name: string
          price_inr?: number
          protein_g?: number
          serving_size?: string | null
          sodium_mg?: number | null
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          allergens?: string[] | null
          calories?: number
          carbs_g?: number
          category?: string | null
          component_role?: string | null
          created_at?: string
          description?: string | null
          fat_g?: number
          fiber_g?: number
          food_type?: Database["public"]["Enums"]["food_type"]
          glycemic_index?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_addon?: boolean
          is_available?: boolean
          kind?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          name?: string
          price_inr?: number
          protein_g?: number
          serving_size?: string | null
          sodium_mg?: number | null
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string | null
          name: string
          order_id: string
          price_inr: number
          qty: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          name: string
          order_id: string
          price_inr?: number
          qty?: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          name?: string
          order_id?: string
          price_inr?: number
          qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          created_at: string
          delivered_at: string | null
          delivery_address: string | null
          delivery_date: string
          delivery_pincode: string | null
          id: string
          kind: string
          notes: string | null
          out_for_delivery_at: string | null
          preferred_time: string | null
          slot: Database["public"]["Enums"]["delivery_slot"]
          status: Database["public"]["Enums"]["order_status"]
          subscription_id: string | null
          total_inr: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_date: string
          delivery_pincode?: string | null
          id?: string
          kind?: string
          notes?: string | null
          out_for_delivery_at?: string | null
          preferred_time?: string | null
          slot: Database["public"]["Enums"]["delivery_slot"]
          status?: Database["public"]["Enums"]["order_status"]
          subscription_id?: string | null
          total_inr?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_date?: string
          delivery_pincode?: string | null
          id?: string
          kind?: string
          notes?: string | null
          out_for_delivery_at?: string | null
          preferred_time?: string | null
          slot?: Database["public"]["Enums"]["delivery_slot"]
          status?: Database["public"]["Enums"]["order_status"]
          subscription_id?: string | null
          total_inr?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_inr: number
          created_at: string
          gst_amount: number
          id: string
          invoice_url: string | null
          paid_at: string | null
          razorpay_payment_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string
        }
        Insert: {
          amount_inr: number
          created_at?: string
          gst_amount?: number
          id?: string
          invoice_url?: string | null
          paid_at?: string | null
          razorpay_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id: string
        }
        Update: {
          amount_inr?: number
          created_at?: string
          gst_amount?: number
          id?: string
          invoice_url?: string | null
          paid_at?: string | null
          razorpay_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      pincode_requests: {
        Row: {
          created_at: string
          id: string
          name: string | null
          notes: string | null
          phone: string | null
          pincode: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          pincode: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          pincode?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      plan_items: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          menu_item_id: string
          plan_id: string
          slot: Database["public"]["Enums"]["delivery_slot"]
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          menu_item_id: string
          plan_id: string
          slot: Database["public"]["Enums"]["delivery_slot"]
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          menu_item_id?: string
          plan_id?: string
          slot?: Database["public"]["Enums"]["delivery_slot"]
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          created_at: string
          days_per_week: number
          delivery_days: number[]
          description: string | null
          duration_days: number
          goal_type: Database["public"]["Enums"]["goal_type"]
          id: string
          image_url: string | null
          is_active: boolean
          is_popular: boolean
          meals_per_day: number
          name: string
          price_inr: number
          start_date: string | null
          start_day_of_week: number | null
          status: Database["public"]["Enums"]["content_status"]
          tags: string[]
          updated_at: string
        }
        Insert: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          created_at?: string
          days_per_week?: number
          delivery_days?: number[]
          description?: string | null
          duration_days?: number
          goal_type?: Database["public"]["Enums"]["goal_type"]
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_popular?: boolean
          meals_per_day?: number
          name: string
          price_inr?: number
          start_date?: string | null
          start_day_of_week?: number | null
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          updated_at?: string
        }
        Update: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          created_at?: string
          days_per_week?: number
          delivery_days?: number[]
          description?: string | null
          duration_days?: number
          goal_type?: Database["public"]["Enums"]["goal_type"]
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_popular?: boolean
          meals_per_day?: number
          name?: string
          price_inr?: number
          start_date?: string | null
          start_day_of_week?: number | null
          status?: Database["public"]["Enums"]["content_status"]
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allergies: string[] | null
          created_at: string
          email: string | null
          food_preference: Database["public"]["Enums"]["food_type"] | null
          id: string
          name: string | null
          phone: string | null
          pincode: string | null
          updated_at: string
        }
        Insert: {
          allergies?: string[] | null
          created_at?: string
          email?: string | null
          food_preference?: Database["public"]["Enums"]["food_type"] | null
          id: string
          name?: string | null
          phone?: string | null
          pincode?: string | null
          updated_at?: string
        }
        Update: {
          allergies?: string[] | null
          created_at?: string
          email?: string | null
          food_preference?: Database["public"]["Enums"]["food_type"] | null
          id?: string
          name?: string | null
          phone?: string | null
          pincode?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          applies_to: string
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_discount_inr: number | null
          max_uses: number | null
          min_subtotal_inr: number
          per_user_limit: number
          updated_at: string
          uses: number
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          applies_to?: string
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_discount_inr?: number | null
          max_uses?: number | null
          min_subtotal_inr?: number
          per_user_limit?: number
          updated_at?: string
          uses?: number
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          applies_to?: string
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount_inr?: number | null
          max_uses?: number | null
          min_subtotal_inr?: number
          per_user_limit?: number
          updated_at?: string
          uses?: number
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: []
      }
      promo_redemptions: {
        Row: {
          created_at: string
          discount_inr: number
          id: string
          order_id: string | null
          promo_code_id: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_inr: number
          id?: string
          order_id?: string | null
          promo_code_id: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          discount_inr?: number
          id?: string
          order_id?: string | null
          promo_code_id?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_redemptions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      serviceable_pincodes: {
        Row: {
          area: string | null
          city: string | null
          created_at: string
          id: string
          is_active: boolean
          pincode: string
        }
        Insert: {
          area?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          pincode: string
        }
        Update: {
          area?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          pincode?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      subscription_addons: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          qty: number
          subscription_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          qty?: number
          subscription_id: string
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          qty?: number
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_addons_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_addons_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_swaps: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          note: string | null
          slot: Database["public"]["Enums"]["delivery_slot"]
          subscription_id: string
          swap_menu_item_id: string | null
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          note?: string | null
          slot: Database["public"]["Enums"]["delivery_slot"]
          subscription_id: string
          swap_menu_item_id?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          note?: string | null
          slot?: Database["public"]["Enums"]["delivery_slot"]
          subscription_id?: string
          swap_menu_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_swaps_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_swaps_swap_menu_item_id_fkey"
            columns: ["swap_menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          avoid_allergens: string[] | null
          created_at: string
          days_per_week: number
          delivery_address: string | null
          delivery_pincode: string | null
          delivery_slot: Database["public"]["Enums"]["delivery_slot"] | null
          end_date: string | null
          id: string
          meals_per_day: number
          next_billing_date: string | null
          plan_id: string | null
          portion_size: string | null
          preferred_time: string | null
          razorpay_subscription_id: string | null
          selected_dates: string[] | null
          source: string
          special_instructions: string | null
          start_date: string
          status: Database["public"]["Enums"]["sub_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avoid_allergens?: string[] | null
          created_at?: string
          days_per_week?: number
          delivery_address?: string | null
          delivery_pincode?: string | null
          delivery_slot?: Database["public"]["Enums"]["delivery_slot"] | null
          end_date?: string | null
          id?: string
          meals_per_day?: number
          next_billing_date?: string | null
          plan_id?: string | null
          portion_size?: string | null
          preferred_time?: string | null
          razorpay_subscription_id?: string | null
          selected_dates?: string[] | null
          source?: string
          special_instructions?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["sub_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avoid_allergens?: string[] | null
          created_at?: string
          days_per_week?: number
          delivery_address?: string | null
          delivery_pincode?: string | null
          delivery_slot?: Database["public"]["Enums"]["delivery_slot"] | null
          end_date?: string | null
          id?: string
          meals_per_day?: number
          next_billing_date?: string | null
          plan_id?: string | null
          portion_size?: string | null
          preferred_time?: string | null
          razorpay_subscription_id?: string | null
          selected_dates?: string[] | null
          source?: string
          special_instructions?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["sub_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
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
      claim_admin_if_none: { Args: never; Returns: boolean }
      duplicate_menu_item: { Args: { _id: string }; Returns: string }
      duplicate_plan: { Args: { _id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      validate_promo: {
        Args: {
          _code: string
          _source: string
          _subtotal: number
          _user_id: string
        }
        Returns: {
          discount_inr: number
          promo_id: string
          reason: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "customer"
      billing_cycle:
        | "weekly"
        | "monthly"
        | "daily"
        | "custom_dates"
        | "biweekly"
      content_status: "active" | "inactive" | "archived"
      delivery_slot: "breakfast" | "lunch" | "dinner"
      food_type: "veg" | "non-veg" | "egg" | "jain"
      goal_type: "weight-loss" | "muscle-gain" | "balanced" | "keto"
      meal_type: "breakfast" | "lunch" | "dinner" | "snack"
      order_status: "preparing" | "out_for_delivery" | "delivered" | "skipped"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      sub_status: "active" | "paused" | "cancelled"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "customer"],
      billing_cycle: ["weekly", "monthly", "daily", "custom_dates", "biweekly"],
      content_status: ["active", "inactive", "archived"],
      delivery_slot: ["breakfast", "lunch", "dinner"],
      food_type: ["veg", "non-veg", "egg", "jain"],
      goal_type: ["weight-loss", "muscle-gain", "balanced", "keto"],
      meal_type: ["breakfast", "lunch", "dinner", "snack"],
      order_status: ["preparing", "out_for_delivery", "delivered", "skipped"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      sub_status: ["active", "paused", "cancelled"],
    },
  },
} as const
