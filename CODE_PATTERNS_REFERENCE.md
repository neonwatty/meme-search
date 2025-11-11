# Code Patterns Reference
## Reusable Patterns from Meme Search Rails App

This document provides copy-paste ready code examples for implementing bulk operations.

---

## 1. GENERATE DESCRIPTION PATTERN (EXISTING)

### File: `/app/views/image_cores/_generate_status.html.erb`

Shows how single image generation is currently implemented:

```erb
<div id="<%= div_id %>">
  <% case status %>
  <% when "not_started" %>
    <div class="flex flex-row space-x-1">
      <%= form_with(url: generate_description_image_core_path(img_id), local: true) do |form| %>
        <% form.submit "generate description 🪄", class: "bg-blue-500 border hover:bg-cyan-500 cursor-pointer w-auto py-1 px-2 rounded-2xl" %>
      <% end %>
    </div>
  <% when "in_queue" %>
    <div class="flex flex-row space-x-1">
      <div class="bg-amber-500 w-auto py-1 px-2 rounded-2xl">in_queue</div>
      <%= form_with(url: generate_stopper_image_core_path(img_id), local: true) do |form| %>
        <% form.submit "cancel", class: "bg-red-500 hover:bg-red-400 cursor-pointer w-auto py-1 px-2 rounded-2xl" %>
      <% end %>
    </div>
  <% when "processing" %>
    <div class="bg-emerald-500 w-auto py-1 px-2 rounded-2xl text-sm">processing</div>
  <% when "done" %>
    <%= form_with(url: generate_description_image_core_path(img_id), local: true) do |form| %>
      <% form.submit "generate description 🪄", class: "bg-blue-500 border hover:bg-cyan-500 cursor-pointer w-auto py-1 px-2 rounded-2xl" %>
    <% end %>
  <% when "removing" %>
    <div class="bg-red-500 w-auto py-1 px-2 rounded-2xl text-sm">removing</div>
  <% when "failed" %>
    <div class="bg-red-500 w-auto py-1 px-2 rounded-2xl text-sm">failed</div>
  <% end %>
</div>
```

**Key Points**:
- Status enum values: not_started, in_queue, processing, done, removing, failed
- Form submission pattern with form_with + submit
- Color-coded badges (amber for queue, emerald for processing, red for error)
- Two routes: generate_description_image_core_path, generate_stopper_image_core_path

---

## 2. CONTROLLER PATTERN (EXISTING)

### File: `/app/controllers/image_cores_controller.rb` - generate_description action

```ruby
def generate_description
  status = @image_core.status
  if status != "in_queue" && status != "processing"
    # update status of instance
    @image_core.status = 1  # in_queue
    @image_core.save

    # get current model
    current_model = ImageToText.find_by(current: true)

    # send request
    uri = URI("http://image_to_text_generator:8000/add_job")
    http = Net::HTTP.new(uri.host, uri.port)
    request = Net::HTTP::Post.new(uri)
    request["Content-Type"] = "application/json"
    data = { 
      image_core_id: @image_core.id, 
      image_path: @image_core.image_path.name + "/" + @image_core.name, 
      model: current_model.name 
    }
    request.body = data.to_json
    response = http.request(request)

    respond_to do |format|
      if response.is_a?(Net::HTTPSuccess)
        # Success - Python service accepted job
      else
        flash[:alert] = "Cannot generate description, your image to text generator is offline!"
        format.html { redirect_back_or_to root_path }
      end
    end
  else
    respond_to do |format|
      flash[:alert] = "Image currently in queue for text description generation or processing."
      format.html { redirect_back_or_to root_path }
    end
  end
end
```

**Key Points**:
- Status check before proceeding (prevent duplicate queuing)
- GET current model: `ImageToText.find_by(current: true)`
- HTTP POST to Python service: `http://image_to_text_generator:8000/add_job`
- JSON payload: image_core_id, image_path, model
- Respond to format.html with flash message

---

## 3. ACTIONCABLE BROADCAST PATTERN (EXISTING)

