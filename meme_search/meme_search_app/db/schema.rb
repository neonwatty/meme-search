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

ActiveRecord::Schema[8.0].define(version: 2025_11_11_145709) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "vector"

  create_table "image_cores", force: :cascade do |t|
    t.bigint "image_path_id", null: false
    t.string "name", limit: 100
    t.string "description", limit: 500
    t.integer "status", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["image_path_id"], name: "index_image_cores_on_image_path_id"
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

  create_table "tag_names", force: :cascade do |t|
    t.string "name", limit: 20
    t.string "color", limit: 20, default: "red"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["name"], name: "index_tag_names_on_name", unique: true
  end

  add_foreign_key "image_cores", "image_paths"
  add_foreign_key "image_embeddings", "image_cores"
  add_foreign_key "image_tags", "image_cores"
  add_foreign_key "image_tags", "tag_names"
end
