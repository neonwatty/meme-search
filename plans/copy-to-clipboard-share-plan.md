# Copy-to-Clipboard Share Plan

> **Feature**: One-click copy of meme + AI description, ready to paste anywhere. No uploads, no external services, works with every platform.

## Overview

A sharing feature that leverages the browser's Clipboard API to copy memes and their AI-generated descriptions directly to the clipboard. Users can then paste into any application - Discord, Slack, Twitter, iMessage, email, etc. This is the simplest, most universal sharing solution that requires zero external dependencies.

## Why This Matters

- **Universal**: Works with every platform that accepts pasted images/text
- **Zero dependencies**: No API keys, no external services, no accounts
- **Leverages AI**: Makes the generated descriptions actually useful beyond search
- **Fast**: Click → Paste → Done
- **Self-hosted friendly**: Nothing leaves the user's machine until they paste

## Share Modes

### Mode 1: Basic Copy
Simple copy buttons for image and caption separately.

### Mode 2: Platform Presets
Pre-formatted text for specific platforms (Twitter character limits, hashtag suggestions, etc.)

### Mode 3: Shareable Image Generation
Bake the AI caption INTO the image itself, creating a self-contained shareable meme.

---

## Technical Implementation

### Stimulus Controller

```javascript
// app/javascript/controllers/share_controller.js
import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["preview", "toast"]
  static values = {
    imageUrl: String,
    description: String,
    filename: String
  }

  // Mode 1: Copy image to clipboard
  async copyImage() {
    try {
      const response = await fetch(this.imageUrlValue)
      const blob = await response.blob()

      // Check if ClipboardItem is supported
      if (typeof ClipboardItem === 'undefined') {
        this.showToast("Your browser doesn't support image copying. Try right-click → Copy Image.", 'error')
        return
      }

      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ])

      this.showToast("Image copied to clipboard!")
    } catch (err) {
      console.error('Failed to copy image:', err)
      // Fallback: open image in new tab for manual copy
      window.open(this.imageUrlValue, '_blank')
      this.showToast("Opened image in new tab - copy manually", 'info')
    }
  }

  // Mode 1: Copy description text
  copyDescription() {
    navigator.clipboard.writeText(this.descriptionValue)
    this.showToast("Caption copied to clipboard!")
  }

  // Mode 2: Copy formatted for Discord
  copyForDiscord() {
    // Discord handles image + text well, just copy the description
    // User will paste image separately (Discord's UI handles this well)
    const text = this.descriptionValue
    navigator.clipboard.writeText(text)
    this.showToast("Caption copied! Paste after dropping the image in Discord")
  }

  // Mode 2: Copy formatted for Twitter
  copyForTwitter() {
    let text = this.descriptionValue

    // Truncate to Twitter's limit (280 chars)
    if (text.length > 280) {
      text = text.substring(0, 277) + "..."
    }

    // Optionally add hashtags based on content
    // const hashtags = this.suggestHashtags(text)
    // text = `${text}\n\n${hashtags.join(' ')}`

    navigator.clipboard.writeText(text)
    this.showToast("Tweet text copied! (280 char limit applied)")
  }

  // Mode 2: Copy formatted for Reddit
  copyForReddit() {
    // Reddit titles are typically shorter, more punchy
    let text = this.descriptionValue

    // Truncate to ~300 chars for title
    if (text.length > 300) {
      text = text.substring(0, 297) + "..."
    }

    navigator.clipboard.writeText(text)
    this.showToast("Title copied! Great for Reddit posts")
  }

  // Mode 3: Generate shareable image with caption baked in
  async generateShareableImage(event) {
    const style = event.currentTarget.dataset.style || 'bottom_caption'

    try {
      this.showToast("Generating shareable image...", 'info')

      // Fetch the generated image from server
      const response = await fetch(`${window.location.origin}/image_cores/${this.element.dataset.imageId}/shareable?style=${style}`)

      if (!response.ok) throw new Error('Failed to generate image')

      const blob = await response.blob()

      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])

      this.showToast("Shareable image copied!")
    } catch (err) {
      console.error('Failed to generate shareable image:', err)
      this.showToast("Failed to generate image. Try basic copy instead.", 'error')
    }
  }

  // Client-side shareable image generation (alternative to server-side)
  async generateShareableImageClientSide(event) {
    const style = event.currentTarget.dataset.style || 'bottom_caption'

    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      // Load original image
      const img = await this.loadImage(this.imageUrlValue)

      // Calculate dimensions based on style
      const dimensions = this.calculateDimensions(img, style)
      canvas.width = dimensions.width
      canvas.height = dimensions.height

      // Draw based on style
      switch (style) {
        case 'bottom_caption':
          this.drawBottomCaption(ctx, img, dimensions)
          break
        case 'meme_classic':
          this.drawMemeClassic(ctx, img, dimensions)
          break
        case 'minimal':
          this.drawMinimal(ctx, img, dimensions)
          break
        default:
          this.drawBottomCaption(ctx, img, dimensions)
      }

      // Copy to clipboard
      canvas.toBlob(async (blob) => {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ])
        this.showToast("Shareable image copied!")
      }, 'image/png')

    } catch (err) {
      console.error('Failed to generate image:', err)
      this.showToast("Failed to generate image", 'error')
    }
  }

  // Helper: Load image as HTMLImageElement
  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
  }

  // Helper: Calculate dimensions for different styles
  calculateDimensions(img, style) {
    const maxWidth = 800 // Cap width for reasonable file size
    const scale = img.width > maxWidth ? maxWidth / img.width : 1
    const width = Math.round(img.width * scale)
    const height = Math.round(img.height * scale)

    const captionHeight = this.calculateCaptionHeight(this.descriptionValue, width)

    switch (style) {
      case 'bottom_caption':
        return { width, height: height + captionHeight, imageHeight: height, captionHeight }
      case 'meme_classic':
        return { width, height, imageHeight: height, captionHeight: 0 }
      case 'minimal':
        return { width, height, imageHeight: height, captionHeight: 0 }
      default:
        return { width, height: height + captionHeight, imageHeight: height, captionHeight }
    }
  }

  // Helper: Calculate height needed for caption text
  calculateCaptionHeight(text, width) {
    const padding = 20
    const lineHeight = 24
    const fontSize = 16
    const charsPerLine = Math.floor((width - padding * 2) / (fontSize * 0.6))
    const lines = Math.ceil(text.length / charsPerLine)
    return Math.max(lines * lineHeight + padding * 2, 60)
  }

  // Style: Bottom Caption (white bar below image)
  drawBottomCaption(ctx, img, dimensions) {
    // Draw white background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Draw image at top
    ctx.drawImage(img, 0, 0, dimensions.width, dimensions.imageHeight)

    // Draw caption in white area below
    ctx.fillStyle = '#000000'
    ctx.font = '16px system-ui, -apple-system, sans-serif'
    this.wrapText(
      ctx,
      this.descriptionValue,
      15,
      dimensions.imageHeight + 25,
      dimensions.width - 30,
      24
    )
  }

  // Style: Classic Meme (Impact font top/bottom)
  drawMemeClassic(ctx, img, dimensions) {
    // Draw image
    ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height)

    // Setup Impact-style text
    const fontSize = Math.floor(dimensions.width / 12)
    ctx.font = `bold ${fontSize}px Impact, sans-serif`
    ctx.textAlign = 'center'
    ctx.lineWidth = fontSize / 15
    ctx.strokeStyle = '#000000'
    ctx.fillStyle = '#ffffff'

    // Split description roughly in half for top/bottom
    const words = this.descriptionValue.split(' ')
    const midpoint = Math.ceil(words.length / 2)
    const topText = words.slice(0, midpoint).join(' ').toUpperCase()
    const bottomText = words.slice(midpoint).join(' ').toUpperCase()

    // Draw top text
    ctx.strokeText(topText, dimensions.width / 2, fontSize + 10)
    ctx.fillText(topText, dimensions.width / 2, fontSize + 10)

    // Draw bottom text
    ctx.strokeText(bottomText, dimensions.width / 2, dimensions.height - 15)
    ctx.fillText(bottomText, dimensions.width / 2, dimensions.height - 15)
  }

  // Style: Minimal (semi-transparent overlay at bottom)
  drawMinimal(ctx, img, dimensions) {
    // Draw image
    ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height)

    // Draw semi-transparent overlay at bottom
    const overlayHeight = 80
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, dimensions.height - overlayHeight, dimensions.width, overlayHeight)

    // Draw text
    ctx.fillStyle = '#ffffff'
    ctx.font = '14px system-ui, -apple-system, sans-serif'
    this.wrapText(
      ctx,
      this.descriptionValue,
      15,
      dimensions.height - overlayHeight + 25,
      dimensions.width - 30,
      20
    )
  }

  // Helper: Wrap text to fit width
  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ')
    let line = ''

    for (const word of words) {
      const testLine = line + word + ' '
      const metrics = ctx.measureText(testLine)

      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line.trim(), x, y)
        line = word + ' '
        y += lineHeight
      } else {
        line = testLine
      }
    }
    ctx.fillText(line.trim(), x, y)
  }

  // Helper: Show toast notification
  showToast(message, type = 'success') {
    // Use existing notification system or create simple toast
    const toast = document.createElement('div')
    toast.className = `toast toast-${type}`
    toast.textContent = message
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 24px;
      background: ${type === 'error' ? '#dc3545' : type === 'info' ? '#0d6efd' : '#198754'};
      color: white;
      border-radius: 8px;
      font-size: 14px;
      z-index: 9999;
      animation: slideIn 0.3s ease;
    `

    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 3000)
  }
}
```

### CSS for Toast Animation

```css
/* app/assets/stylesheets/components/_toasts.css */
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast {
  animation: slideIn 0.3s ease;
}
```

---

## Server-Side Shareable Image Generation

For higher quality output and more style options, generate images server-side.

### Controller Action

```ruby
# app/controllers/image_cores_controller.rb
class ImageCoresController < ApplicationController
  # GET /image_cores/:id/shareable
  def shareable
    @image_core = ImageCore.find(params[:id])
    style = params[:style] || 'bottom_caption'

    image_data = ShareableImageGenerator.generate(
      image_path: @image_core.full_path,
      caption: @image_core.description || "No description",
      style: style.to_sym
    )

    send_data image_data,
              type: 'image/png',
              disposition: 'inline',
              filename: "#{@image_core.filename.gsub(/\.[^.]+$/, '')}_share.png"
  end