### File: `/app/controllers/image_cores_controller.rb` - status_receiver action

Shows how status updates broadcast to all connected clients:

```ruby
def status_receiver
  received_data = params[:data]
  id = received_data[:image_core_id].to_i
  status = received_data[:status].to_i
  image_core = ImageCore.find(id)
  image_core.status = status
  img_id = image_core.id
  div_id = "status-image-core-id-#{image_core.id}"
  
  if image_core.save
    # Render partial to HTML string
    status_html = ApplicationController.renderer.render(
      partial: "image_cores/generate_status", 
      locals: { 
        img_id: img_id, 
        div_id: div_id, 
        status: image_core.status 
      }
    )
    # Broadcast to all connected clients
    ActionCable.server.broadcast "image_status_channel", { 
      div_id: div_id, 
      status_html: status_html 
    }
  end
end
```

**Key Points**:
- Webhook endpoint for Python service to call
- Render partial to string (not full view)
- ActionCable.server.broadcast with channel name and data
- Send div_id + HTML content for client to inject

### File: `/app/javascript/channels/image_status_channel.js`

Shows how client receives broadcasts:

```javascript
import consumer from "channels/consumer";

consumer.subscriptions.create("ImageStatusChannel", {
  connected() {
    // Called when subscription ready
  },

  disconnected() {
    // Called when subscription terminated
  },

  received(data) {
    // Called when data received on websocket
    const statusDiv = document.getElementById(data.div_id);
    if (statusDiv) {
      statusDiv.innerHTML = data.status_html;
    }
  },
});
```

**Key Points**:
- Subscribe to channel by name matching Rails channel class
- Implement received(data) callback
- Update DOM by finding element by div_id
- Replace innerHTML with new HTML

---

## 4. FILTER COMPONENTS PATTERN (REUSABLE)

### File: `/app/views/image_cores/_tag_toggle.html.erb`

Multi-select filter component you can reuse:

```erb
<% tag_names = TagName.all.map {|item| item.name.strip} %>
<div id="tag_toggle">
  <%= fields_for :search_tags do |tag_fields| %>
    <div class="flex flex-col">
      <div data-controller="multi-select" data-multi-select-auto-submit-value="false" class="relative">
        <input type="hidden" name="selected_tag_names" value="" id="hidden_selected_tag_names">
        <button
          type="button"
          data-action="click->multi-select#toggle"
          class="w-full px-6 py-4 text-left bg-white/90 dark:bg-slate-700/90 backdrop-blur-lg border border-white/20 dark:border-white/10 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-between">
          <span class="flex-1 text-gray-900 dark:text-white" id="selected_tag_names" data-multi-select-target="selectedItems">Choose tags</span>
          <svg class="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div
          data-multi-select-target="options"
          class="absolute left-0 right-0 mt-2 hidden bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl z-10 max-h-64 overflow-y-auto">
          <div class="p-4 space-y-2">
            <% tag_names.each_with_index do |tag, index|  %>
              <label class="flex items-center px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition">
                <%= tag_fields.text_field :tag,
                          class: 'mr-3 rounded',
                          data: { action: "change->multi-select#updateSelection" },
                          type: "checkbox",
                          value: tag.to_s.downcase,
                          checked: false %>
                <span><%= tag.to_s %></span>
              </label>
            <% end %>
          </div>
        </div>
      </div>
    </div>
  <% end %>
</div>
```

**Key Points**:
- Stimulus controller: multi-select
- Hidden input captures selected values: selected_tag_names
- Dropdown toggles on button click
- Checkboxes update selection via change event
- Data goes to hidden input as comma-separated values

### File: `/app/views/image_cores/_filter_chips.html.erb`

Active filter display you can reuse:

