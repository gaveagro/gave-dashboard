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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      cecil_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          cecil_aoi_id: string
          created_at: string
          current_value: number | null
          description: string
          id: string
          recommendation: string | null
          resolved_at: string | null
          severity: string
          status: string
          threshold_value: number | null
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          cecil_aoi_id: string
          created_at?: string
          current_value?: number | null
          description: string
          id?: string
          recommendation?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          threshold_value?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          cecil_aoi_id?: string
          created_at?: string
          current_value?: number | null
          description?: string
          id?: string
          recommendation?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          threshold_value?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cecil_alerts_cecil_aoi_id_fkey"
            columns: ["cecil_aoi_id"]
            isOneToOne: false
            referencedRelation: "cecil_aois"
            referencedColumns: ["id"]
          },
        ]
      }
      cecil_aois: {
        Row: {
          cecil_aoi_id: string | null
          created_at: string
          created_by: string
          error_message: string | null
          external_ref: string
          geometry: Json
          hectares: number | null
          id: string
          name: string
          plot_id: string
          status: string
          updated_at: string
        }
        Insert: {
          cecil_aoi_id?: string | null
          created_at?: string
          created_by: string
          error_message?: string | null
          external_ref: string
          geometry: Json
          hectares?: number | null
          id?: string
          name: string
          plot_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          cecil_aoi_id?: string | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          external_ref?: string
          geometry?: Json
          hectares?: number | null
          id?: string
          name?: string
          plot_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      cecil_data_requests: {
        Row: {
          cecil_aoi_id: string
          cecil_request_id: string | null
          created_at: string
          created_by: string
          dataset_id: string
          dataset_name: string
          error_message: string | null
          external_ref: string | null
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          cecil_aoi_id: string
          cecil_request_id?: string | null
          created_at?: string
          created_by: string
          dataset_id: string
          dataset_name: string
          error_message?: string | null
          external_ref?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          cecil_aoi_id?: string
          cecil_request_id?: string | null
          created_at?: string
          created_by?: string
          dataset_id?: string
          dataset_name?: string
          error_message?: string | null
          external_ref?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cecil_data_requests_cecil_aoi_id_fkey"
            columns: ["cecil_aoi_id"]
            isOneToOne: false
            referencedRelation: "cecil_aois"
            referencedColumns: ["id"]
          },
        ]
      }
      cecil_satellite_data: {
        Row: {
          biomass: number | null
          canopy_cover: number | null
          carbon_capture: number | null
          cecil_aoi_id: string
          cloud_coverage: number | null
          created_at: string
          data_quality: string | null
          dataset_name: string
          day: number | null
          evi: number | null
          forest_change: number | null
          id: string
          measurement_date: string | null
          month: number | null
          msavi: number | null
          ndvi: number | null
          ndwi: number | null
          pixel_boundary: Json | null
          savi: number | null
          transformation_id: string | null
          updated_at: string
          x: number
          y: number
          year: number
        }
        Insert: {
          biomass?: number | null
          canopy_cover?: number | null
          carbon_capture?: number | null
          cecil_aoi_id: string
          cloud_coverage?: number | null
          created_at?: string
          data_quality?: string | null
          dataset_name: string
          day?: number | null
          evi?: number | null
          forest_change?: number | null
          id?: string
          measurement_date?: string | null
          month?: number | null
          msavi?: number | null
          ndvi?: number | null
          ndwi?: number | null
          pixel_boundary?: Json | null
          savi?: number | null
          transformation_id?: string | null
          updated_at?: string
          x: number
          y: number
          year: number
        }
        Update: {
          biomass?: number | null
          canopy_cover?: number | null
          carbon_capture?: number | null
          cecil_aoi_id?: string
          cloud_coverage?: number | null
          created_at?: string
          data_quality?: string | null
          dataset_name?: string
          day?: number | null
          evi?: number | null
          forest_change?: number | null
          id?: string
          measurement_date?: string | null
          month?: number | null
          msavi?: number | null
          ndvi?: number | null
          ndwi?: number | null
          pixel_boundary?: Json | null
          savi?: number | null
          transformation_id?: string | null
          updated_at?: string
          x?: number
          y?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "cecil_satellite_data_cecil_aoi_id_fkey"
            columns: ["cecil_aoi_id"]
            isOneToOne: false
            referencedRelation: "cecil_aois"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cecil_satellite_data_transformation_id_fkey"
            columns: ["transformation_id"]
            isOneToOne: false
            referencedRelation: "cecil_transformations"
            referencedColumns: ["id"]
          },
        ]
      }
      cecil_transformations: {
        Row: {
          cecil_transformation_id: string | null
          created_at: string
          created_by: string
          crs: string
          data_request_id: string
          error_message: string | null
          id: string
          spatial_resolution: number
          status: string
          updated_at: string
        }
        Insert: {
          cecil_transformation_id?: string | null
          created_at?: string
          created_by: string
          crs?: string
          data_request_id: string
          error_message?: string | null
          id?: string
          spatial_resolution?: number
          status?: string
          updated_at?: string
        }
        Update: {
          cecil_transformation_id?: string | null
          created_at?: string
          created_by?: string
          crs?: string
          data_request_id?: string
          error_message?: string | null
          id?: string
          spatial_resolution?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cecil_transformations_data_request_id_fkey"
            columns: ["data_request_id"]
            isOneToOne: false
            referencedRelation: "cecil_data_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      cecil_weather_data: {
        Row: {
          cecil_aoi_id: string
          created_at: string
          data_source: string
          forecast_hours: number | null
          humidity_percent: number | null
          id: string
          measurement_timestamp: string
          precipitation_mm: number | null
          pressure_hpa: number | null
          soil_moisture_percent: number | null
          soil_temperature_celsius: number | null
          solar_radiation_wm2: number | null
          temperature_celsius: number | null
          updated_at: string
          wind_direction_degrees: number | null
          wind_speed_kmh: number | null
        }
        Insert: {
          cecil_aoi_id: string
          created_at?: string
          data_source: string
          forecast_hours?: number | null
          humidity_percent?: number | null
          id?: string
          measurement_timestamp: string
          precipitation_mm?: number | null
          pressure_hpa?: number | null
          soil_moisture_percent?: number | null
          soil_temperature_celsius?: number | null
          solar_radiation_wm2?: number | null
          temperature_celsius?: number | null
          updated_at?: string
          wind_direction_degrees?: number | null
          wind_speed_kmh?: number | null
        }
        Update: {
          cecil_aoi_id?: string
          created_at?: string
          data_source?: string
          forecast_hours?: number | null
          humidity_percent?: number | null
          id?: string
          measurement_timestamp?: string
          precipitation_mm?: number | null
          pressure_hpa?: number | null
          soil_moisture_percent?: number | null
          soil_temperature_celsius?: number | null
          solar_radiation_wm2?: number | null
          temperature_celsius?: number | null
          updated_at?: string
          wind_direction_degrees?: number | null
          wind_speed_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cecil_weather_data_cecil_aoi_id_fkey"
            columns: ["cecil_aoi_id"]
            isOneToOne: false
            referencedRelation: "cecil_aois"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          contract_type: string | null
          created_at: string
          document_name: string
          document_type: string
          document_url: string
          file_size: number | null
          id: string
          investment_id: string | null
          uploaded_by: string | null
          user_id: string
        }
        Insert: {
          contract_type?: string | null
          created_at?: string
          document_name: string
          document_type: string
          document_url: string
          file_size?: number | null
          id?: string
          investment_id?: string | null
          uploaded_by?: string | null
          user_id: string
        }
        Update: {
          contract_type?: string | null
          created_at?: string
          document_name?: string
          document_type?: string
          document_url?: string
          file_size?: number | null
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
      investment_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          establishment_year: number
          id: string
          plant_count: number
          price_per_kg: number
          species_name: string
          status: string
          total_investment: number
          updated_at: string
          user_email: string
          user_id: string
          user_name: string
          user_phone: string | null
          weight_per_plant: number
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          establishment_year: number
          id?: string
          plant_count: number
          price_per_kg: number
          species_name: string
          status?: string
          total_investment: number
          updated_at?: string
          user_email: string
          user_id: string
          user_name: string
          user_phone?: string | null
          weight_per_plant: number
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          establishment_year?: number
          id?: string
          plant_count?: number
          price_per_kg?: number
          species_name?: string
          status?: string
          total_investment?: number
          updated_at?: string
          user_email?: string
          user_id?: string
          user_name?: string
          user_phone?: string | null
          weight_per_plant?: number
        }
        Relationships: []
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
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          title: string
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      plant_prices: {
        Row: {
          created_at: string
          id: string
          price_per_plant: number
          species_id: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          price_per_plant: number
          species_id: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          price_per_plant?: number
          species_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "plant_prices_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "plant_species"
            referencedColumns: ["id"]
          },
        ]
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
          establishment_year: number | null
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
          establishment_year?: number | null
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
          establishment_year?: number | null
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
          password_reset_expires: string | null
          password_reset_token: string | null
          phone: string | null
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
          password_reset_expires?: string | null
          password_reset_token?: string | null
          phone?: string | null
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
          password_reset_expires?: string | null
          password_reset_token?: string | null
          phone?: string | null
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
      bulk_import_users: {
        Args: { users_data: Json }
        Returns: Json
      }
      create_user_with_profile: {
        Args:
          | {
              user_balance?: number
              user_email: string
              user_name: string
              user_role?: Database["public"]["Enums"]["app_role"]
            }
          | {
              user_email: string
              user_name: string
              user_role?: Database["public"]["Enums"]["app_role"]
            }
        Returns: Json
      }
      create_user_with_profile_v2: {
        Args: {
          user_balance?: number
          user_email: string
          user_name: string
          user_role?: Database["public"]["Enums"]["app_role"]
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      request_password_reset: {
        Args: { user_email: string }
        Returns: Json
      }
      send_investment_notification: {
        Args: {
          establishment_year: number
          plant_count: number
          species_name: string
          total_investment: number
          user_email: string
          user_name: string
          user_phone: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "investor" | "demo"
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
      app_role: ["admin", "investor", "demo"],
    },
  },
} as const
