export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string
          stripe_customer_id: string | null
        }
        Insert: {
          id: string
          stripe_customer_id?: string | null
        }
        Update: {
          id?: string
          stripe_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      content_posts: {
        Row: {
          id: string
          title: string | null
          slug: string | null
          cover_image_url: string | null
          meta_description: string | null
          meta_title: string | null
          body_html: string | null
          status: string | null
          published_at: string | null
          faq: Json | null
          scholarship_links: Json | null
          related_article_links: Json | null
          related_scholarships: Json | null
          article_match_diagnostics: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title?: string | null
          slug?: string | null
          cover_image_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          body_html?: string | null
          status?: string | null
          published_at?: string | null
          faq?: Json | null
          scholarship_links?: Json | null
          related_article_links?: Json | null
          related_scholarships?: Json | null
          article_match_diagnostics?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string | null
          slug?: string | null
          cover_image_url?: string | null
          meta_description?: string | null
          meta_title?: string | null
          body_html?: string | null
          status?: string | null
          published_at?: string | null
          faq?: Json | null
          scholarship_links?: Json | null
          related_article_links?: Json | null
          related_scholarships?: Json | null
          article_match_diagnostics?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      prices: {
        Row: {
          active: boolean | null
          currency: string | null
          id: string
          interval: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count: number | null
          product_id: string | null
          trial_period_days: number | null
          type: Database["public"]["Enums"]["pricing_type"] | null
          unit_amount: number | null
        }
        Insert: {
          active?: boolean | null
          currency?: string | null
          id: string
          interval?: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count?: number | null
          product_id?: string | null
          trial_period_days?: number | null
          type?: Database["public"]["Enums"]["pricing_type"] | null
          unit_amount?: number | null
        }
        Update: {
          active?: boolean | null
          currency?: string | null
          id?: string
          interval?: Database["public"]["Enums"]["pricing_plan_interval"] | null
          interval_count?: number | null
          product_id?: string | null
          trial_period_days?: number | null
          type?: Database["public"]["Enums"]["pricing_type"] | null
          unit_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          avatar_url: string | null
          birth_day: number | null
          birth_month: string | null
          birth_year: number | null
          citizenship_status: string | null
          citizenship_status_label: string | null
          city: string | null
          country_code: string | null
          created_at: string
          date_of_birth: string | null
          email_verified: boolean
          field_of_study: string | null
          field_of_study_label: string | null
          first_name: string | null
          gpa: number | string | null
          is_subscribed: boolean
          last_name: string | null
          onboarding_completed: boolean | null
          school_level: string | null
          school_level_label: string | null
          state_region: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          avatar_url?: string | null
          birth_day?: number | null
          birth_month?: string | null
          birth_year?: number | null
          citizenship_status?: string | null
          citizenship_status_label?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          date_of_birth?: string | null
          email_verified?: boolean
          field_of_study?: string | null
          field_of_study_label?: string | null
          first_name?: string | null
          gpa?: number | string | null
          is_subscribed?: boolean
          last_name?: string | null
          onboarding_completed?: boolean | null
          school_level?: string | null
          school_level_label?: string | null
          state_region?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          avatar_url?: string | null
          birth_day?: number | null
          birth_month?: string | null
          birth_year?: number | null
          citizenship_status?: string | null
          citizenship_status_label?: string | null
          city?: string | null
          country_code?: string | null
          created_at?: string
          date_of_birth?: string | null
          email_verified?: boolean
          field_of_study?: string | null
          field_of_study_label?: string | null
          first_name?: string | null
          gpa?: number | string | null
          is_subscribed?: boolean
          last_name?: string | null
          onboarding_completed?: boolean | null
          school_level?: string | null
          school_level_label?: string | null
          state_region?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      providers: {
        Row: {
          id: string
          slug: string
          display_name: string
          official_url: string | null
          state: string | null
          ai_description: string | null
          ai_sources: Json
          ai_faq: Json
          is_enriched: boolean
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          slug: string
          display_name: string
          official_url?: string | null
          state?: string | null
          ai_description?: string | null
          ai_sources?: Json
          ai_faq?: Json
          is_enriched?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          slug?: string
          display_name?: string
          official_url?: string | null
          state?: string | null
          ai_description?: string | null
          ai_sources?: Json
          ai_faq?: Json
          is_enriched?: boolean
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      scholarships: {
        Row: {
          id: string
          source: string | null
          source_id: string | null
          url: string | null
          title: string | null
          provider_name: string | null
          provider_url: string | null
          provider_mission: string | null
          award_amount_text: string | null
          award_amount_min: number | null
          award_amount_max: number | null
          currency: string | null
          deadline_text: string | null
          deadline_date: string | null
          requirements_count: number | null
          requirements_text: string | null
          applicants_count: number | null
          credibility_score_text: string | null
          is_verified: boolean | null
          is_recurring: boolean | null
          winner_payment_text: string | null
          description: string | null
          provider_social_facebook: string | null
          provider_social_instagram: string | null
          provider_social_linkedin: string | null
          apply_url: string | null
          apply_button_text: string | null
          application_status_text: string | null
          mark_started_available: boolean | null
          mark_submitted_available: boolean | null
          status_text: string | null
          institutions_text: string | null
          state_territory_text: string | null
          support_email: string | null
          support_phone: string | null
          eligibility_text: string | null
          awards_text: string | null
          notification_text: string | null
          selection_criteria_text: string | null
          description_html: string | null
          eligibility_html: string | null
          awards_html: string | null
          notification_html: string | null
          payment_html: string | null
          requirements_html: string | null
          selection_criteria_html: string | null
          full_content_html: string | null
          slug: string | null
          provider_slug: string | null
          scholarship_status: string | null
          days_until_deadline: number | null
          deadline_bucket: string | null
          award_amount_numeric_sort: number | null
          payout_method: string | null
          credibility_score: number | null
          credibility_bucket: string | null
          ranking_score: number | null
          requirement_types: Json
          requirement_signals_count: number | null
          essay_required: boolean
          document_required: boolean
          photo_required: boolean
          video_required: boolean
          link_required: boolean
          survey_required: boolean
          question_required: boolean
          goal_required: boolean
          special_eligibility_required: boolean
          transcript_required: boolean
          recommendation_required: boolean
          financial_need_considered: boolean
          study_levels: Json
          field_of_study: Json
          citizenship_statuses: Json
          location_scope: string | null
          state_codes: Json
          institution_types: Json
          number_of_awards: number | null
          summary_short: string | null
          summary_long: string | null
          who_can_apply: string | null
          notification_details: string | null
          payment_details: string | null
          documents_required: Json | null
          requirements_text_clean: string | null
          official_source_name: string | null
          last_verified_at: string | null
          is_indexable: boolean
          category: string | null
          category_slug: string | null
          tags: Json | null
          is_active: boolean | null
          text_fingerprint: string | null
          raw_data: Json | null
          last_seen_at: string | null
          created_at: string | null
          updated_at: string | null
          ai_student_summary: string | null
          ai_best_for: Json | null
          ai_key_highlights: Json | null
          ai_eligibility_summary: Json | null
          ai_important_checks: Json | null
          ai_application_tips: Json | null
          ai_why_apply: Json | null
          ai_red_flags: Json | null
          ai_missing_info: Json | null
          ai_urgency_level: string | null
          ai_difficulty_level: string | null
          ai_match_score: number | null
          ai_match_band: string | null
          ai_score_explanation: string | null
          ai_confidence_score: number | null
          seo_excerpt: string | null
          seo_overview: string | null
          seo_eligibility: string | null
          seo_application: string | null
          seo_faq: Json | null
          eligibility_tags: Json | null
          catalog_education_levels: Json | null
          gpa_requirement_min: number | null
          gpa_bucket: string | null
          easy_apply_flags: Json | null
          location_tags: Json | null
          seo_tags: string[]
          listing_completeness_score: number | null
          listing_completeness_bucket: string | null
          applicants_count_is_estimated: boolean | null
        }
        Insert: {
          id?: string
          source?: string | null
          source_id?: string | null
          url?: string | null
          title?: string | null
          provider_name?: string | null
          provider_url?: string | null
          provider_mission?: string | null
          award_amount_text?: string | null
          award_amount_min?: number | null
          award_amount_max?: number | null
          currency?: string | null
          deadline_text?: string | null
          deadline_date?: string | null
          requirements_count?: number | null
          requirements_text?: string | null
          applicants_count?: number | null
          credibility_score_text?: string | null
          is_verified?: boolean | null
          is_recurring?: boolean | null
          winner_payment_text?: string | null
          description?: string | null
          provider_social_facebook?: string | null
          provider_social_instagram?: string | null
          provider_social_linkedin?: string | null
          apply_url?: string | null
          apply_button_text?: string | null
          application_status_text?: string | null
          mark_started_available?: boolean | null
          mark_submitted_available?: boolean | null
          status_text?: string | null
          institutions_text?: string | null
          state_territory_text?: string | null
          support_email?: string | null
          support_phone?: string | null
          eligibility_text?: string | null
          awards_text?: string | null
          notification_text?: string | null
          selection_criteria_text?: string | null
          description_html?: string | null
          eligibility_html?: string | null
          awards_html?: string | null
          notification_html?: string | null
          payment_html?: string | null
          requirements_html?: string | null
          selection_criteria_html?: string | null
          full_content_html?: string | null
          slug?: string | null
          provider_slug?: string | null
          scholarship_status?: string | null
          days_until_deadline?: number | null
          deadline_bucket?: string | null
          award_amount_numeric_sort?: number | null
          payout_method?: string | null
          credibility_score?: number | null
          credibility_bucket?: string | null
          ranking_score?: number | null
          requirement_types?: Json
          requirement_signals_count?: number | null
          essay_required?: boolean | null
          document_required?: boolean | null
          photo_required?: boolean | null
          video_required?: boolean | null
          link_required?: boolean | null
          survey_required?: boolean | null
          question_required?: boolean | null
          goal_required?: boolean | null
          special_eligibility_required?: boolean | null
          transcript_required?: boolean | null
          recommendation_required?: boolean | null
          financial_need_considered?: boolean | null
          study_levels?: Json
          field_of_study?: Json
          citizenship_statuses?: Json
          location_scope?: string | null
          state_codes?: Json
          institution_types?: Json
          number_of_awards?: number | null
          summary_short?: string | null
          summary_long?: string | null
          who_can_apply?: string | null
          notification_details?: string | null
          payment_details?: string | null
          documents_required?: Json | null
          requirements_text_clean?: string | null
          official_source_name?: string | null
          last_verified_at?: string | null
          is_indexable?: boolean | null
          category?: string | null
          category_slug?: string | null
          tags?: Json | null
          is_active?: boolean | null
          text_fingerprint?: string | null
          raw_data?: Json | null
          last_seen_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          ai_student_summary?: string | null
          ai_best_for?: Json | null
          ai_key_highlights?: Json | null
          ai_eligibility_summary?: Json | null
          ai_important_checks?: Json | null
          ai_application_tips?: Json | null
          ai_why_apply?: Json | null
          ai_red_flags?: Json | null
          ai_missing_info?: Json | null
          ai_urgency_level?: string | null
          ai_difficulty_level?: string | null
          ai_match_score?: number | null
          ai_match_band?: string | null
          ai_score_explanation?: string | null
          ai_confidence_score?: number | null
          seo_excerpt?: string | null
          seo_overview?: string | null
          seo_eligibility?: string | null
          seo_application?: string | null
          seo_faq?: Json | null
          eligibility_tags?: Json | null
          catalog_education_levels?: Json | null
          gpa_requirement_min?: number | null
          gpa_bucket?: string | null
          easy_apply_flags?: Json | null
          location_tags?: Json | null
          seo_tags?: string[]
          listing_completeness_score?: number | null
          listing_completeness_bucket?: string | null
          applicants_count_is_estimated?: boolean | null
        }
        Update: {
          id?: string
          source?: string | null
          source_id?: string | null
          url?: string | null
          title?: string | null
          provider_name?: string | null
          provider_url?: string | null
          provider_mission?: string | null
          award_amount_text?: string | null
          award_amount_min?: number | null
          award_amount_max?: number | null
          currency?: string | null
          deadline_text?: string | null
          deadline_date?: string | null
          requirements_count?: number | null
          requirements_text?: string | null
          applicants_count?: number | null
          credibility_score_text?: string | null
          is_verified?: boolean | null
          is_recurring?: boolean | null
          winner_payment_text?: string | null
          description?: string | null
          provider_social_facebook?: string | null
          provider_social_instagram?: string | null
          provider_social_linkedin?: string | null
          apply_url?: string | null
          apply_button_text?: string | null
          application_status_text?: string | null
          mark_started_available?: boolean | null
          mark_submitted_available?: boolean | null
          status_text?: string | null
          institutions_text?: string | null
          state_territory_text?: string | null
          support_email?: string | null
          support_phone?: string | null
          eligibility_text?: string | null
          awards_text?: string | null
          notification_text?: string | null
          selection_criteria_text?: string | null
          description_html?: string | null
          eligibility_html?: string | null
          awards_html?: string | null
          notification_html?: string | null
          payment_html?: string | null
          requirements_html?: string | null
          selection_criteria_html?: string | null
          full_content_html?: string | null
          slug?: string | null
          provider_slug?: string | null
          scholarship_status?: string | null
          days_until_deadline?: number | null
          deadline_bucket?: string | null
          award_amount_numeric_sort?: number | null
          payout_method?: string | null
          credibility_score?: number | null
          credibility_bucket?: string | null
          ranking_score?: number | null
          requirement_types?: Json
          requirement_signals_count?: number | null
          essay_required?: boolean | null
          document_required?: boolean | null
          photo_required?: boolean | null
          video_required?: boolean | null
          link_required?: boolean | null
          survey_required?: boolean | null
          question_required?: boolean | null
          goal_required?: boolean | null
          special_eligibility_required?: boolean | null
          transcript_required?: boolean | null
          recommendation_required?: boolean | null
          financial_need_considered?: boolean | null
          study_levels?: Json
          field_of_study?: Json
          citizenship_statuses?: Json
          location_scope?: string | null
          state_codes?: Json
          institution_types?: Json
          number_of_awards?: number | null
          summary_short?: string | null
          summary_long?: string | null
          who_can_apply?: string | null
          notification_details?: string | null
          payment_details?: string | null
          documents_required?: Json | null
          requirements_text_clean?: string | null
          official_source_name?: string | null
          last_verified_at?: string | null
          is_indexable?: boolean | null
          category?: string | null
          category_slug?: string | null
          tags?: Json | null
          is_active?: boolean | null
          text_fingerprint?: string | null
          raw_data?: Json | null
          last_seen_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          ai_student_summary?: string | null
          ai_best_for?: Json | null
          ai_key_highlights?: Json | null
          ai_eligibility_summary?: Json | null
          ai_important_checks?: Json | null
          ai_application_tips?: Json | null
          ai_why_apply?: Json | null
          ai_red_flags?: Json | null
          ai_missing_info?: Json | null
          ai_urgency_level?: string | null
          ai_difficulty_level?: string | null
          ai_match_score?: number | null
          ai_match_band?: string | null
          ai_score_explanation?: string | null
          ai_confidence_score?: number | null
          seo_excerpt?: string | null
          seo_overview?: string | null
          seo_eligibility?: string | null
          seo_application?: string | null
          seo_faq?: Json | null
          eligibility_tags?: Json | null
          catalog_education_levels?: Json | null
          gpa_requirement_min?: number | null
          gpa_bucket?: string | null
          easy_apply_flags?: Json | null
          location_tags?: Json | null
          seo_tags?: string[]
          listing_completeness_score?: number | null
          listing_completeness_bucket?: string | null
          applicants_count_is_estimated?: boolean | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          slug: string
          label: string
          level: number
          parent_id: string | null
          sort_order: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          label: string
          level: number
          parent_id?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          label?: string
          level?: number
          parent_id?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      scholarship_categories: {
        Row: {
          scholarship_id: string
          category_id: string
          is_primary: boolean
          source: string | null
          created_at: string
        }
        Insert: {
          scholarship_id: string
          category_id: string
          is_primary?: boolean
          source?: string | null
          created_at?: string
        }
        Update: {
          scholarship_id?: string
          category_id?: string
          is_primary?: boolean
          source?: string | null
          created_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean | null
          description: string | null
          id: string
          image: string | null
          metadata: Json | null
          name: string | null
        }
        Insert: {
          active?: boolean | null
          description?: string | null
          id: string
          image?: string | null
          metadata?: Json | null
          name?: string | null
        }
        Update: {
          active?: boolean | null
          description?: string | null
          id?: string
          image?: string | null
          metadata?: Json | null
          name?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at: string | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created: string
          current_period_end: string
          current_period_start: string
          ended_at: string | null
          id: string
          metadata: Json | null
          price_id: string | null
          quantity: number | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          trial_end: string | null
          trial_start: string | null
          user_id: string
        }
        Insert: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created?: string
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          id: string
          metadata?: Json | null
          price_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          trial_start?: string | null
          user_id: string
        }
        Update: {
          cancel_at?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created?: string
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          price_id?: string | null
          quantity?: number | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          trial_end?: string | null
          trial_start?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_price_id_fkey"
            columns: ["price_id"]
            isOneToOne: false
            referencedRelation: "prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          billing_address: Json | null
          full_name: string | null
          id: string
          payment_method: Json | null
        }
        Insert: {
          avatar_url?: string | null
          billing_address?: Json | null
          full_name?: string | null
          id: string
          payment_method?: Json | null
        }
        Update: {
          avatar_url?: string | null
          billing_address?: Json | null
          full_name?: string | null
          id?: string
          payment_method?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      provider_hub_listing: {
        Row: {
          slug: string
          display_name: string | null
          scholarship_count: number
          state: string | null
          ai_description: string | null
        }
        Insert: {
          [_ in never]: never
        }
        Update: {
          [_ in never]: never
        }
        Relationships: []
      }
      provider_scholarship_stats: {
        Row: {
          slug: string
          display_name: string | null
          scholarship_count: number
        }
        Insert: {
          [_ in never]: never
        }
        Update: {
          [_ in never]: never
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      pricing_plan_interval: "day" | "week" | "month" | "year"
      pricing_type: "one_time" | "recurring"
      subscription_status:
        | "trialing"
        | "active"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "past_due"
        | "unpaid"
        | "paused"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never

