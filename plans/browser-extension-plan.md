# Browser Extension Plan

> **Feature**: Save any image from the web directly to your local Meme Search instance with one click.

## Overview

A browser extension that integrates with the self-hosted Meme Search application, allowing users to right-click any image on the web and save it directly to their local meme collection. The extension captures source context (URL, page title) and can optionally trigger AI description generation.

## User Experience

### Core Flow
```
1. User browses Reddit/Twitter/Discord/anywhere
2. Sees a meme they want to save
3. Right-click → "Save to Meme Search"
4. Optional popup: add tags, edit filename
5. Image saved to local instance
6. Toast notification: "Saved! [Generate description]"
```

### Features
| Feature | Priority | Description |
|---------|----------|-------------|
| Right-click save | P0 | Core functionality - save any image |
| Source tracking | P0 | Preserve where the meme came from (URL, page title) |
| Auto-tagging | P1 | Extract subreddit, Twitter handle, etc. as tags |
| Popup search | P1 | Search your collection without leaving current page |
| Duplicate detection | P2 | Warn if similar image exists (via embedding similarity) |
| Batch save | P2 | Select multiple images on a page |
| Keyboard shortcut | P2 | Quick-save without context menu |

## Technical Architecture

### Extension Structure
```
browser-extension/
├── manifest.json          # V3 manifest (Chrome/Edge/Firefox)
├── background.js          # Service worker - handles context menu
├── content.js             # Content script for page interaction
├── popup/
│   ├── popup.html         # Quick search UI
│   ├── popup.js           # Search your collection from any page
│   └── popup.css
├── options/
│   ├── options.html       # Configure localhost URL, API key
│   └── options.js
├── utils/
│   └── api.js             # Communication with Rails app
└── icons/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

### Manifest V3 Configuration
```json
{
  "manifest_version": 3,
  "name": "Meme Search Saver",
  "version": "1.0.0",
  "description": "Save images directly to your self-hosted Meme Search instance",
  "permissions": [
    "contextMenus",
    "storage",
    "notifications",
    "clipboardWrite"
  ],
  "host_permissions": [
    "http://localhost:3000/*",
    "http://127.0.0.1:3000/*",
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "options_page": "options/options.html",
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

### Background Service Worker
```javascript
// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save-to-meme-search",
    title: "Save to Meme Search",
    contexts: ["image"]
  });

  chrome.contextMenus.create({
    id: "save-to-meme-search-with-tags",
    title: "Save to Meme Search (with tags)...",
    contexts: ["image"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "save-to-meme-search") {
    await saveImage(info, tab, { showTagDialog: false });
  } else if (info.menuItemId === "save-to-meme-search-with-tags") {
    await saveImage(info, tab, { showTagDialog: true });
  }
});

async function saveImage(info, tab, options) {
  const imageUrl = info.srcUrl;
  const pageUrl = tab.url;
  const pageTitle = tab.title;

  // Get configured localhost URL
  const config = await chrome.storage.sync.get(['serverUrl', 'apiKey']);
  const serverUrl = config.serverUrl || 'http://localhost:3000';

  // Extract source metadata
  const sourceMeta = extractSourceMetadata(pageUrl, pageTitle);

  try {
    const response = await fetch(`${serverUrl}/api/extension/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Extension-Key': config.apiKey || ''
      },
      body: JSON.stringify({
        image_url: imageUrl,
        source_url: pageUrl,
        source_title: pageTitle,
        suggested_tags: sourceMeta.tags,
        source_platform: sourceMeta.platform
      })
    });

    if (response.ok) {
      const result = await response.json();
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon-128.png',
        title: 'Meme Saved!',
        message: `Saved to your collection. ${result.duplicate ? '(Possible duplicate detected)' : ''}`
      });
    } else {
      throw new Error(`Server returned ${response.status}`);
    }
  } catch (error) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon-128.png',
      title: 'Save Failed',
      message: `Could not save image: ${error.message}`
    });
  }
}