```erb
<%
  selected_tag_names = params[:selected_tag_names]&.split(",")&.map(&:strip) || []
  selected_path_names = params[:selected_path_names]&.split(",")&.map(&:strip) || []
  has_active_filters = selected_tag_names.any? || selected_path_names.any?
%>

<% if has_active_filters %>
  <div class="flex flex-wrap items-center gap-3 mb-6 max-w-4xl mx-auto">
    <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Active filters:</span>

    <% selected_tag_names.each do |tag_name| %>
      <%
        remaining_tags = selected_tag_names - [tag_name]
        remove_url = image_cores_path(
          selected_tag_names: remaining_tags.join(","),
          selected_path_names: params[:selected_path_names]
        )
      %>
      <%= render 'filter_chip',
        label: "Tag: #{tag_name}",
        color: "#4ECDC4",
        remove_url: remove_url %>
    <% end %>

    <%= link_to "Clear all", image_cores_path,
      class: "text-sm text-gray-600 dark:text-gray-400 hover:text-red-500 transition ml-2" %>
  </div>
<% end %>
```

**Key Points**:
- Parse params and build sets of active filters
- Loop each filter and render chip partial
- Build remove URLs that exclude individual filter
- "Clear all" link resets to root path

---

## 5. FILTER CHIP COMPONENT (REUSABLE)

### File: `/app/views/image_cores/_filter_chip.html.erb`

Individual filter chip (referenced above):

```erb
<div class="flex items-center gap-2 px-3 py-1 rounded-full text-sm" 
     style="background-color: <%= color %>33;">
  <span class="text-gray-800 dark:text-gray-200"><%= label %></span>
  <%= link_to "×", remove_url, 
      class: "ml-1 font-bold hover:opacity-75 transition" %>
</div>
```

**Key Points**:
- Color with 33 alpha for transparency (light background)
- X symbol for removal
- Link removes individual filter
- Minimal markup, reusable

---

## 6. STIMULUS CONTROLLER PATTERN

### File: `/app/javascript/controllers/view_switcher_controller.js`

Shows pattern for state management + sessionStorage:

```javascript
import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["listView", "gridView", "masonryView", "toggleButton"];

  connect() {
    // Restore view mode from sessionStorage
    this.viewMode = sessionStorage.getItem("viewMode") || "list";
    this.updateView();
  }

  get viewMode() {
    return this.data.get("viewMode") || "list";
  }

  set viewMode(mode) {
    this.data.set("viewMode", mode);
    sessionStorage.setItem("viewMode", mode);
  }

  toggleView() {
    // Cycle through modes
    const modes = ["list", "grid", "masonry"];
    const currentIndex = modes.indexOf(this.viewMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.viewMode = modes[nextIndex];
    this.updateView();
  }

  updateView() {
    if (this.hasListViewTarget && this.hasGridViewTarget && this.hasMasonryViewTarget) {
      // Hide all views
      this.listViewTarget.classList.toggle("hidden", this.viewMode !== "list");
      this.gridViewTarget.classList.toggle("hidden", this.viewMode !== "grid");
      this.masonryViewTarget.classList.toggle("hidden", this.viewMode !== "masonry");

      // Update button
      if (this.hasToggleButtonTarget) {
        const labels = {
          list: "Switch to Grid View",
          grid: "Switch to Masonry View",
          masonry: "Switch to List View"
        };
        this.toggleButtonTarget.textContent = labels[this.viewMode];
      }
    }
  }
}
```

**Key Points**:
- Define targets as array: static targets = [...]
- Use this.data for instance-level state
- Persist to sessionStorage for page reloads
- Check hasXxxTarget before accessing
- Use classList.toggle for visibility
- Getter/setter for cleaner code

---

## 7. FORM SUBMISSION PATTERN

Standard Rails form for actions:

```erb
<%= form_with(url: action_path, local: true) do |form| %>
  <% form.submit "Button Text", class: "px-6 py-3 bg-blue-500 rounded-2xl text-white" %>
<% end %>
```

**Key Points**:
- form_with handles CSRF token automatically
- local: true for Turbo compatibility
- class parameter for styling
- Local variable `form` for building fields

---

## 8. SETTINGS PAGE PATTERN (EXISTING)

### File: `/app/views/settings/image_paths/index.html.erb`

Shows pattern for settings list with actions:

