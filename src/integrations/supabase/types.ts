export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      documents: {
        Row: {
          created_at: string
          document_name: string
          document_type: string
          document_url: string
          id: string
          investment_id: string | null
          uploaded_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          document_name: string
          document_type: string
          document_url: string
          id?: string
          investment_id?: string | null
          uploaded_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          document_name?: string
          document_type?: string
          document_url?: string
          id?: string
          investment_id?: string | null
          uploaded_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          created_at: string
          expected_harvest_year: number
          id: string
          plant_count: number
          plantation_year: number
          plot_id: string | null
          price_per_plant: number
          species_id: string
          status: string | null
          total_amount: number
          updated_at: string
          user_id: string
          weight_per_plant_kg: number | null
        }
        Insert: {
          created_at?: string
          expected_harvest_year: number
          id?: string
          plant_count: number
          plantation_year: number
          plot_id?: string | null
          price_per_plant: number
          species_id: string
          status?: string | null
          total_amount: number
          updated_at?: string
          user_id: string
          weight_per_plant_kg?: number | null
        }
        Update: {
          created_at?: string
          expected_harvest_year?: number
          id?: string
          plant_count?: number
          plantation_year?: number
          plot_id?: string | null
          price_per_plant?: number
          species_id?: string
          status?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string
          weight_per_plant_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "investments_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "plots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investments_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "plant_species"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      plant_species: {
        Row: {
          carbon_capture_per_plant: number | null
          created_at: string
          description: string | null
          id: string
          maturation_years: number
          max_weight_kg: number
          min_weight_kg: number
          name: string
          scientific_name: string | null
        }
        Insert: {
          carbon_capture_per_plant?: number | null
          created_at?: string
          description?: string | null
          id?: string
          maturation_years: number
          max_weight_kg: number
          min_weight_kg: number
          name: string
          scientific_name?: string | null
        }
        Update: {
          carbon_capture_per_plant?: number | null
          created_at?: string
          description?: string | null
          id?: string
          maturation_years?: number
          max_weight_kg?: number
          min_weight_kg?: number
          name?: string
          scientific_name?: string | null
        }
        Relationships: []
      }
      plot_photos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          photo_url: string
          plot_id: string
          taken_date: string | null
          year: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          photo_url: string
          plot_id: string
          taken_date?: string | null
          year: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          photo_url?: string
          plot_id?: string
          taken_date?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "plot_photos_plot_id_fkey"
            columns: ["plot_id"]
            isOneToOne: false
            referencedRelation: "plots"
            referencedColumns: ["id"]
          },
        ]
      }
      plots: {
        Row: {
          area: number
          available_plants: number
          coordinates: string
          created_at: string
          elevation: number | null
          id: string
          latitude: number | null
          location: string
          longitude: number | null
          name: string
          rainfall: number | null
          soil_type: string | null
          status: string | null
          temperature: string | null
          total_plants: number
          updated_at: string
        }
        Insert: {
          area: number
          available_plants?: number
          coordinates: string
          created_at?: string
          elevation?: number | null
          id?: string
          latitude?: number | null
          location: string
          longitude?: number | null
          name: string
          rainfall?: number | null
          soil_type?: string | null
          status?: string | null
          temperature?: string | null
          total_plants?: number
          updated_at?: string
        }
        Update: {
          area?: number
          available_plants?: number
          coordinates?: string
          created_at?: string
          elevation?: number | null
          id?: string
          latitude?: number | null
          location?: string
          longitude?: number | null
          name?: string
          rainfall?: number | null
          soil_type?: string | null
          status?: string | null
          temperature?: string | null
          total_plants?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_balance: number | null
          created_at: string
          email: string
          id: string
          name: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_balance?: number | null
          created_at?: string
          email: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_balance?: number | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "investor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "investor"],
    },
  },
} as const
