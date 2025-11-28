# Social Platform Import Plan

> **Feature**: Import saved/bookmarked memes from Reddit, Twitter/X, and Discord into your local Meme Search collection.

## Overview

A set of import tools that allow users to pull their saved memes from various social platforms into their self-hosted Meme Search instance. This grows the user's collection from existing meme sources without requiring any external service - all data flows into the local instance.

## Why This Fits Self-Hosted

- **Pull, not push**: Data flows INTO your local instance
- **User-controlled auth**: OAuth tokens stored locally, never shared
- **No central service**: Each user runs their own import
- **Bulk collection building**: Instantly populate collection from existing saves

## Supported Platforms

| Platform | Method | API Status | Difficulty |
|----------|--------|------------|------------|
| Reddit | OAuth API | Free, stable | Easy |
| Twitter/X | Archive import | Free (no API) | Easy |
| Discord | Bot + Archive | Free | Medium |
| Imgur | OAuth API | Free | Easy |

---

## Reddit Import

### User Flow
```
Settings → Import → Reddit
    ↓
"Connect Reddit Account" → OAuth popup
    ↓
Select import source:
  ○ Saved posts
  ○ Upvoted posts
  ○ Specific subreddit
    ↓
[Start Import] → Progress bar
    ↓
"Imported 47 memes from r/memes, r/programmerhumor, r/me_irl"
```

### Technical Implementation

#### OAuth Setup
```ruby
# config/initializers/reddit.rb
REDDIT_CONFIG = {
  client_id: ENV['REDDIT_CLIENT_ID'],
  client_secret: ENV['REDDIT_CLIENT_SECRET'],
  redirect_uri: 'http://localhost:3000/imports/reddit/callback'
}.freeze

# Users create their own Reddit app at https://www.reddit.com/prefs/apps
# Instructions provided in the UI
```

#### Controller
```ruby
# app/controllers/imports/reddit_controller.rb
module Imports
  class RedditController < ApplicationController
    def index
      @connected = reddit_token.present?
      @import_history = ImportLog.where(platform: 'reddit').order(created_at: :desc).limit(10)
    end

    def authorize
      state = SecureRandom.hex(16)
      session[:reddit_oauth_state] = state

      params = {
        client_id: REDDIT_CONFIG[:client_id],
        response_type: 'code',
        state: state,
        redirect_uri: REDDIT_CONFIG[:redirect_uri],
        duration: 'permanent',
        scope: 'history read'
      }

      redirect_to "https://www.reddit.com/api/v1/authorize?#{params.to_query}",
                  allow_other_host: true
    end

    def callback
      if params[:state] != session[:reddit_oauth_state]
        return redirect_to imports_reddit_path, alert: 'Invalid OAuth state'
      end

      token_response = exchange_code_for_token(params[:code])

      if token_response[:access_token]
        save_reddit_token(token_response)
        redirect_to imports_reddit_path, notice: 'Reddit connected successfully!'
      else
        redirect_to imports_reddit_path, alert: 'Failed to connect Reddit'
      end
    end

    def import
      source = params[:source] || 'saved'
      subreddit = params[:subreddit] if source == 'subreddit'

      job = ImportRedditJob.perform_later(
        source: source,
        subreddit: subreddit,
        limit: params[:limit] || 100
      )

      redirect_to imports_reddit_path, notice: 'Import started! Check progress below.'
    end

    def disconnect
      clear_reddit_token
      redirect_to imports_reddit_path, notice: 'Reddit disconnected'
    end

    private

    def exchange_code_for_token(code)
      uri = URI('https://www.reddit.com/api/v1/access_token')
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true

      request = Net::HTTP::Post.new(uri)
      request.basic_auth(REDDIT_CONFIG[:client_id], REDDIT_CONFIG[:client_secret])
      request.set_form_data(
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDDIT_CONFIG[:redirect_uri]
      )

      response = http.request(request)
      JSON.parse(response.body, symbolize_names: true)
    end

    def reddit_token
      Setting.find_by(key: 'reddit_access_token')&.value
    end

    def save_reddit_token(token_response)
      Setting.upsert_all([
        { key: 'reddit_access_token', value: token_response[:access_token] },
        { key: 'reddit_refresh_token', value: token_response[:refresh_token] },
        { key: 'reddit_token_expires', value: Time.current + token_response[:expires_in].seconds }
      ], unique_by: :key)
    end
  end
end
```