```erb
<div class="w-full px-4 py-8">
  <!-- Header -->
  <div class="flex flex-col sm:flex-row items-center justify-between mb-8">
    <div>
      <h1 class="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600">
        Manage Directory Paths
      </h1>
      <p class="text-gray-600 dark:text-gray-400 mt-2">Configure meme source directories</p>
    </div>
    <div class="mt-4 sm:mt-0">
      <%= link_to "Create new", [:new, :settings, :image_path], class: "px-6 py-3 bg-indigo-500 text-white rounded-2xl" %>
    </div>
  </div>

  <!-- Cards Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <% @image_paths.each do |image_path| %>
      <div class="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all">
        <%= render image_path %>
        
        <!-- Actions -->
        <div class="mt-4 pt-4 border-t border-gray-200/50 flex flex-wrap gap-2">
          <%= link_to "Edit", [:settings, image_path], class: "px-4 py-2 bg-indigo-100 text-indigo-700 rounded-xl text-sm" %>
          <%= button_to "Rescan", rescan_settings_image_path_path(image_path), method: :post, class: "px-4 py-2 bg-white border-2 border-black rounded-xl text-sm" %>
        </div>
      </div>
    <% end %>
  </div>

  <!-- Pagination -->
  <div class="flex justify-center mt-8">
    <%== pagy_nav(@pagy) if @pagy.pages > 1 %>
  </div>
</div>
```

**Key Points**:
- Responsive grid (1-3 columns)
- Glassmorphic card design
- Header with create button
- Action buttons in card footer
- Pagination support

---

## 9. PROGRESS BAR PATTERN (NEW)

Recommended for bulk operations:

```erb
<div class="mt-8 w-full">
  <div class="flex items-center justify-between mb-2">
    <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">
      Progress
    </span>
    <span class="text-sm font-semibold text-gray-700 dark:text-gray-300" id="progress-text">
      0 / 0
    </span>
  </div>
  
  <progress 
    id="bulk-progress-bar"
    class="w-full h-3 rounded-full" 
    value="0" 
    max="100">
  </progress>
  
  <p class="text-sm text-gray-600 dark:text-gray-400 mt-2" id="progress-status">
    Ready to generate descriptions
  </p>
</div>

<style>
  progress {
    background-color: #f0f0f0;
    border-radius: 8px;
    overflow: hidden;
  }
  
  progress::-webkit-progress-bar {
    background-color: #f0f0f0;
    border-radius: 8px;
  }
  
  progress::-webkit-progress-value {
    background: linear-gradient(90deg, #10b981 0%, #14b8a6 100%);
    border-radius: 8px;
  }
  
  progress::-moz-progress-bar {
    background: linear-gradient(90deg, #10b981 0%, #14b8a6 100%);
    border-radius: 8px;
  }
</style>
```

**Key Points**:
- Progress element with value/max attributes
- Text showing current/total counts
- Status message below
- Gradient styling (emerald to teal)
- JavaScript updates value: `element.value = percentage`

---

## 10. BULK OPERATION STIMULUS CONTROLLER (NEW)

Template for tracking bulk operation progress:

