class CreateTasks < ActiveRecord::Migration[8.1]
  def change
    create_table :tasks do |t|
      t.string :title, null: false
      t.text :notes
      t.string :status, null: false, default: 'todo'
      t.integer :position, null: false, default: 0

      t.timestamps
    end

    add_index :tasks, :status
    add_index :tasks, :position
  end
end