#### Background Job
```ruby
# app/jobs/import_reddit_job.rb
class ImportRedditJob < ApplicationJob
  queue_as :imports

  def perform(source:, subreddit: nil, limit: 100)
    client = RedditClient.new
    import_log = ImportLog.create!(platform: 'reddit', status: 'running', source: source)

    begin
      posts = case source
              when 'saved'
                client.saved_posts(limit: limit)
              when 'upvoted'
                client.upvoted_posts(limit: limit)
              when 'subreddit'
                client.subreddit_posts(subreddit, limit: limit)
              end

      imported_count = 0
      skipped_count = 0

      posts.each_with_index do |post, index|
        # Broadcast progress
        broadcast_progress(import_log, index + 1, posts.length)

        # Skip non-image posts
        unless image_post?(post)
          skipped_count += 1
          next
        end

        # Download and save
        result = import_post(post)
        if result[:success]
          imported_count += 1
        else
          skipped_count += 1
        end
      end

      import_log.update!(
        status: 'completed',
        imported_count: imported_count,
        skipped_count: skipped_count,
        completed_at: Time.current
      )

      broadcast_complete(import_log)
    rescue StandardError => e
      import_log.update!(status: 'failed', error_message: e.message)
      broadcast_error(import_log, e.message)
      raise
    end
  end

  private

  def image_post?(post)
    return true if post[:url]&.match?(/\.(jpg|jpeg|png|gif|webp)$/i)
    return true if post[:url]&.include?('i.redd.it')
    return true if post[:url]&.include?('i.imgur.com')
    false
  end

  def import_post(post)
    image_url = resolve_image_url(post[:url])
    return { success: false } unless image_url

    # Download image
    image_data = download_image(image_url)
    return { success: false } unless image_data

    # Generate filename
    filename = generate_filename(post, image_url)
    save_path = Rails.root.join('public/memes/reddit-imports', filename)
    FileUtils.mkdir_p(File.dirname(save_path))
    File.binwrite(save_path, image_data)

    # Create ImagePath if needed
    image_path = ImagePath.find_or_create_by!(path: '/memes/reddit-imports')

    # Create ImageCore
    image_core = ImageCore.create!(
      filename: filename,
      image_path: image_path,
      source_url: "https://reddit.com#{post[:permalink]}",
      source_title: post[:title],
      source_platform: 'reddit'
    )

    # Create subreddit tag
    tag = TagName.find_or_create_by!(name: "r/#{post[:subreddit]}")
    ImageTag.find_or_create_by!(image_core: image_core, tag_name: tag)

    { success: true, image_core: image_core }
  end

  def resolve_image_url(url)
    # Handle various Reddit image hosting
    if url.include?('imgur.com') && !url.include?('i.imgur.com')
      # Convert imgur page to direct image
      url.gsub('imgur.com', 'i.imgur.com') + '.jpg'
    elsif url.include?('reddit.com/gallery')
      # TODO: Handle Reddit galleries (multiple images)
      nil
    else
      url
    end
  end

  def broadcast_progress(import_log, current, total)
    ActionCable.server.broadcast('import_progress', {
      import_id: import_log.id,
      current: current,
      total: total,
      percentage: (current.to_f / total * 100).round
    })
  end

  def broadcast_complete(import_log)
    ActionCable.server.broadcast('import_progress', {
      import_id: import_log.id,
      status: 'completed',
      imported_count: import_log.imported_count,
      skipped_count: import_log.skipped_count
    })
  end
end
```

#### Reddit API Client
```ruby
# app/services/reddit_client.rb
class RedditClient
  BASE_URL = 'https://oauth.reddit.com'

  def initialize
    @access_token = get_valid_token
  end

  def saved_posts(limit: 100)
    fetch_listing('/user/me/saved', limit: limit)
  end

  def upvoted_posts(limit: 100)
    fetch_listing('/user/me/upvoted', limit: limit)
  end

  def subreddit_posts(subreddit, limit: 100)
    fetch_listing("/r/#{subreddit}/hot", limit: limit)
  end

  private

  def fetch_listing(endpoint, limit:)
    posts = []
    after = nil

    while posts.length < limit
      response = get(endpoint, after: after, limit: [limit - posts.length, 100].min)
      children = response.dig(:data, :children) || []
      break if children.empty?

      posts.concat(children.map { |c| c[:data] })
      after = response.dig(:data, :after)
      break unless after
    end

    posts
  end

  def get(endpoint, params = {})
    uri = URI("#{BASE_URL}#{endpoint}")
    uri.query = URI.encode_www_form(params.compact)

    request = Net::HTTP::Get.new(uri)
    request['Authorization'] = "Bearer #{@access_token}"
    request['User-Agent'] = 'MemeSearch/1.0'

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    response = http.request(request)
    JSON.parse(response.body, symbolize_names: true)
  end

  def get_valid_token
    expires_at = Setting.find_by(key: 'reddit_token_expires')&.value&.to_datetime

    if expires_at && expires_at < Time.current
      refresh_token!
    end

    Setting.find_by(key: 'reddit_access_token')&.value
  end

  def refresh_token!
    refresh_token = Setting.find_by(key: 'reddit_refresh_token')&.value
    return unless refresh_token

    # Exchange refresh token for new access token
    # Similar to exchange_code_for_token but with grant_type: 'refresh_token'
  end
end
```

