class CreateImageTags < ActiveRecord::Migration[7.2]
  def change
    create_table :image_tags do |t|
      t.references :image_core, foreign_key: true, index: true, null: false
      t.references :tag_name, foreign_key: true, index: true, null: false

      t.timestamps
    end
  end
end