```javascript
import { Controller } from "@hotwired/stimulus";
import consumer from "channels/consumer";

export default class extends Controller {
  static targets = ["progressBar", "progressText", "progressStatus", "generateButton"];

  connect() {
    this.completed = 0;
    this.total = 0;
    
    // Subscribe to bulk operation channel
    this.subscription = consumer.subscriptions.create(
      { channel: "BulkOperationChannel" },
      {
        connected: () => console.log("Connected to BulkOperationChannel"),
        received: (data) => this.handleProgress(data)
      }
    );
  }

  disconnect() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  startGeneration(event) {
    event.preventDefault();
    
    if (this.hasGenerateButtonTarget) {
      this.generateButtonTarget.disabled = true;
      this.generateButtonTarget.textContent = "Generating...";
    }

    // POST request to start bulk generation
    const form = event.target.closest("form");
    const formData = new FormData(form);
    
    fetch(form.action, {
      method: "POST",
      body: formData,
      headers: {
        "X-CSRF-Token": document.querySelector("[name='csrf-token']").content
      }
    })
    .catch(error => console.error("Error:", error));
  }

  handleProgress(data) {
    this.completed = data.completed;
    this.total = data.total;
    
    const percentage = this.total > 0 ? (this.completed / this.total) * 100 : 0;
    
    if (this.hasProgressBarTarget) {
      this.progressBarTarget.value = percentage;
    }
    
    if (this.hasProgressTextTarget) {
      this.progressTextTarget.textContent = `${this.completed} / ${this.total}`;
    }
    
    if (this.hasProgressStatusTarget) {
      if (this.completed === this.total && this.total > 0) {
        this.progressStatusTarget.textContent = "Complete!";
        this.progressStatusTarget.classList.add("text-emerald-600");
      } else {
        this.progressStatusTarget.textContent = `Processing image ${data.current_image_id}...`;
      }
    }
  }
}
```

**Key Points**:
- Subscribe to ActionCable channel in connect()
- Unsubscribe in disconnect()
- Handle received data to update progress
- Button state management (disabled/text)
- Percentage calculation
- Status message updates

---

## 11. BULK OPERATION ACTIONCABLE CHANNEL (NEW)

Ruby ActionCable channel for broadcasting progress:

```ruby
# app/channels/bulk_operation_channel.rb
class BulkOperationChannel < ApplicationCable::Channel
  def subscribed
    stream_from "bulk_operation_channel"
  end

  def unsubscribed
    # Any cleanup needed
  end
end
```

**Usage in controller**:

```ruby
# app/controllers/image_cores_controller.rb
def bulk_generate_descriptions
  # Get images based on filters
  images = get_filtered_images(params)
  total = images.count
  
  images.each_with_index do |image_core, index|
    # Skip if already queued or processing
    if image_core.status != "in_queue" && image_core.status != "processing"
      # Queue the job
      image_core.status = 1  # in_queue
      image_core.save
      
      current_model = ImageToText.find_by(current: true)
      uri = URI("http://image_to_text_generator:8000/add_job")
      # ... make HTTP request ...
      
      # Broadcast progress
      completed = index + 1
      ActionCable.server.broadcast "bulk_operation_channel", {
        completed: completed,
        total: total,
        current_image_id: image_core.id
      }
    end
  end
  
  respond_to do |format|
    format.html { redirect_to settings_bulk_operations_path, notice: "Bulk generation started" }
  end
end

private

def get_filtered_images(params)
  images = ImageCore.all
  
  if params[:selected_tag_names].present?
    tag_names = params[:selected_tag_names].split(",").map(&:strip)
    images = images.with_selected_tag_names(tag_names)
  end
  
  if params[:selected_path_names].present?
    path_names = params[:selected_path_names].split(",").map(&:strip)
    path_ids = ImagePath.where(name: path_names).pluck(:id)
    images = images.where(image_path_id: path_ids)
  end
  
  if params[:has_embeddings].present?
    images = images.select { |img| img.image_embeddings.any? }
  end
  
  images
end
```

**Key Points**:
- Broadcast after each image is queued
- Send completed count, total, and current image ID
- Filter images based on params (reuse existing logic)
- Use same image generation logic for each image

---

## Quick Copy-Paste Checklist

Use these patterns for bulk operations:

- [ ] Copy filter components (_tag_toggle, _path_toggle, _filter_chips)
- [ ] Copy form submission pattern for bulk action button
- [ ] Copy ActionCable broadcast pattern for progress updates
- [ ] Copy Stimulus controller pattern for state management
- [ ] Copy settings page layout for UI structure
- [ ] Copy progress bar HTML/CSS for visual feedback
- [ ] Copy controller action pattern for image iteration
- [ ] Use emerald gradient for bulk operation buttons (consistency)
- [ ] Use glassmorphic card style for settings pages (consistency)
- [ ] Use flash messages for success/error feedback (consistency)