end
```

### Routes

```ruby
# config/routes.rb
resources :image_cores do
  member do
    get :shareable
  end
end
```

### Image Generator Service

```ruby
# app/services/shareable_image_generator.rb
class ShareableImageGenerator
  STYLES = {
    bottom_caption: :generate_bottom_caption,
    meme_classic: :generate_meme_classic,
    minimal: :generate_minimal,
    twitter_card: :generate_twitter_card
  }.freeze

  def self.generate(image_path:, caption:, style:)
    new(image_path, caption).send(STYLES[style] || :generate_bottom_caption)
  end

  def initialize(image_path, caption)
    @image = MiniMagick::Image.open(image_path)
    @caption = caption
    @width = [@image.width, 800].min  # Cap at 800px
    @scale = @width.to_f / @image.width
    @height = (@image.height * @scale).round
  end

  # Style: White caption bar below image
  def generate_bottom_caption
    caption_height = calculate_caption_height

    # Resize original image
    @image.resize "#{@width}x#{@height}"

    # Create caption bar
    caption_bar = MiniMagick::Image.open("#{Rails.root}/app/assets/images/blank.png")
    caption_bar.combine_options do |c|
      c.resize "#{@width}x#{caption_height}!"
      c.background 'white'
      c.gravity 'Center'
      c.fill 'black'
      c.font 'Helvetica'
      c.pointsize 16
      c.annotate '+0+0', word_wrap(@caption, @width - 30)
    end

    # Stack images vertically
    result = MiniMagick::Image.open(@image.path)
    result.combine_options do |c|
      c.append
    end

    # Alternative using convert
    MiniMagick::Tool::Convert.new do |convert|
      convert << @image.path
      convert.resize "#{@width}x#{@height}"
      convert.gravity 'North'
      convert << '-'
      convert.background 'white'
      convert.splice "0x#{caption_height}"
      convert.gravity 'South'
      convert.fill 'black'
      convert.font 'Helvetica'
      convert.pointsize 16
      convert.annotate '+0+10', word_wrap(@caption, @width - 30)
      convert << 'PNG:-'
    end
  end

  # Style: Classic meme with Impact font
  def generate_meme_classic
    words = @caption.split(' ')
    midpoint = (words.length / 2.0).ceil
    top_text = words[0...midpoint].join(' ').upcase
    bottom_text = words[midpoint..].join(' ').upcase

    font_size = (@width / 10).clamp(24, 72)

    @image.resize "#{@width}x#{@height}"

    @image.combine_options do |c|
      c.gravity 'North'
      c.fill 'white'
      c.stroke 'black'
      c.strokewidth 2
      c.font 'Impact'
      c.pointsize font_size
      c.annotate '+0+10', top_text

      c.gravity 'South'
      c.annotate '+0+10', bottom_text
    end

    @image.to_blob
  end

  # Style: Semi-transparent overlay
  def generate_minimal
    overlay_height = 80

    @image.resize "#{@width}x#{@height}"

    @image.combine_options do |c|
      # Draw dark overlay at bottom
      c.fill 'rgba(0,0,0,0.7)'
      c.draw "rectangle 0,#{@height - overlay_height} #{@width},#{@height}"

      # Add text
      c.gravity 'South'
      c.fill 'white'
      c.font 'Helvetica'
      c.pointsize 14
      c.annotate '+0+30', word_wrap(@caption, @width - 30)
    end

    @image.to_blob
  end

  # Style: Twitter card format
  def generate_twitter_card
    # Twitter cards are typically 1200x628 or 800x418
    card_width = 800
    card_height = 418

    # Create blank card
    MiniMagick::Tool::Convert.new do |convert|
      convert.size "#{card_width}x#{card_height}"
      convert.xc 'white'

      # Add image on left side (square crop)
      # Add text on right side
      # ... implementation details

      convert << 'PNG:-'
    end
  end

  private

  def calculate_caption_height
    chars_per_line = (@width - 30) / 10  # Rough estimate
    lines = (@caption.length / chars_per_line.to_f).ceil
    [lines * 24 + 30, 60].max
  end

  def word_wrap(text, max_width, font_size = 16)
    chars_per_line = (max_width / (font_size * 0.6)).floor
    text.scan(/.{1,#{chars_per_line}}(?:\s|$)/).map(&:strip).join("\n")
  end
end
```

---

## View Integration

### Share Buttons Partial

```erb
<%# app/views/image_cores/_share_buttons.html.erb %>
<div class="share-panel"
     data-controller="share"
     data-share-image-url-value="<%= image_core.public_url %>"
     data-share-description-value="<%= image_core.description %>"
     data-share-filename-value="<%= image_core.filename %>"
     data-image-id="<%= image_core.id %>">

  <h4 class="share-title">Share</h4>

  <!-- Basic Copy -->
  <div class="share-section">
    <div class="share-buttons">
      <button class="btn btn-secondary" data-action="share#copyImage">
        <svg class="icon"><!-- clipboard icon --></svg>
        Copy Image
      </button>
      <button class="btn btn-secondary" data-action="share#copyDescription">
        <svg class="icon"><!-- text icon --></svg>
        Copy Caption
      </button>
    </div>
  </div>

  <!-- Platform Presets -->
  <div class="share-section">
    <label class="share-label">Copy for platform:</label>
    <div class="share-buttons">
      <button class="btn btn-outline" data-action="share#copyForDiscord">
        <svg class="icon"><!-- discord icon --></svg>
        Discord
      </button>
      <button class="btn btn-outline" data-action="share#copyForTwitter">
        <svg class="icon"><!-- twitter icon --></svg>
        Twitter/X
      </button>
      <button class="btn btn-outline" data-action="share#copyForReddit">
        <svg class="icon"><!-- reddit icon --></svg>
        Reddit
      </button>
    </div>
  </div>

  <!-- Shareable Image Generation -->
  <% if image_core.description.present? %>
    <div class="share-section">
      <label class="share-label">Generate shareable image:</label>
      <div class="style-grid">
        <button class="style-option"
                data-action="share#generateShareableImageClientSide"
                data-style="bottom_caption">
          <div class="style-preview style-preview-bottom"></div>
          <span>Caption Bar</span>
        </button>
        <button class="style-option"
                data-action="share#generateShareableImageClientSide"
                data-style="meme_classic">
          <div class="style-preview style-preview-classic"></div>
          <span>Classic Meme</span>
        </button>
        <button class="style-option"
                data-action="share#generateShareableImageClientSide"
                data-style="minimal">
          <div class="style-preview style-preview-minimal"></div>
          <span>Minimal</span>
        </button>
      </div>
    </div>
  <% end %>
</div>
```

### Styles

```css
/* app/assets/stylesheets/components/_share.css */
.share-panel {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-top: 16px;
}

.share-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-secondary);
}

