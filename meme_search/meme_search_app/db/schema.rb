# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2026_07_28_000000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "vector"

  create_table "api_tokens", force: :cascade do |t|
    t.string "name", null: false
    t.string "token_digest", null: false
    t.string "token_prefix", null: false
    t.jsonb "scopes", default: [], null: false
    t.datetime "last_used_at"
    t.datetime "expires_at"
    t.datetime "revoked_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["revoked_at"], name: "index_api_tokens_on_revoked_at"
    t.index ["token_digest"], name: "index_api_tokens_on_token_digest", unique: true
    t.index ["token_prefix"], name: "index_api_tokens_on_token_prefix"
  end

  create_table "description_provider_settings", force: :cascade do |t|
    t.integer "singleton_key", default: 0, null: false
    t.string "provider", default: "local", null: false
    t.string "openai_base_url", default: "https://api.openai.com/v1", null: false
    t.string "openai_model", default: "gpt-4o-mini", null: false
    t.text "openai_api_key_ciphertext"
    t.string "openai_key_last_four"
    t.string "openai_last_test_status", default: "not_tested", null: false
    t.datetime "openai_last_tested_at"
    t.text "openai_last_test_error"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["singleton_key"], name: "index_description_provider_settings_on_singleton_key", unique: true
    t.check_constraint "singleton_key = 0", name: "description_provider_settings_singleton_key_check"
  end

  create_table "image_cores", force: :cascade do |t|
    t.bigint "image_path_id", null: false
    t.string "name", limit: 100
    t.string "description", limit: 500
    t.integer "status", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["image_path_id"], name: "index_image_cores_on_image_path_id"
  end

  create_table "image_description_bulk_operations", force: :cascade do |t|
    t.string "provider", null: false
    t.boolean "provider_queued", default: true, null: false
    t.integer "status", default: 0, null: false
    t.integer "total_count", default: 0, null: false
    t.jsonb "filter_params", default: {}, null: false
    t.datetime "started_at", null: false
    t.datetime "completed_at"
    t.datetime "canceled_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "image_description_generation_attempts", force: :cascade do |t|
    t.bigint "image_core_id", null: false
    t.string "provider", null: false
    t.integer "status", default: 0, null: false
    t.jsonb "provider_settings", default: {}, null: false
    t.text "error_message"
    t.datetime "started_at"
    t.datetime "completed_at"
    t.datetime "canceled_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.bigint "image_description_bulk_operation_id"
    t.index ["image_core_id"], name: "index_generation_attempts_one_active_per_image", unique: true, where: "(status = ANY (ARRAY[0, 1]))"
    t.index ["image_core_id"], name: "index_image_description_generation_attempts_on_image_core_id"
    t.index ["image_description_bulk_operation_id"], name: "index_generation_attempts_on_bulk_operation_id"
  end

  create_table "image_embeddings", force: :cascade do |t|
    t.bigint "image_core_id", null: false
    t.string "snippet"
    t.vector "embedding", limit: 384
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["image_core_id"], name: "index_image_embeddings_on_image_core_id"
  end

  create_table "image_paths", force: :cascade do |t|
    t.string "name", limit: 300
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "scan_frequency_minutes"
    t.datetime "last_scanned_at"
    t.integer "scan_status", default: 0, null: false
    t.text "last_scan_error"
    t.boolean "currently_scanning", default: false, null: false
    t.integer "last_scan_duration_ms"
    t.index ["last_scanned_at"], name: "index_image_paths_on_last_scanned_at"
    t.index ["name"], name: "index_image_paths_on_name", unique: true
    t.index ["scan_frequency_minutes"], name: "index_image_paths_on_scan_frequency_minutes"
  end

  create_table "image_tags", force: :cascade do |t|
    t.bigint "image_core_id", null: false
    t.bigint "tag_name_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["image_core_id"], name: "index_image_tags_on_image_core_id"
    t.index ["tag_name_id"], name: "index_image_tags_on_tag_name_id"
  end

  create_table "image_to_texts", force: :cascade do |t|
    t.string "name"
    t.string "resource"
    t.string "description"
    t.boolean "current", default: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "solid_queue_blocked_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "queue_name", null: false
    t.integer "priority", default: 0, null: false
    t.string "concurrency_key", null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.index ["concurrency_key", "priority", "job_id"], name: "index_solid_queue_blocked_executions_for_release"
    t.index ["expires_at", "concurrency_key"], name: "index_solid_queue_blocked_executions_for_maintenance"
    t.index ["job_id"], name: "index_solid_queue_blocked_executions_on_job_id", unique: true
  end

  create_table "solid_queue_claimed_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.bigint "process_id"
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_claimed_executions_on_job_id", unique: true
    t.index ["process_id", "job_id"], name: "index_solid_queue_claimed_executions_on_process_id_and_job_id"
  end

  create_table "solid_queue_failed_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.text "error"
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_failed_executions_on_job_id", unique: true
  end

  create_table "solid_queue_jobs", force: :cascade do |t|
    t.string "queue_name", null: false
    t.string "class_name", null: false
    t.text "arguments"
    t.integer "priority", default: 0, null: false
    t.string "active_job_id"
    t.datetime "scheduled_at"
    t.datetime "finished_at"
    t.string "concurrency_key"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["active_job_id"], name: "index_solid_queue_jobs_on_active_job_id"
    t.index ["class_name"], name: "index_solid_queue_jobs_on_class_name"
    t.index ["finished_at"], name: "index_solid_queue_jobs_on_finished_at"
    t.index ["queue_name", "finished_at"], name: "index_solid_queue_jobs_for_filtering"
    t.index ["scheduled_at", "finished_at"], name: "index_solid_queue_jobs_for_alerting"
  end

  create_table "solid_queue_pauses", force: :cascade do |t|
    t.string "queue_name", null: false
    t.datetime "created_at", null: false
    t.index ["queue_name"], name: "index_solid_queue_pauses_on_queue_name", unique: true
  end

  create_table "solid_queue_processes", force: :cascade do |t|
    t.string "kind", null: false
    t.datetime "last_heartbeat_at", null: false
    t.bigint "supervisor_id"
    t.integer "pid", null: false
    t.string "hostname"
    t.text "metadata"
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.index ["last_heartbeat_at"], name: "index_solid_queue_processes_on_last_heartbeat_at"
    t.index ["name", "supervisor_id"], name: "index_solid_queue_processes_on_name_and_supervisor_id", unique: true
    t.index ["supervisor_id"], name: "index_solid_queue_processes_on_supervisor_id"
  end

  create_table "solid_queue_ready_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "queue_name", null: false
    t.integer "priority", default: 0, null: false
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_ready_executions_on_job_id", unique: true
    t.index ["priority", "job_id"], name: "index_solid_queue_poll_all"
    t.index ["queue_name", "priority", "job_id"], name: "index_solid_queue_poll_by_queue"
  end

  create_table "solid_queue_recurring_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "task_key", null: false
    t.datetime "run_at", null: false
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_recurring_executions_on_job_id", unique: true
    t.index ["task_key", "run_at"], name: "index_solid_queue_recurring_executions_on_task_key_and_run_at", unique: true
  end

  create_table "solid_queue_recurring_tasks", force: :cascade do |t|
    t.string "key", null: false
    t.string "schedule", null: false
    t.string "command", limit: 2048
    t.string "class_name"
    t.text "arguments"
    t.string "queue_name"
    t.integer "priority", default: 0
    t.boolean "static", default: true, null: false
    t.text "description"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["key"], name: "index_solid_queue_recurring_tasks_on_key", unique: true
    t.index ["static"], name: "index_solid_queue_recurring_tasks_on_static"
  end

  create_table "solid_queue_scheduled_executions", force: :cascade do |t|
    t.bigint "job_id", null: false
    t.string "queue_name", null: false
    t.integer "priority", default: 0, null: false
    t.datetime "scheduled_at", null: false
    t.datetime "created_at", null: false
    t.index ["job_id"], name: "index_solid_queue_scheduled_executions_on_job_id", unique: true
    t.index ["scheduled_at", "priority", "job_id"], name: "index_solid_queue_dispatch_all"
  end

  create_table "solid_queue_semaphores", force: :cascade do |t|
    t.string "key", null: false
    t.integer "value", default: 1, null: false
    t.datetime "expires_at", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["expires_at"], name: "index_solid_queue_semaphores_on_expires_at"
    t.index ["key", "value"], name: "index_solid_queue_semaphores_on_key_and_value"
    t.index ["key"], name: "index_solid_queue_semaphores_on_key", unique: true
  end

  create_table "tag_names", force: :cascade do |t|
    t.string "name", limit: 20
    t.string "color", limit: 20, default: "red"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_tag_names_on_name", unique: true
  end

  add_foreign_key "image_cores", "image_paths"
  add_foreign_key "image_description_generation_attempts", "image_cores"
  add_foreign_key "image_description_generation_attempts", "image_description_bulk_operations", on_delete: :nullify
  add_foreign_key "image_embeddings", "image_cores"
  add_foreign_key "image_tags", "image_cores"
  add_foreign_key "image_tags", "tag_names"
  add_foreign_key "solid_queue_blocked_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_claimed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_failed_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_ready_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_recurring_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
  add_foreign_key "solid_queue_scheduled_executions", "solid_queue_jobs", column: "job_id", on_delete: :cascade
end