---

## Twitter/X Import

### Challenge
Twitter API is now expensive ($100/mo minimum for API access).

### Solution: Archive Import
Twitter allows users to download their complete data archive for free, which includes all bookmarks and media.

### User Flow
```
Settings → Import → Twitter/X
    ↓
"Twitter API is paid. Import via your data archive instead!"
    ↓
1. Go to Settings → Your Account → Download an archive
2. Wait for Twitter to prepare it (can take 24h)
3. Download and extract the ZIP
4. Upload the archive here
    ↓
[Select twitter-archive.zip] → [Upload]
    ↓
"Found 156 bookmarked images. Import all?"
    ↓
[Import] → Progress bar
    ↓
"Imported 156 memes from Twitter bookmarks"
```

### Technical Implementation

#### Controller
```ruby
# app/controllers/imports/twitter_controller.rb
module Imports
  class TwitterController < ApplicationController
    def index
      @import_history = ImportLog.where(platform: 'twitter').order(created_at: :desc).limit(10)
    end

    def upload
      archive = params[:archive]

      unless archive.content_type == 'application/zip'
        return redirect_to imports_twitter_path, alert: 'Please upload a ZIP file'
      end

      # Save temporarily
      temp_path = Rails.root.join('tmp', "twitter_archive_#{SecureRandom.hex(8)}.zip")
      File.binwrite(temp_path, archive.read)

      # Start background job
      ImportTwitterArchiveJob.perform_later(archive_path: temp_path.to_s)

      redirect_to imports_twitter_path, notice: 'Archive uploaded! Processing...'
    end
  end
end
```

#### Background Job
```ruby
# app/jobs/import_twitter_archive_job.rb
class ImportTwitterArchiveJob < ApplicationJob
  queue_as :imports

  def perform(archive_path:)
    import_log = ImportLog.create!(platform: 'twitter', status: 'running', source: 'archive')

    begin
      Zip::File.open(archive_path) do |zip|
        # Parse bookmarks/tweets to get context
        bookmarks = parse_bookmarks(zip)
        media_files = find_media_files(zip)

        imported_count = 0

        media_files.each_with_index do |entry, index|
          broadcast_progress(import_log, index + 1, media_files.length)

          # Extract and save image
          filename = File.basename(entry.name)
          save_path = Rails.root.join('public/memes/twitter-imports', filename)
          FileUtils.mkdir_p(File.dirname(save_path))

          entry.extract(save_path) { true } # Overwrite if exists

          # Find associated bookmark/tweet for metadata
          tweet_data = find_tweet_for_media(bookmarks, filename)

          # Create ImageCore
          image_path = ImagePath.find_or_create_by!(path: '/memes/twitter-imports')
          ImageCore.create!(
            filename: filename,
            image_path: image_path,
            source_url: tweet_data&.dig(:url),
            source_title: tweet_data&.dig(:text)&.truncate(200),
            source_platform: 'twitter'
          )

          imported_count += 1
        end

        import_log.update!(
          status: 'completed',
          imported_count: imported_count,
          completed_at: Time.current
        )
      end
    ensure
      # Cleanup temp file
      FileUtils.rm_f(archive_path)
    end
  end

  private

  def parse_bookmarks(zip)
    # Twitter archive structure:
    # data/bookmarks.js - contains bookmark data
    bookmarks_entry = zip.find_entry('data/bookmarks.js')
    return [] unless bookmarks_entry

    content = bookmarks_entry.get_input_stream.read
    # Remove JS wrapper: "window.YTD.bookmarks.part0 = "
    json_content = content.sub(/^window\.YTD\.bookmarks\.part\d+ = /, '')
    JSON.parse(json_content, symbolize_names: true)
  rescue
    []
  end

  def find_media_files(zip)
    zip.entries.select do |entry|
      entry.name.match?(/^data\/tweets_media\/.*\.(jpg|jpeg|png|gif|webp)$/i)
    end
  end

  def find_tweet_for_media(bookmarks, filename)
    # Match media filename to tweet
    # Twitter media files are named like: tweet_id-media_url_hash.jpg
    tweet_id = filename.split('-').first

    bookmarks.find { |b| b.dig(:bookmark, :tweetId) == tweet_id }
  end
end
```