.share-section {
  margin-bottom: 16px;
}

.share-section:last-child {
  margin-bottom: 0;
}

.share-label {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.share-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.style-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.style-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.style-option:hover {
  border-color: var(--primary);
}

.style-preview {
  width: 60px;
  height: 60px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  margin-bottom: 8px;
  position: relative;
}

.style-preview-bottom::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 15px;
  background: white;
  border-top: 1px solid var(--border-color);
}

.style-preview-classic::before,
.style-preview-classic::after {
  content: 'TEXT';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 8px;
  font-weight: bold;
  color: white;
  text-shadow: 1px 1px 0 black;
}

.style-preview-classic::before { top: 4px; }
.style-preview-classic::after { bottom: 4px; }

.style-preview-minimal::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 20px;
  background: rgba(0,0,0,0.7);
}

.style-option span {
  font-size: 11px;
  color: var(--text-secondary);
}
```

---

## UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│ Meme Details                                    [Edit] [×]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────┐                  │
│  │                                       │                  │
│  │             [meme image]              │                  │
│  │                                       │                  │
│  └───────────────────────────────────────┘                  │
│                                                             │
│  Description:                                               │
│  "A cat staring at a computer screen with a confused       │
│   expression, representing the feeling of debugging at 3am" │
│                                                             │
│  Tags: [programming] [cats] [relatable]                    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Share                                                │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                      │   │
│  │  [📋 Copy Image]  [📝 Copy Caption]                 │   │
│  │                                                      │   │
│  │  Copy for platform:                                 │   │
│  │  [Discord]  [Twitter/X]  [Reddit]                   │   │
│  │                                                      │   │
│  │  Generate shareable image:                          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │   │
│  │  │ ┌──────┐ │ │ ┌──────┐ │ │ ┌──────┐ │            │   │
│  │  │ │      │ │ │ │ TEXT │ │ │ │      │ │            │   │
│  │  │ │ IMG  │ │ │ │      │ │ │ │ ████ │ │            │   │
│  │  │ └──────┘ │ │ │ TEXT │ │ │ └──────┘ │            │   │
│  │  │ caption  │ │ └──────┘ │ │          │            │   │
│  │  └──────────┘ └──────────┘ └──────────┘            │   │
│  │  Caption Bar   Classic      Minimal                │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Basic Copy Buttons (1 day)
- [x] Create share_controller.js Stimulus controller
- [x] Implement copyImage() using Clipboard API
- [x] Implement copyDescription()
- [x] Add toast notifications
- [x] Integrate into image detail view

### Phase 2: Platform Presets (0.5 days)
- [x] Add copyForDiscord()
- [x] Add copyForTwitter() with character truncation
- [x] Add copyForReddit()
- [x] Style platform buttons

### Phase 3: Client-Side Image Generation (1-2 days)
- [ ] Implement Canvas-based image generation
- [ ] Add bottom_caption style
- [ ] Add meme_classic style
- [ ] Add minimal style
- [ ] Style picker UI

### Phase 4: Server-Side Generation (Optional, 1-2 days)
- [ ] Add MiniMagick/ImageMagick dependency
- [ ] Create ShareableImageGenerator service
- [ ] Add /shareable endpoint
- [ ] Higher quality output than Canvas

### Phase 5: Polish (0.5 days)
- [ ] Browser compatibility testing
- [ ] Fallback for unsupported browsers
- [ ] Loading states during generation
- [ ] Preview before copy

---

## Browser Compatibility

| Browser | Copy Image | Copy Text | Canvas Generation |
|---------|------------|-----------|-------------------|
| Chrome 76+ | ✅ | ✅ | ✅ |
| Edge 79+ | ✅ | ✅ | ✅ |
| Firefox 63+ | ⚠️ (limited) | ✅ | ✅ |
| Safari 13.1+ | ✅ | ✅ | ✅ |

**Firefox note**: Firefox has limited ClipboardItem support. Fallback to opening image in new tab.

---

## Testing Strategy

### JavaScript Tests
```javascript
// test/javascript/share_controller.test.js
import { Application } from "@hotwired/stimulus"
import ShareController from "controllers/share_controller"

