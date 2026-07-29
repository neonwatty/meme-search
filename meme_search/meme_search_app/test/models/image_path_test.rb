require "test_helper"
require "tempfile"

class ImagePathTest < ActiveSupport::TestCase
  test "directory scans do not index symlinked files" do
    directory_name = "symlink-scan-test-#{SecureRandom.hex(8)}"
    directory_path = Rails.root.join("public", "memes", directory_name)
    FileUtils.mkdir_p(directory_path)
    outside_file = Tempfile.new([ "outside-meme-library", ".jpg" ])
    outside_file.write("private data")
    outside_file.flush
    symlink_path = directory_path.join("linked-secret.jpg")
    File.symlink(outside_file.path, symlink_path)

    image_path = ImagePath.create!(name: directory_name)

    assert_empty image_path.image_cores
  ensure
    FileUtils.rm_f(symlink_path) if defined?(symlink_path)
    Dir.rmdir(directory_path) if defined?(directory_path) && directory_path.directory? && directory_path.children.empty?
    outside_file&.close!
  end

  test "directory scans reject a symlinked configured directory" do
    outside_directory = Dir.mktmpdir("outside-meme-library")
    File.binwrite(File.join(outside_directory, "secret.jpg"), "private data")
    symlink_name = "symlink-directory-test-#{SecureRandom.hex(8)}"
    symlink_path = Rails.root.join("public", "memes", symlink_name)
    File.symlink(outside_directory, symlink_path)

    image_path = ImagePath.new(name: symlink_name)

    assert_not image_path.valid?
    assert_includes image_path.errors[:name].join, "not a valid subdirectory"
    assert_nil image_path.directory_path
  ensure
    FileUtils.rm_f(symlink_path) if defined?(symlink_path)
    FileUtils.remove_entry(outside_directory) if defined?(outside_directory) && File.exist?(outside_directory)
  end
end