function extractSourceMetadata(url, title) {
  const metadata = { tags: [], platform: 'web' };

  // Reddit
  if (url.includes('reddit.com')) {
    metadata.platform = 'reddit';
    const subredditMatch = url.match(/\/r\/([^\/]+)/);
    if (subredditMatch) {
      metadata.tags.push(`r/${subredditMatch[1]}`);
    }
  }

  // Twitter/X
  if (url.includes('twitter.com') || url.includes('x.com')) {
    metadata.platform = 'twitter';
    const userMatch = url.match(/(?:twitter|x)\.com\/([^\/]+)/);
    if (userMatch && !['home', 'search', 'explore'].includes(userMatch[1])) {
      metadata.tags.push(`@${userMatch[1]}`);
    }
  }

  // Discord
  if (url.includes('discord.com')) {
    metadata.platform = 'discord';
  }

  // Imgur
  if (url.includes('imgur.com')) {
    metadata.platform = 'imgur';
  }

  return metadata;
}
```

### Popup Search Interface
```html
<!-- popup/popup.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      width: 350px;
      padding: 12px;
      font-family: system-ui, sans-serif;
    }
    .search-container {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }
    #search-input {
      flex: 1;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .results {
      max-height: 400px;
      overflow-y: auto;
    }
    .result-item {
      display: flex;
      gap: 8px;
      padding: 8px;
      border-bottom: 1px solid #eee;
      cursor: pointer;
    }
    .result-item:hover {
      background: #f5f5f5;
    }
    .result-thumb {
      width: 60px;
      height: 60px;
      object-fit: cover;
      border-radius: 4px;
    }
    .result-desc {
      flex: 1;
      font-size: 12px;
      color: #666;
    }
    .status {
      text-align: center;
      color: #666;
      padding: 20px;
    }
    .error { color: #dc3545; }
  </style>
</head>
<body>
  <div class="search-container">
    <input type="text" id="search-input" placeholder="Search your memes...">
    <button id="search-btn">Search</button>
  </div>
  <div id="status" class="status">Type to search your collection</div>
  <div id="results" class="results"></div>
  <script src="popup.js"></script>
</body>
</html>
```

```javascript
// popup/popup.js
document.addEventListener('DOMContentLoaded', async () => {
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const resultsDiv = document.getElementById('results');
  const statusDiv = document.getElementById('status');

  const config = await chrome.storage.sync.get(['serverUrl']);
  const serverUrl = config.serverUrl || 'http://localhost:3000';

  async function search() {
    const query = searchInput.value.trim();
    if (!query) return;

    statusDiv.textContent = 'Searching...';
    resultsDiv.innerHTML = '';

    try {
      const response = await fetch(
        `${serverUrl}/api/extension/search?q=${encodeURIComponent(query)}`
      );
      const results = await response.json();

      if (results.length === 0) {
        statusDiv.textContent = 'No results found';
        return;
      }

      statusDiv.style.display = 'none';
      resultsDiv.innerHTML = results.map(item => `
        <div class="result-item" data-id="${item.id}">
          <img src="${serverUrl}${item.thumbnail}" class="result-thumb" alt="">
          <div class="result-desc">${item.description || 'No description'}</div>
        </div>
      `).join('');

      // Click to copy
      resultsDiv.querySelectorAll('.result-item').forEach(el => {
        el.addEventListener('click', async () => {
          const id = el.dataset.id;
          const response = await fetch(`${serverUrl}/api/extension/image/${id}`);
          const blob = await response.blob();
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob })
          ]);
          statusDiv.style.display = 'block';
          statusDiv.textContent = 'Copied to clipboard!';
          setTimeout(() => { statusDiv.style.display = 'none'; }, 2000);
        });
      });
    } catch (error) {
      statusDiv.className = 'status error';
      statusDiv.textContent = `Error: ${error.message}. Is Meme Search running?`;
    }
  }

  searchBtn.addEventListener('click', search);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') search();
  });
});
```

## Rails API Endpoints

### New Controller
```ruby
# app/controllers/api/extension_controller.rb
module Api
  class ExtensionController < ApplicationController
    skip_before_action :verify_authenticity_token
    before_action :verify_extension_request

    # POST /api/extension/save
    def save
      image_url = params[:image_url]

      # Download image from remote URL
      downloaded = download_image(image_url)
      return render json: { error: 'Failed to download image' }, status: :unprocessable_entity unless downloaded

      # Generate safe filename
      filename = generate_filename(image_url)
      save_path = Rails.root.join('public/memes/direct-uploads', filename)

      # Ensure directory exists
      FileUtils.mkdir_p(File.dirname(save_path))
      File.binwrite(save_path, downloaded[:data])

      # Create or find direct-uploads ImagePath
      image_path = ImagePath.find_or_create_by!(path: '/memes/direct-uploads') do |ip|
        ip.scan_status = 'pending'
      end

      # Check for duplicates via embedding similarity (if embeddings exist)
      duplicate = check_for_duplicate(downloaded[:data])

      # Create ImageCore
      image_core = ImageCore.create!(
        filename: filename,
        image_path: image_path,
        source_url: params[:source_url],
        source_title: params[:source_title],
        source_platform: params[:source_platform]
      )

      # Auto-create tags from suggested_tags
      if params[:suggested_tags].present?
        params[:suggested_tags].each do |tag_name|
          tag = TagName.find_or_create_by!(name: tag_name.downcase)
          ImageTag.find_or_create_by!(image_core: image_core, tag_name: tag)
        end
      end

      render json: {
        success: true,
        id: image_core.id,
        duplicate: duplicate.present?,
        duplicate_id: duplicate&.id
      }
    end

    # GET /api/extension/search
    def search
      query = params[:q]
      results = ImageCore.search_any_word(query).limit(20)

      render json: results.map { |ic|
        {
          id: ic.id,
          thumbnail: ic.thumbnail_url,
          description: ic.description&.truncate(100)
        }
      }
    end

    # GET /api/extension/image/:id
    def image
      image_core = ImageCore.find(params[:id])
      send_file image_core.full_path, disposition: 'inline'
    end

    private

    def verify_extension_request
      # Optional: verify extension API key
      # For local-only use, this can be permissive
      true
    end

    def download_image(url)
      uri = URI.parse(url)
      response = Net::HTTP.get_response(uri)

      return nil unless response.is_a?(Net::HTTPSuccess)
      return nil unless response.content_type&.start_with?('image/')

      { data: response.body, content_type: response.content_type }
    rescue StandardError => e
      Rails.logger.error("Failed to download image: #{e.message}")
      nil
    end

    def generate_filename(url)
      # Extract original filename or generate one
      uri = URI.parse(url)
      original = File.basename(uri.path)

      # Sanitize and ensure extension
      sanitized = original.gsub(/[^a-zA-Z0-9._-]/, '_')
      sanitized = "#{SecureRandom.hex(8)}.jpg" if sanitized.blank? || !sanitized.match?(/\.(jpg|jpeg|png|gif|webp)$/i)

      # Add timestamp to prevent collisions
      ext = File.extname(sanitized)
      base = File.basename(sanitized, ext)
      "#{base}_#{Time.current.to_i}#{ext}"
    end

    def check_for_duplicate(image_data)
      # TODO: Implement duplicate detection via embedding similarity
      # This requires generating an embedding for the new image
      # and comparing against existing embeddings
      nil
    end
  end