---

## Discord Import

### Options

1. **Data Export Import** - User downloads Discord data package
2. **Bot Channel Import** - Self-hosted bot fetches from specific channels

### Option 1: Data Export

Similar to Twitter, Discord allows data export requests.

```ruby
# app/jobs/import_discord_archive_job.rb
class ImportDiscordArchiveJob < ApplicationJob
  def perform(archive_path:)
    Zip::File.open(archive_path) do |zip|
      # Discord archives have messages in:
      # messages/[channel_id]/messages.json
      # Attachments are in:
      # messages/[channel_id]/attachments/

      zip.glob('messages/*/messages.json').each do |messages_entry|
        channel_dir = File.dirname(messages_entry.name)
        messages = JSON.parse(messages_entry.get_input_stream.read)

        messages.each do |msg|
          next unless msg['attachments']&.any?

          msg['attachments'].each do |attachment|
            next unless image_attachment?(attachment)

            # Find and extract the attachment file
            attachment_path = "#{channel_dir}/#{attachment['fileName']}"
            attachment_entry = zip.find_entry(attachment_path)
            next unless attachment_entry

            import_attachment(attachment_entry, msg)
          end
        end
      end
    end
  end
end
```

### Option 2: Self-Hosted Bot

For users who want to import from specific Discord servers/channels.

```ruby
# app/services/discord_bot_client.rb
class DiscordBotClient
  def initialize(bot_token)
    @token = bot_token
  end

  def channel_messages(channel_id, limit: 100)
    messages = []
    before = nil

    while messages.length < limit
      batch = fetch_messages(channel_id, before: before, limit: 100)
      break if batch.empty?

      messages.concat(batch)
      before = batch.last[:id]
    end

    messages
  end

  def download_attachment(url)
    uri = URI(url)
    Net::HTTP.get(uri)
  end

  private

  def fetch_messages(channel_id, before: nil, limit: 100)
    uri = URI("https://discord.com/api/v10/channels/#{channel_id}/messages")
    params = { limit: limit }
    params[:before] = before if before
    uri.query = URI.encode_www_form(params)

    request = Net::HTTP::Get.new(uri)
    request['Authorization'] = "Bot #{@token}"

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true

    response = http.request(request)
    JSON.parse(response.body, symbolize_names: true)
  end
end
```

---

## Database Models

### Import Log
```ruby
# db/migrate/XXXXXX_create_import_logs.rb
class CreateImportLogs < ActiveRecord::Migration[7.1]
  def change
    create_table :import_logs do |t|
      t.string :platform, null: false  # reddit, twitter, discord
      t.string :source               # saved, upvoted, archive, channel
      t.string :status, default: 'pending'  # pending, running, completed, failed
      t.integer :imported_count, default: 0
      t.integer :skipped_count, default: 0
      t.text :error_message
      t.datetime :completed_at
      t.timestamps
    end

    add_index :import_logs, :platform
    add_index :import_logs, :status
  end
end
```

### Settings Model (for OAuth tokens)
```ruby
# db/migrate/XXXXXX_create_settings.rb
class CreateSettings < ActiveRecord::Migration[7.1]
  def change
    create_table :settings do |t|
      t.string :key, null: false
      t.text :value
      t.timestamps
    end

    add_index :settings, :key, unique: true
  end
end

# app/models/setting.rb
class Setting < ApplicationRecord
  encrypts :value  # Rails 7 encrypted attributes for OAuth tokens
end
```

---

## UI Design

