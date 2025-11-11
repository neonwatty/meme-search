class AddAutoScanToImagePaths < ActiveRecord::Migration[8.0]
  def change
    add_column :image_paths, :scan_frequency_minutes, :integer, default: nil
    add_column :image_paths, :last_scanned_at, :datetime
    add_column :image_paths, :scan_status, :integer, default: 0, null: false
    add_column :image_paths, :last_scan_error, :text
    add_column :image_paths, :currently_scanning, :boolean, default: false, null: false
    add_column :image_paths, :last_scan_duration_ms, :integer

    add_index :image_paths, :last_scanned_at
    add_index :image_paths, :scan_frequency_minutes
  end
end