end
```

### Routes
```ruby
# config/routes.rb
namespace :api do
  namespace :extension do
    post 'save', to: 'extension#save'
    get 'search', to: 'extension#search'
    get 'image/:id', to: 'extension#image'
  end
end
```

### Database Migration
```ruby
# db/migrate/XXXXXX_add_source_fields_to_image_cores.rb
class AddSourceFieldsToImageCores < ActiveRecord::Migration[7.1]
  def change
    add_column :image_cores, :source_url, :string
    add_column :image_cores, :source_title, :string
    add_column :image_cores, :source_platform, :string

    add_index :image_cores, :source_platform
  end
end
```

## Browser Support

| Browser | Manifest Version | Notes |
|---------|-----------------|-------|
| Chrome | V3 | Primary target |
| Edge | V3 | Same as Chrome |
| Firefox | V2/V3 | Minor manifest differences |
| Safari | V3 | Requires Xcode for packaging |

### Firefox Compatibility
```json
// manifest.json additions for Firefox
{
  "browser_specific_settings": {
    "gecko": {
      "id": "meme-search@localhost",
      "strict_min_version": "109.0"
    }
  }
}
```

## Distribution Options

1. **Self-hosted**: Users load unpacked extension in developer mode
2. **Chrome Web Store**: Public listing (requires $5 fee, review process)
3. **Firefox Add-ons**: Public listing (free, review process)
4. **GitHub Releases**: ZIP download for manual install

**Recommended**: Start with self-hosted/GitHub releases, consider store listings later for discoverability.

## Implementation Phases

### Phase 1: Core Functionality (3-4 days)
- [ ] Create extension scaffold with Manifest V3
- [ ] Implement context menu "Save to Meme Search"
- [ ] Create Rails API endpoint for saving images
- [ ] Add source metadata fields to ImageCore
- [ ] Basic error handling and notifications

### Phase 2: Search Popup (2 days)
- [ ] Implement popup UI
- [ ] Create search API endpoint
- [ ] Click-to-copy functionality
- [ ] Connection status indicator

### Phase 3: Enhanced Features (2-3 days)
- [ ] Options page for configuration
- [ ] Auto-tagging from source URLs
- [ ] Tag dialog before save option
- [ ] Keyboard shortcuts

### Phase 4: Polish & Distribution (2 days)
- [ ] Firefox compatibility
- [ ] Documentation and README
- [ ] GitHub releases workflow
- [ ] Extension icons and branding

## Testing Strategy

### Extension Testing
- Manual testing across Chrome, Edge, Firefox
- Test with various image sources (Reddit, Twitter, Imgur, etc.)
- Test popup search with different collection sizes
- Test offline/error scenarios

### Rails API Testing
```ruby
# test/controllers/api/extension_controller_test.rb
class Api::ExtensionControllerTest < ActionDispatch::IntegrationTest
  test "save downloads and creates image" do
    # Mock HTTP request for image download
    stub_request(:get, "https://example.com/meme.jpg")
      .to_return(body: file_fixture("test_image.jpg").read,
                 headers: { 'Content-Type' => 'image/jpeg' })

    post api_extension_save_url, params: {
      image_url: "https://example.com/meme.jpg",
      source_url: "https://reddit.com/r/memes/123",
      source_title: "Funny meme",
      suggested_tags: ["r/memes"]
    }, as: :json

    assert_response :success
    assert ImageCore.exists?(source_url: "https://reddit.com/r/memes/123")
  end

  test "search returns matching results" do
    # Create test data with searchable content
    image_core = image_cores(:with_description)

    get api_extension_search_url, params: { q: "test" }

    assert_response :success
    results = JSON.parse(response.body)
    assert results.any? { |r| r['id'] == image_core.id }
  end
end
```

## Security Considerations

1. **CORS**: Extension requests come from `chrome-extension://` origin - Rails needs to allow this
2. **Local-only by default**: Server URL defaults to localhost, no external exposure
3. **Optional API key**: Can add simple key verification for multi-user setups
4. **Image validation**: Verify downloaded content is actually an image
5. **Filename sanitization**: Prevent path traversal in generated filenames

## Future Enhancements

- [ ] Duplicate detection using embedding similarity
- [ ] Batch save (select multiple images)
- [ ] Direct description generation trigger
- [ ] Sync status indicator
- [ ] Dark mode for popup
- [ ] Image preview before save
- [ ] Custom save location selection
