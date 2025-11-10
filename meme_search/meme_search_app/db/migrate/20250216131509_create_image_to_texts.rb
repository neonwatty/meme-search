class CreateImageToTexts < ActiveRecord::Migration[7.2]
  def change
    create_table :image_to_texts do |t|
      t.string :name
      t.string :resource
      t.string :description
      t.boolean :current, default: false

      t.timestamps
    end
  end
end
