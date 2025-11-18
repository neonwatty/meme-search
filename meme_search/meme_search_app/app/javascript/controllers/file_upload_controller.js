import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = [
    "dropzone",
    "fileInput",
    "preview",
    "uploadButton",
    "progressContainer",
    "progressBar",
    "progressText",
    "successMessage",
    "errorMessage",
  ];

  connect() {
    this.files = [];
  }

  // Handle file input change
  handleFileSelect(event) {
    const files = Array.from(event.target.files);
    this.addFiles(files);
  }

  // Handle drag over
  handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    this.dropzoneTarget.classList.add(
      "border-blue-500",
      "bg-blue-50",
      "dark:bg-blue-900/20"
    );
  }

  // Handle drag leave
  handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    this.dropzoneTarget.classList.remove(
      "border-blue-500",
      "bg-blue-50",
      "dark:bg-blue-900/20"
    );
  }

  // Handle drop
  handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    this.dropzoneTarget.classList.remove(
      "border-blue-500",
      "bg-blue-50",
      "dark:bg-blue-900/20"
    );

    const files = Array.from(event.dataTransfer.files);
    this.addFiles(files);
  }

  // Add files to the list
  addFiles(newFiles) {
    // Filter for images only
    const imageFiles = newFiles.filter((file) =>
      file.type.match(/^image\/(jpeg|jpg|png|webp)$/)
    );

    if (imageFiles.length === 0) {
      this.showError("Please select valid image files (JPG, PNG, WEBP)");
      return;
    }

    this.files = [...this.files, ...imageFiles];
    this.renderPreview();
    this.uploadButtonTarget.disabled = false;
  }

  // Remove a file from the list
  removeFile(event) {
    const index = parseInt(event.currentTarget.dataset.index);
    this.files.splice(index, 1);
    this.renderPreview();

    if (this.files.length === 0) {
      this.uploadButtonTarget.disabled = true;
    }
  }

  // Render file preview
  renderPreview() {
    this.previewTarget.innerHTML = "";

    this.files.forEach((file, index) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const previewItem = document.createElement("div");
        previewItem.className =
          "relative group bg-white dark:bg-slate-700 rounded-lg p-3 shadow-md";
        previewItem.innerHTML = `
          <div class="flex items-center space-x-3">
            <img src="${e.target.result}" alt="${file.name}" class="w-16 h-16 object-cover rounded" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white truncate">${file.name}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">${this.formatFileSize(file.size)}</p>
            </div>
            <button
              type="button"
              data-index="${index}"
              data-action="click->file-upload#removeFile"
              class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
              </svg>
            </button>
          </div>
        `;
        this.previewTarget.appendChild(previewItem);
      };

      reader.readAsDataURL(file);
    });
  }

  // Upload files
  async upload() {
    if (this.files.length === 0) return;

    this.uploadButtonTarget.disabled = true;
    this.progressContainerTarget.classList.remove("hidden");
    this.hideMessages();

    const formData = new FormData();
    this.files.forEach((file) => {
      formData.append("files[]", file);
    });

    try {
      const csrfToken = document.querySelector("[name='csrf-token']");
      const headers = {};
      if (csrfToken) {
        headers["X-CSRF-Token"] = csrfToken.content;
      }

      const response = await fetch("/image_uploads", {
        method: "POST",
        headers: headers,
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        this.showSuccess(
          `Successfully uploaded ${data.success.length} file(s)!`
        );
        this.files = [];
        this.renderPreview();
        this.fileInputTarget.value = "";
      } else {
        const errorMessages = data.errors
          .map((err) => `${err.filename}: ${err.error}`)
          .join(", ");
        this.showError(`Upload failed: ${errorMessages}`);
      }
    } catch (error) {
      this.showError(`Upload failed: ${error.message}`);
    } finally {
      this.progressContainerTarget.classList.add("hidden");
      this.uploadButtonTarget.disabled = this.files.length === 0;
    }
  }

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  }

  // Show success message
  showSuccess(message) {
    this.successMessageTarget.textContent = message;
    this.successMessageTarget.classList.remove("hidden");
    setTimeout(() => {
      this.successMessageTarget.classList.add("hidden");
    }, 5000);
  }

  // Show error message
  showError(message) {
    this.errorMessageTarget.textContent = message;
    this.errorMessageTarget.classList.remove("hidden");
    setTimeout(() => {
      this.errorMessageTarget.classList.add("hidden");
    }, 5000);
  }

  // Hide all messages
  hideMessages() {
    this.successMessageTarget.classList.add("hidden");
    this.errorMessageTarget.classList.add("hidden");
  }
}
