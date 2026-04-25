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
      anonymous_visitor_first_touch: {
        Row: {
          id: string
          visitor_id: string
          landing_url: string
          click_id: string | null
          referrer: string | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          utm_content: string | null
          traffic_channel: string | null
          is_likely_bot: boolean
          user_agent_snapshot: string | null
          created_at: string
        }
        Insert: {
          id?: string
          visitor_id: string
          landing_url: string
          click_id?: string | null
          referrer?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          traffic_channel?: string | null
          is_likely_bot?: boolean
          user_agent_snapshot?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          visitor_id?: string
          landing_url?: string
          click_id?: string | null
          referrer?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          traffic_channel?: string | null
          is_likely_bot?: boolean
          user_agent_snapshot?: string | null
          created_at?: string
        }
        Relationships: []
      },
      weekly_free_digest_sent: {
        Row: {
          id: string
          user_id: string
          week_start_monday_et: string
          match_count: number
          grant_ids: string[]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          week_start_monday_et: string
          match_count?: number
          grant_ids?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          week_start_monday_et?: string
          match_count?: number
          grant_ids?: string[]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_free_digest_sent_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      google_indexing_queue: {
        Row: {
          id: string
          url: string
          added_at: string
          status: string
          notification_type: string
          content_kind: string | null
          source: string | null
          attempt_count: number
          last_error: string | null
        }
        Insert: {
          id?: string
          url: string
          added_at?: string
          status?: string
          notification_type?: string
          content_kind?: string | null
          source?: string | null
          attempt_count?: number
          last_error?: string | null
        }
        Update: {
          id?: string
          url?: string
          added_at?: string
          status?: string
          notification_type?: string
          content_kind?: string | null
          source?: string | null
          attempt_count?: number
          last_error?: string | null
        }
        Relationships: []
      },
      google_indexing_daily_usage: {
        Row: {
          usage_date: string
          publish_count: number
        }
        Insert: {
          usage_date: string
          publish_count?: number
        }
        Update: {
          usage_date?: string
          publish_count?: number
        }
        Relationships: []
      },
      seo_page_inspection_queue: {
        Row: {
          id: string
          url: string
          source: string | null
          status: string
          added_at: string
          updated_at: string
          next_check_at: string
          last_checked_at: string | null
          attempt_count: number
          last_verdict: string | null
          last_coverage_state: string | null
          last_error: string | null
        }
        Insert: {
          id?: string
          url: string
          source?: string | null
          status?: string
          added_at?: string
          updated_at?: string
          next_check_at?: string
          last_checked_at?: string | null
          attempt_count?: number
          last_verdict?: string | null
          last_coverage_state?: string | null
          last_error?: string | null
        }
        Update: {
          id?: string
          url?: string
          source?: string | null
          status?: string
          added_at?: string
          updated_at?: string
          next_check_at?: string
          last_checked_at?: string | null
          attempt_count?: number
          last_verdict?: string | null
          last_coverage_state?: string | null
          last_error?: string | null
        }
        Relationships: []
      },
      onboarding_oauth_pending: {
        Row: {
          token: string
          draft: Json
          created_at: string
          expires_at: string
        }
        Insert: {
          token: string
          draft: Json
          created_at?: string
          expires_at: string
        }
        Update: {
          token?: string
          draft?: Json
          created_at?: string
          expires_at?: string
        }
        Relationships: []
      },
      grant_notification_deliveries: {
        Row: {
          id: string
          user_id: string
          scholarship_id: string
          channel: string
          medium: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          scholarship_id: string
          channel: string
          medium: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          scholarship_id?: string
          channel?: string
          medium?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grant_notification_deliveries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grant_notification_deliveries_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["id"]
          }
        ]
      },
      user_saved_scholarships: {
        Row: {
          user_id: string
          scholarship_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          scholarship_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          scholarship_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_saved_scholarships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_saved_scholarships_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["id"]
          }
        ]
      },
      scholarship_admin_notify_config: {
        Row: {
          id: number
          endpoint_url: string
          bearer_token: string
        }
        Insert: {
          id?: number
          endpoint_url?: string
          bearer_token?: string
        }
        Update: {
          id?: number
          endpoint_url?: string
          bearer_token?: string
        }
        Relationships: []
      },
      scholarship_essays: {
        Row: {
          scholarship_id: string
          essay_id: string
        }
        Insert: {
          scholarship_id: string
          essay_id: string
        }
        Update: {
          scholarship_id?: string
          essay_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scholarship_essays_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scholarship_essays_essay_id_fkey"
            columns: ["essay_id"]
            isOneToOne: false
            referencedRelation: "essays"
            referencedColumns: ["id"]
          }
        ]
      },
      telegram_resource_notify_config: {
        Row: {
          id: number
          endpoint_url: string
          bearer_token: string
        }
        Insert: {
          id?: number
          endpoint_url?: string
          bearer_token?: string
        }
        Update: {
          id?: number
          endpoint_url?: string
          bearer_token?: string
        }
        Relationships: []
      },
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
      essay_chats: {
        Row: {
          id: string
          user_id: string
          messages: Json
          progress: Json
          ready_to_generate: boolean
          scholarship_title: string | null
          mentor_interview_started: boolean
          mentor_profile_prompt_sent: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          messages?: Json
          progress?: Json
          ready_to_generate?: boolean
          scholarship_title?: string | null
          mentor_interview_started?: boolean
          mentor_profile_prompt_sent?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          messages?: Json
          progress?: Json
          ready_to_generate?: boolean
          scholarship_title?: string | null
          mentor_interview_started?: boolean
          mentor_profile_prompt_sent?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "essay_chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      essay_generation_queue: {
        Row: {
          id: string
          scholarship_id: string
          status: string
          error_message: string | null
          created_essay_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          scholarship_id: string
          status?: string
          error_message?: string | null
          created_essay_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          scholarship_id?: string
          status?: string
          error_message?: string | null
          created_essay_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "essay_generation_queue_scholarship_id_fkey"
            columns: ["scholarship_id"]
            isOneToOne: false
            referencedRelation: "scholarships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "essay_generation_queue_created_essay_id_fkey"
            columns: ["created_essay_id"]
            isOneToOne: false
            referencedRelation: "essays"
            referencedColumns: ["id"]
          }
        ]
      }
      essays: {
        Row: {
          id: string
          slug: string
          title: string
          content_html: string
          hero_image_url: string | null
          hero_is_real: boolean
          hero_variant_index: number | null
          sources: Json
          faq: Json
          meta_description: string | null
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          content_html?: string
          hero_image_url?: string | null
          hero_is_real?: boolean
          hero_variant_index?: number | null
          sources?: Json
          faq?: Json
          meta_description?: string | null
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          content_html?: string
          hero_image_url?: string | null
          hero_is_real?: boolean
          hero_variant_index?: number | null
          sources?: Json
          faq?: Json
          meta_description?: string | null
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      essay_results: {
        Row: {
          id: string
          user_id: string
          response_id: string | null
          essay_chat_id: string | null
          content: string
          version: number
          grinder_notes: string | null
          draft_quality_tier: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          response_id?: string | null
          essay_chat_id?: string | null
          content: string
          version?: number
          grinder_notes?: string | null
          draft_quality_tier?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          response_id?: string | null
          essay_chat_id?: string | null
          content?: string
          version?: number
          grinder_notes?: string | null
          draft_quality_tier?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "essay_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "essay_results_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_responses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "essay_results_essay_chat_id_fkey"
            columns: ["essay_chat_id"]
            isOneToOne: false
            referencedRelation: "essay_chats"
            referencedColumns: ["id"]
          }
        ]
      }
      questionnaire_responses: {
        Row: {
          id: string
          user_id: string
          stage1_data: Json | null
          stage2_data: Json | null
          stage3_data: Json | null
          stage4_data: Json | null
          rubric_weights: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stage1_data?: Json | null
          stage2_data?: Json | null
          stage3_data?: Json | null
          stage4_data?: Json | null
          rubric_weights?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stage1_data?: Json | null
          stage2_data?: Json | null
          stage3_data?: Json | null
          stage4_data?: Json | null
          rubric_weights?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
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
          cover_image_source_url: string | null
          cover_image_source_type: string | null
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
          cover_image_source_url?: string | null
          cover_image_source_type?: string | null
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
          cover_image_source_url?: string | null
          cover_image_source_type?: string | null
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
          email_weekly_free_digest: boolean
          email_notify_best_matches: boolean
          email_notify_easy_apply: boolean
          email_notify_hot_deadlines: boolean
          email_notify_saved_filters: boolean
          saved_filters_snapshot: Json | null
          saved_filter_presets: Json | null
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
          subscription_debug_now: string | null
          subscription_debug_plan: string | null
          subscription_debug_renews_at: string | null
          subscription_debug_status: string | null
          subscription_debug_trial_ends_at: string | null
          subscription_plan: string
          trial_quota_ai_check_used: number
          trial_quota_chat_turns_used: number
          trial_quota_humanize_draft_used: number
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
          email_weekly_free_digest?: boolean
          email_notify_best_matches?: boolean
          email_notify_easy_apply?: boolean
          email_notify_hot_deadlines?: boolean
          email_notify_saved_filters?: boolean
          saved_filters_snapshot?: Json | null
          saved_filter_presets?: Json | null
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
          subscription_debug_now?: string | null
          subscription_debug_plan?: string | null
          subscription_debug_renews_at?: string | null
          subscription_debug_status?: string | null
          subscription_debug_trial_ends_at?: string | null
          subscription_plan?: string
          trial_quota_ai_check_used?: number
          trial_quota_chat_turns_used?: number
          trial_quota_humanize_draft_used?: number
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
          email_weekly_free_digest?: boolean
          email_notify_best_matches?: boolean
          email_notify_easy_apply?: boolean
          email_notify_hot_deadlines?: boolean
          email_notify_saved_filters?: boolean
          saved_filters_snapshot?: Json | null
          saved_filter_presets?: Json | null
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
          subscription_debug_now?: string | null
          subscription_debug_plan?: string | null
          subscription_debug_renews_at?: string | null
          subscription_debug_status?: string | null
          subscription_debug_trial_ends_at?: string | null
          subscription_plan?: string
          trial_quota_ai_check_used?: number
          trial_quota_chat_turns_used?: number
          trial_quota_humanize_draft_used?: number
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
      telegram_event_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          related_user_id: string | null
          telegram_chat_id: number | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          related_user_id?: string | null
          telegram_chat_id?: number | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          related_user_id?: string | null
          telegram_chat_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_event_logs_related_user_id_fkey"
            columns: ["related_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      telegram_link_codes: {
        Row: {
          app_user_id: string | null
          attempts: number
          code_hash: string
          created_at: string
          email: string
          expires_at: string
          id: string
          telegram_user_uuid: string
          updated_at: string
          used_at: string | null
        }
        Insert: {
          app_user_id?: string | null
          attempts?: number
          code_hash: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          telegram_user_uuid: string
          updated_at?: string
          used_at?: string | null
        }
        Update: {
          app_user_id?: string | null
          attempts?: number
          code_hash?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          telegram_user_uuid?: string
          updated_at?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_link_codes_app_user_id_fkey"
            columns: ["app_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_link_codes_telegram_user_uuid_fkey"
            columns: ["telegram_user_uuid"]
            isOneToOne: false
            referencedRelation: "telegram_users"
            referencedColumns: ["id"]
          }
        ]
      }
      telegram_users: {
        Row: {
          admin_notification_prefs: Json
          app_user_id: string | null
          created_at: string
          id: string
          is_admin: boolean
          last_bot_started_at: string | null
          last_interaction_at: string
          last_state: string
          notifications_enabled: boolean
          notify_best_matches: boolean
          notify_easy_apply: boolean
          notify_hot_deadlines: boolean
          notify_saved_filters: boolean
          pending_email: string | null
          telegram_chat_id: number
          telegram_first_name: string | null
          telegram_last_name: string | null
          telegram_user_id: number
          telegram_username: string | null
          updated_at: string
        }
        Insert: {
          admin_notification_prefs?: Json
          app_user_id?: string | null
          created_at?: string
          id?: string
          is_admin?: boolean
          last_bot_started_at?: string | null
          last_interaction_at?: string
          last_state?: string
          notifications_enabled?: boolean
          notify_best_matches?: boolean
          notify_easy_apply?: boolean
          notify_hot_deadlines?: boolean
          notify_saved_filters?: boolean
          pending_email?: string | null
          telegram_chat_id: number
          telegram_first_name?: string | null
          telegram_last_name?: string | null
          telegram_user_id: number
          telegram_username?: string | null
          updated_at?: string
        }
        Update: {
          admin_notification_prefs?: Json
          app_user_id?: string | null
          created_at?: string
          id?: string
          is_admin?: boolean
          last_bot_started_at?: string | null
          last_interaction_at?: string
          last_state?: string
          notifications_enabled?: boolean
          notify_best_matches?: boolean
          notify_easy_apply?: boolean
          notify_hot_deadlines?: boolean
          notify_saved_filters?: boolean
          pending_email?: string | null
          telegram_chat_id?: number
          telegram_first_name?: string | null
          telegram_last_name?: string | null
          telegram_user_id?: number
          telegram_username?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_users_app_user_id_fkey"
            columns: ["app_user_id"]
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
      institutions: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          city: string | null
          state: string | null
          country: string | null
          website_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          website_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          city?: string | null
          state?: string | null
          country?: string | null
          website_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      compare_pages: {
        Row: {
          id: string
          slug: string
          inst_a_id: string
          inst_b_id: string
          content_json: Json
          ai_verdict: string | null
          meta_title: string | null
          meta_description: string | null
          created_at: string
          updated_at: string
          status: string
        }
        Insert: {
          id?: string
          slug: string
          inst_a_id: string
          inst_b_id: string
          content_json?: Json
          ai_verdict?: string | null
          meta_title?: string | null
          meta_description?: string | null
          created_at?: string
          updated_at?: string
          status?: string
        }
        Update: {
          id?: string
          slug?: string
          inst_a_id?: string
          inst_b_id?: string
          content_json?: Json
          ai_verdict?: string | null
          meta_title?: string | null
          meta_description?: string | null
          created_at?: string
          updated_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "compare_pages_inst_a_id_fkey"
            columns: ["inst_a_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compare_pages_inst_b_id_fkey"
            columns: ["inst_b_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          }
        ]
      }
      state_compare_pages: {
        Row: {
          id: string
          slug: string
          state_a_code: string
          state_b_code: string
          content_json: Json
          ai_verdict: string | null
          meta_title: string | null
          meta_description: string | null
          created_at: string
          updated_at: string
          status: string
        }
        Insert: {
          id?: string
          slug: string
          state_a_code: string
          state_b_code: string
          content_json?: Json
          ai_verdict?: string | null
          meta_title?: string | null
          meta_description?: string | null
          created_at?: string
          updated_at?: string
          status?: string
        }
        Update: {
          id?: string
          slug?: string
          state_a_code?: string
          state_b_code?: string
          content_json?: Json
          ai_verdict?: string | null
          meta_title?: string | null
          meta_description?: string | null
          created_at?: string
          updated_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "state_compare_pages_state_a_code_fkey"
            columns: ["state_a_code"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "state_compare_pages_state_b_code_fkey"
            columns: ["state_b_code"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["code"]
          }
        ]
      }
      states: {
        Row: {
          id: string
          name: string
          slug: string
          code: string
          region: string
          description_json: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          code: string
          region: string
          description_json?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          code?: string
          region?: string
          description_json?: Json
          created_at?: string
          updated_at?: string
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
          requires_essay: boolean
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
          document_urls: Json | null
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
          /** Indexing pipeline: pending → submitted (after Indexing API ping) → indexed (after URL Inspection). */
          indexing_status: string
          /** Last Google URL Inspection attempt (see scholarshipIndexInspectionWorker). */
          last_index_check: string | null
          institution_id: string | null
          /** Precomputed: matches legacy “International Friendly” OR (see migration). */
          international_friendly_listing: boolean
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
          requires_essay?: boolean | null
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
          document_urls?: Json | null
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
          indexing_status?: string
          last_index_check?: string | null
          institution_id?: string | null
          international_friendly_listing?: boolean
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
          requires_essay?: boolean | null
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
          document_urls?: Json | null
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
          indexing_status?: string
          last_index_check?: string | null
          institution_id?: string | null
          international_friendly_listing?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "scholarships_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          }
        ]
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
      seo_hub_content: {
        Row: {
          id: string
          canonical_path: string
          title: string | null
          h1: string | null
          content_html: string | null
          cost_of_living_json: Json
          meta_description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          canonical_path: string
          title?: string | null
          h1?: string | null
          content_html?: string | null
          cost_of_living_json?: Json
          meta_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          canonical_path?: string
          title?: string | null
          h1?: string | null
          content_html?: string | null
          cost_of_living_json?: Json
          meta_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_generation_queue: {
        Row: {
          id: string
          canonical_path: string
          filters: Json
          priority: number
          status: string
          error_message: string | null
          grant_count: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          canonical_path: string
          filters?: Json
          priority?: number
          status?: string
          error_message?: string | null
          grant_count?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          canonical_path?: string
          filters?: Json
          priority?: number
          status?: string
          error_message?: string | null
          grant_count?: number | null
          created_at?: string
          updated_at?: string
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
          plan_code: string | null
          provider: string
          provider_customer_id: string | null
          provider_order_id: string | null
          provider_product_id: string | null
          provider_product_name: string | null
          provider_variant_id: string | null
          provider_variant_name: string | null
          price_id: string | null
          quantity: number | null
          raw_payload: Json | null
          renews_at: string | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          test_mode: boolean
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
          plan_code?: string | null
          provider?: string
          provider_customer_id?: string | null
          provider_order_id?: string | null
          provider_product_id?: string | null
          provider_product_name?: string | null
          provider_variant_id?: string | null
          provider_variant_name?: string | null
          price_id?: string | null
          quantity?: number | null
          raw_payload?: Json | null
          renews_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          test_mode?: boolean
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
          plan_code?: string | null
          provider?: string
          provider_customer_id?: string | null
          provider_order_id?: string | null
          provider_product_id?: string | null
          provider_product_name?: string | null
          provider_variant_id?: string | null
          provider_variant_name?: string | null
          price_id?: string | null
          quantity?: number | null
          raw_payload?: Json | null
          renews_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          test_mode?: boolean
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
      unsubscribed_emails: {
        Row: {
          id: string
          email: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
        }
        Relationships: []
      }
      provider_outreach_log: {
        Row: {
          id: string
          email: string
          sent_at: string
          campaign_key: string
        }
        Insert: {
          id?: string
          email: string
          sent_at?: string
          campaign_key?: string
        }
        Update: {
          id?: string
          email?: string
          sent_at?: string
          campaign_key?: string
        }
        Relationships: []
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
      get_scored_similar_scholarships: {
        Args: {
          target_id: string
          target_category_slug: string
          target_state_slug?: string | null
        }
        Returns: Database['public']['Tables']['scholarships']['Row'][]
      }
      essays_hub_index_page: {
        Args: {
          p_q?: string
          p_category?: string | null
          p_sort?: string
          p_page?: number
          p_page_size?: number
        }
        Returns: Record<string, unknown>
      }
      scholarship_active_counts_by_state_code: {
        Args: Record<string, never>
        Returns: {
          state_code: string
          grant_count: number
        }[]
      }
      seo_generation_sitemap_paths: {
        Args: { p_min_grants?: number }
        Returns: {
          canonical_path: string
          updated_at: string
        }[]
      }
      google_indexing_try_consume_quota: {
        Args: { p_max?: number }
        Returns: boolean
      }
      comparison_metrics_bundle: {
        Args: { p_inst: string }
        Returns: Json
      }
      get_comparison_data: {
        Args: { p_inst_a: string; p_inst_b: string }
        Returns: Json
      }
      get_state_comparison_data: {
        Args: { p_state_a_code: string; p_state_b_code: string }
        Returns: Json
      }
      compare_pages_sitemap_rows: {
        Args: Record<string, never>
        Returns: {
          slug: string
          updated_at: string
        }[]
      }
      state_compare_pages_sitemap_rows: {
        Args: Record<string, never>
        Returns: {
          slug: string
          updated_at: string
        }[]
      }
      university_hub_sitemap_rows: {
        Args: Record<string, never>
        Returns: {
          state_slug: string
          university_slug: string
          updated_at: string
        }[]
      }
      get_compare_peer_institutions: {
        Args: { p_institution_id: string; p_limit?: number }
        Returns: {
          peer_id: string
          peer_slug: string
          peer_name: string
          compare_slug: string
          peer_grant_count: number
        }[]
      }
    }
    Enums: {
      pricing_plan_interval: "day" | "week" | "month" | "year"
      pricing_type: "one_time" | "recurring"
      subscription_status:
        | "trialing"
        | "active"
        | "canceled"
        | "cancelled"
        | "incomplete"
        | "incomplete_expired"
        | "past_due"
        | "unpaid"
        | "paused"
        | "on_trial"
        | "expired"
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