### Import Dashboard
```
┌─────────────────────────────────────────────────────────────┐
│ Settings → Import                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Reddit                              [Connected ✓]   │   │
│  │                                                      │   │
│  │ Import from:                                        │   │
│  │ ○ Saved posts                                       │   │
│  │ ○ Upvoted posts                                     │   │
│  │ ○ Subreddit: [____________]                         │   │
│  │                                                      │   │
│  │ Limit: [100 ▼]    [Start Import]   [Disconnect]    │   │
│  │                                                      │   │
│  │ Last import: 47 memes on Nov 15 (r/memes, r/prog..)│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Twitter/X                                            │   │
│  │                                                      │   │
│  │ ⓘ Twitter API requires paid access. Import via     │   │
│  │   your data archive instead (free).                 │   │
│  │                                                      │   │
│  │ 1. Go to Twitter Settings → Download Archive        │   │
│  │ 2. Wait for email (can take 24h)                    │   │
│  │ 3. Upload the ZIP file below                        │   │
│  │                                                      │   │
│  │ [Choose File] twitter-archive.zip   [Upload]        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Discord                                              │   │
│  │                                                      │   │
│  │ Option 1: Upload Discord data export                │   │
│  │ [Choose File] package.zip           [Upload]        │   │
│  │                                                      │   │
│  │ Option 2: Import from channel (requires bot)        │   │
│  │ Bot Token: [________________________]               │   │
│  │ Channel ID: [__________________]    [Import]        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Import History                                       │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Nov 15  Reddit (saved)    47 imported   ✓ Complete  │   │
│  │ Nov 10  Twitter (archive) 156 imported  ✓ Complete  │   │
│  │ Nov 08  Discord (channel) 23 imported   ✓ Complete  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Progress Modal
```
┌─────────────────────────────────────────────────────────────┐
│ Importing from Reddit...                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ████████████████░░░░░░░░░░░░░░  47%                       │
│                                                             │
│  Processing: 47 / 100 posts                                │
│  Imported: 32 memes                                        │
│  Skipped: 15 (not images)                                  │
│                                                             │
│  Currently downloading:                                     │
│  "When you finally fix the bug..." from r/programmerhumor  │
│                                                             │
│                                         [Cancel Import]     │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Reddit Import (3-4 days)
- [ ] Create Settings model for OAuth token storage
- [ ] Create ImportLog model
- [ ] Implement Reddit OAuth flow
- [ ] Build RedditClient service
- [ ] Create ImportRedditJob with progress broadcasting
- [ ] Build import UI with WebSocket progress

### Phase 2: Twitter Archive Import (2 days)
- [ ] Create archive upload endpoint
- [ ] Build ImportTwitterArchiveJob
- [ ] Parse Twitter archive format (bookmarks.js, tweets_media/)
- [ ] UI for upload and instructions

### Phase 3: Discord Import (2-3 days)
- [ ] Discord data export parsing
- [ ] Optional: Discord bot integration
- [ ] Channel selector UI for bot method

### Phase 4: Polish (1-2 days)
- [ ] Import history view
- [ ] Duplicate detection across imports
- [ ] Error handling and retry logic
- [ ] Rate limiting for API calls

---

## Testing Strategy

### Unit Tests
```ruby
# test/services/reddit_client_test.rb
class RedditClientTest < ActiveSupport::TestCase
  test "fetches saved posts" do
    stub_request(:get, /oauth.reddit.com\/user\/me\/saved/)
      .to_return(body: reddit_saved_fixture.to_json)

    client = RedditClient.new
    posts = client.saved_posts(limit: 10)

    assert_equal 10, posts.length
  end
end

# test/jobs/import_reddit_job_test.rb
class ImportRedditJobTest < ActiveJob::TestCase
  test "imports image posts and skips text posts" do
    # Mock Reddit API
    # Mock image downloads
    # Assert ImageCore created for images only
  end
end
```

### Integration Tests
```ruby
# test/controllers/imports/reddit_controller_test.rb
class Imports::RedditControllerTest < ActionDispatch::IntegrationTest
  test "OAuth flow redirects to Reddit" do
    get imports_reddit_authorize_path
    assert_redirected_to /reddit.com\/api\/v1\/authorize/
  end

  test "callback exchanges code for token" do
    # Mock token exchange
    get imports_reddit_callback_path, params: { code: 'test', state: session[:reddit_oauth_state] }
    assert_redirected_to imports_reddit_path
    assert Setting.exists?(key: 'reddit_access_token')
  end
end
```

---

## Security Considerations

1. **Token Storage**: OAuth tokens encrypted at rest using Rails 7 `encrypts`
2. **Token Scope**: Request minimal scopes (read-only access)
3. **Archive Validation**: Verify ZIP structure before processing
4. **File Type Validation**: Only import actual image files
5. **Rate Limiting**: Respect platform API rate limits
6. **Temp File Cleanup**: Always delete uploaded archives after processing

---

## Future Enhancements

- [ ] Imgur import (OAuth API)
- [ ] Tumblr import (if anyone still uses it)
- [ ] Scheduled/recurring imports
- [ ] Selective import (preview before importing)
- [ ] Import deduplication using image hashing
- [ ] Tag suggestions based on subreddit/source
