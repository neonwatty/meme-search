class CreateTagNames < ActiveRecord::Migration[7.2]
  def change
    create_table :tag_names do |t|
      t.string :name, limit: 20
      t.string :color, limit: 20, default: "red"

      t.timestamps
    end
    add_index :tag_names, :name, unique: true
  end
end
