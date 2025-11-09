require "test_helper"

class PagesControllerTest < ActionDispatch::IntegrationTest
  test "should get about page" do
    get about_path
    assert_response :success
  end

  test "about page displays app version" do
    get about_path
    assert_select "span", text: APP_VERSION
  end

  test "about page contains GitHub repository link" do
    get about_path
    assert_select "a[href='https://github.com/neonwatty/meme-search']"
  end

  test "about page contains GitHub issues link" do
    get about_path
    assert_select "a[href='https://github.com/neonwatty/meme-search/issues']"
  end

  test "about page contains personal website link" do
    get about_path
    assert_select "a[href='https://neonwatty.com/']"
  end

  test "about page has correct title" do
    get about_path
    assert_select "h1", text: "About Meme Search"
  end

  test "about page contains feedback section" do
    get about_path
    assert_select "h2", text: "Feedback"
  end
end
