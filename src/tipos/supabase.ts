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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      calificaciones: {
        Row: {
          creado_en: string
          id: string
          mensaje_id: string
          usuario_id: string
          valor: number
        }
        Insert: {
          creado_en?: string
          id?: string
          mensaje_id: string
          usuario_id?: string
          valor: number
        }
        Update: {
          creado_en?: string
          id?: string
          mensaje_id?: string
          usuario_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "calificaciones_mensaje_id_fkey"
            columns: ["mensaje_id"]
            isOneToOne: true
            referencedRelation: "mensajes"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          creado_en: string
          id: string
          nombre: string
          usuario_id: string | null
        }
        Insert: {
          creado_en?: string
          id?: string
          nombre: string
          usuario_id?: string | null
        }
        Update: {
          creado_en?: string
          id?: string
          nombre?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      cotizaciones: {
        Row: {
          fecha: string
          fuente: string
          id: string
          moneda_base: string
          obtenida_en: string
          tasas: Json
          usuario_id: string
        }
        Insert: {
          fecha: string
          fuente: string
          id?: string
          moneda_base: string
          obtenida_en?: string
          tasas: Json
          usuario_id?: string
        }
        Update: {
          fecha?: string
          fuente?: string
          id?: string
          moneda_base?: string
          obtenida_en?: string
          tasas?: Json
          usuario_id?: string
        }
        Relationships: []
      }
      gastos: {
        Row: {
          categoria_id: string
          cotizacion: number
          creado_en: string
          descripcion: string
          fecha_cotizacion: string
          fecha_gasto: string
          id: string
          moneda_original: string
          monto_convertido: number
          monto_original: number
          usuario_id: string
          viaje_id: string
        }
        Insert: {
          categoria_id: string
          cotizacion: number
          creado_en?: string
          descripcion: string
          fecha_cotizacion: string
          fecha_gasto: string
          id?: string
          moneda_original: string
          monto_convertido: number
          monto_original: number
          usuario_id?: string
          viaje_id: string
        }
        Update: {
          categoria_id?: string
          cotizacion?: number
          creado_en?: string
          descripcion?: string
          fecha_cotizacion?: string
          fecha_gasto?: string
          id?: string
          moneda_original?: string
          monto_convertido?: number
          monto_original?: number
          usuario_id?: string
          viaje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gastos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gastos_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: false
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      mensajes: {
        Row: {
          contenido: string
          creado_en: string
          id: string
          llamadas_tools: Json
          modelo: string | null
          rol: string
          tokens_entrada: number | null
          tokens_salida: number | null
          usuario_id: string
          viaje_id: string
        }
        Insert: {
          contenido: string
          creado_en?: string
          id?: string
          llamadas_tools?: Json
          modelo?: string | null
          rol: string
          tokens_entrada?: number | null
          tokens_salida?: number | null
          usuario_id?: string
          viaje_id: string
        }
        Update: {
          contenido?: string
          creado_en?: string
          id?: string
          llamadas_tools?: Json
          modelo?: string | null
          rol?: string
          tokens_entrada?: number | null
          tokens_salida?: number | null
          usuario_id?: string
          viaje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensajes_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: false
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      presupuestos_viaje: {
        Row: {
          categoria_id: string
          creado_en: string
          id: string
          monto_estimado: number
          supuestos: string | null
          viaje_id: string
        }
        Insert: {
          categoria_id: string
          creado_en?: string
          id?: string
          monto_estimado: number
          supuestos?: string | null
          viaje_id: string
        }
        Update: {
          categoria_id?: string
          creado_en?: string
          id?: string
          monto_estimado?: number
          supuestos?: string | null
          viaje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presupuestos_viaje_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuestos_viaje_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: false
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      resumenes_viaje: {
        Row: {
          cotizaciones_cierre: Json
          creado_en: string
          estadisticas: Json
          resumen: string | null
          viaje_id: string
        }
        Insert: {
          cotizaciones_cierre: Json
          creado_en?: string
          estadisticas: Json
          resumen?: string | null
          viaje_id: string
        }
        Update: {
          cotizaciones_cierre?: Json
          creado_en?: string
          estadisticas?: Json
          resumen?: string | null
          viaje_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resumenes_viaje_viaje_id_fkey"
            columns: ["viaje_id"]
            isOneToOne: true
            referencedRelation: "viajes"
            referencedColumns: ["id"]
          },
        ]
      }
      viajes: {
        Row: {
          creado_en: string
          destino: string
          estado: string
          fecha_fin: string
          fecha_inicio: string
          id: string
          moneda_base: string
          nombre: string
          presupuesto_total: number | null
          usuario_id: string
        }
        Insert: {
          creado_en?: string
          destino: string
          estado?: string
          fecha_fin: string
          fecha_inicio: string
          id?: string
          moneda_base: string
          nombre: string
          presupuesto_total?: number | null
          usuario_id?: string
        }
        Update: {
          creado_en?: string
          destino?: string
          estado?: string
          fecha_fin?: string
          fecha_inicio?: string
          id?: string
          moneda_base?: string
          nombre?: string
          presupuesto_total?: number | null
          usuario_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cerrar_viaje: {
        Args: {
          p_cotizaciones_cierre: Json
          p_estadisticas: Json
          p_gastos_ids: string[]
          p_resumen: string
          p_viaje_id: string
        }
        Returns: undefined
      }
      reabrir_viaje: { Args: { p_viaje_id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
