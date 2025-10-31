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
      Rake::Task["db:test:prepare"].invoke

      puts "Seeding test database..."
      load Rails.root.join("db", "seeds", "test_seed.rb")
    end

    desc "Clean the test database"
    task clean: :environment do
      Rails.env = "test"

      puts "Cleaning test database..."
      ImageTag.destroy_all
      ImageEmbedding.destroy_all
      ImageCore.destroy_all
      TagName.destroy_all
      ImagePath.destroy_all
      ImageToText.destroy_all

      puts "Test database cleaned!"
    end
  end
end
