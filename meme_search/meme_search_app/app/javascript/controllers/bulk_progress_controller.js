import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = [
    "overlay",
    "content",
    "minimizedIndicator",
    "progressBar",
    "percentage",
    "minimizedPercentage",
    "doneCount",
    "processingCount",
    "queueCount",
    "failedCount",
    "totalCount",
    "modelName",
    "errorMessage",
    "successMessage",
    "cancelButton"
  ];

  static values = {
    sessionActive: Boolean
  };

  connect() {
    console.log("Bulk progress controller connected");

    // Restore state from localStorage
    this.restoreState();

    // Start polling if session is active or localStorage indicates active operation
    if (this.sessionActiveValue || this.isOperationActive()) {
      this.showOverlay();
      this.startPolling();
    }
  }

  disconnect() {
    this.stopPolling();
  }

  startPolling() {
    console.log("Starting polling...");
    this.pollInterval = 2000; // Start with 2 seconds
    this.maxPollInterval = 10000; // Max 10 seconds
    this.errorCount = 0;
    this.maxErrors = 3;

    this.poll();
  }

  stopPolling() {
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
  }

  async poll() {
    try {
      const response = await fetch("/image_cores/bulk_operation_status", {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "X-CSRF-Token": this.getCSRFToken()
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Reset error count on successful fetch
      this.errorCount = 0;
      this.hideErrorMessage();

      // Update UI with status data
      this.updateProgress(data);

      // Save state to localStorage
      this.saveState(data);

      // Check if operation is complete
      if (data.is_complete) {
        this.handleComplete(data);
      } else {
        // Use exponential backoff: increase interval gradually
        this.pollInterval = Math.min(this.pollInterval * 1.2, this.maxPollInterval);
        this.pollTimeout = setTimeout(() => this.poll(), this.pollInterval);
      }

    } catch (error) {
      console.error("Error polling bulk operation status:", error);

      this.errorCount++;
      this.showErrorMessage();

      if (this.errorCount >= this.maxErrors) {
        console.log("Max errors reached, stopping polling");
        this.stopPolling();
      } else {
        // Retry with exponential backoff
        this.pollInterval = Math.min(this.pollInterval * 1.5, this.maxPollInterval);
        this.pollTimeout = setTimeout(() => this.poll(), this.pollInterval);
      }
    }
  }

  updateProgress(data) {
    const { status_counts, total } = data;

    // DEBUG: Log received data
    console.log('[BULK PROGRESS DEBUG] Received data:', JSON.stringify(data));
    console.log('[BULK PROGRESS DEBUG] status_counts:', status_counts);
    console.log('[BULK PROGRESS DEBUG] total:', total);

    // Calculate completed count (done + failed)
    const completed = status_counts.done + status_counts.failed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    console.log('[BULK PROGRESS DEBUG] completed:', completed, 'percentage:', percentage);

    // Update progress bar
    if (this.hasProgressBarTarget) {
      this.progressBarTarget.style.width = `${percentage}%`;
    }

    // Update percentage displays
    if (this.hasPercentageTarget) {
      this.percentageTarget.textContent = `${percentage}%`;
    }
    if (this.hasMinimizedPercentageTarget) {
      this.minimizedPercentageTarget.textContent = `${percentage}%`;
    }

    // Update status counts
    if (this.hasDoneCountTarget) {
      this.doneCountTarget.textContent = status_counts.done;
    }
    if (this.hasProcessingCountTarget) {
      this.processingCountTarget.textContent = status_counts.processing;
    }
    if (this.hasQueueCountTarget) {
      this.queueCountTarget.textContent = status_counts.in_queue;
    }
    if (this.hasFailedCountTarget) {
      this.failedCountTarget.textContent = status_counts.failed;
    }
    if (this.hasTotalCountTarget) {
      this.totalCountTarget.textContent = total;
    }
  }

  handleComplete(data) {
    console.log("Bulk operation complete!");

    this.stopPolling();
    this.showSuccessMessage();

    // Hide cancel button
    if (this.hasCancelButtonTarget) {
      this.cancelButtonTarget.classList.add("hidden");
    }

    // Clear localStorage
    this.clearState();

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      this.close();
      // Reload page to show updated results
      window.location.reload();
    }, 5000);
  }

  async cancel() {
    if (!confirm("Are you sure you want to cancel the bulk operation?")) {
      return;
    }

    try {
      const response = await fetch("/image_cores/bulk_operation_cancel", {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-CSRF-Token": this.getCSRFToken()
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Cancelled ${data.cancelled_count} jobs`);

      this.stopPolling();
      this.clearState();
      this.close();

      // Reload page to show updated results
      window.location.reload();

    } catch (error) {
      console.error("Error cancelling bulk operation:", error);
      alert("Failed to cancel operation. Please try again.");
    }
  }

  toggleMinimize() {
    if (this.hasContentTarget && this.hasMinimizedIndicatorTarget) {
      const isMinimized = this.contentTarget.classList.contains("hidden");

      if (isMinimized) {
        // Expand
        this.contentTarget.classList.remove("hidden");
        this.minimizedIndicatorTarget.classList.add("hidden");
        localStorage.setItem("bulkProgressMinimized", "false");
      } else {
        // Minimize
        this.contentTarget.classList.add("hidden");
        this.minimizedIndicatorTarget.classList.remove("hidden");
        localStorage.setItem("bulkProgressMinimized", "true");
      }
    }
  }

  close() {
    if (this.hasOverlayTarget) {
      this.overlayTarget.style.display = "none";
    }
    this.stopPolling();
  }

  showOverlay() {
    if (this.hasOverlayTarget) {
      this.overlayTarget.style.display = "block";
    }
  }

  showErrorMessage() {
    if (this.hasErrorMessageTarget) {
      this.errorMessageTarget.classList.remove("hidden");
    }
  }

  hideErrorMessage() {
    if (this.hasErrorMessageTarget) {
      this.errorMessageTarget.classList.add("hidden");
    }
  }

  showSuccessMessage() {
    if (this.hasSuccessMessageTarget) {
      this.successMessageTarget.classList.remove("hidden");
    }
  }

  // LocalStorage helpers
  saveState(data) {
    localStorage.setItem("bulkProgressActive", "true");
    localStorage.setItem("bulkProgressData", JSON.stringify(data));
  }

  restoreState() {
    const isActive = localStorage.getItem("bulkProgressActive") === "true";
    const data = localStorage.getItem("bulkProgressData");

    if (isActive && data) {
      try {
        const parsedData = JSON.parse(data);
        this.updateProgress(parsedData);

        // Restore minimized state
        const isMinimized = localStorage.getItem("bulkProgressMinimized") === "true";
        if (isMinimized && this.hasContentTarget && this.hasMinimizedIndicatorTarget) {
          this.contentTarget.classList.add("hidden");
          this.minimizedIndicatorTarget.classList.remove("hidden");
        }
      } catch (error) {
        console.error("Error restoring state:", error);
        this.clearState();
      }
    }
  }

  clearState() {
    localStorage.removeItem("bulkProgressActive");
    localStorage.removeItem("bulkProgressData");
    localStorage.removeItem("bulkProgressMinimized");
  }

  isOperationActive() {
    return localStorage.getItem("bulkProgressActive") === "true";
  }

  getCSRFToken() {
    const token = document.querySelector('meta[name="csrf-token"]');
    return token ? token.content : "";
  }
}
