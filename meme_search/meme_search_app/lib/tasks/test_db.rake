# frozen_string_literal: true

namespace :db do
  namespace :test do
    desc "Seed the test database with fixture data for E2E tests"
    task seed: :environment do
      Rails.env = "test"
      load Rails.root.join("db", "seeds", "test_seed.rb")
    end

    desc "Reset and seed the test database"
    task reset_and_seed: :environment do
      Rails.env = "test"

      puts "Resetting test database..."
      # Clean all existing data (truncate tables without dropping database)
      Rake::Task["db:test:clean"].invoke

      puts "Seeding test database..."
      load Rails.root.join("db", "seeds", "test_seed.rb")
    end

    desc "Clean the test database"
    task clean: :environment do
      Rails.env = "test"

      puts "Cleaning test database..."
      # Use delete_all to avoid callbacks and foreign key issues
      # Delete in reverse dependency order
      ActiveRecord::Base.connection.execute("TRUNCATE TABLE image_tags, image_embeddings, image_cores, tag_names, image_paths, image_to_texts RESTART IDENTITY CASCADE")

      puts "Test database cleaned!"
    end
  end
end