describe("ShareController", () => {
  beforeEach(() => {
    // Setup DOM and controller
  })

  test("copyDescription copies text to clipboard", async () => {
    const writeTextSpy = jest.spyOn(navigator.clipboard, 'writeText')

    // Trigger action
    controller.copyDescription()

    expect(writeTextSpy).toHaveBeenCalledWith("Test description")
  })

  test("copyForTwitter truncates to 280 characters", async () => {
    controller.descriptionValue = "A".repeat(300)
    const writeTextSpy = jest.spyOn(navigator.clipboard, 'writeText')

    controller.copyForTwitter()

    const copiedText = writeTextSpy.mock.calls[0][0]
    expect(copiedText.length).toBeLessThanOrEqual(280)
    expect(copiedText).toEndWith("...")
  })
})
```

### Rails Controller Tests
```ruby
# test/controllers/image_cores_controller_test.rb
class ImageCoresControllerTest < ActionDispatch::IntegrationTest
  test "shareable returns PNG image" do
    image_core = image_cores(:with_description)

    get shareable_image_core_path(image_core, style: 'bottom_caption')

    assert_response :success
    assert_equal 'image/png', response.content_type
  end

  test "shareable handles missing description gracefully" do
    image_core = image_cores(:without_description)

    get shareable_image_core_path(image_core)

    assert_response :success
  end
end
```

---

## Security Considerations

1. **CORS for images**: Ensure images can be loaded cross-origin for Canvas
2. **XSS in captions**: Sanitize text before rendering on Canvas
3. **Memory limits**: Large images could cause Canvas memory issues - cap at reasonable size
4. **Rate limiting**: Server-side generation could be CPU intensive

---

## Future Enhancements

- [ ] Custom text styling (color, font, size)
- [ ] Image filters (brightness, contrast, saturation)
- [ ] Watermark option (subtle branding)
- [ ] QR code with link back to collection
- [ ] Batch copy (multiple memes)
- [ ] Share history/analytics
- [ ] Keyboard shortcuts (Ctrl+C variants)
