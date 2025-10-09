// TIL Alert Helper Functions
TILAlert = {
  show: function(message, type = "success", duration = 3000) {
    // Remove any existing alerts
    $(".til-success-alert").remove();

    // Create the alert element
    const alertClass = type === "success" ? "til-success-alert" : `til-success-alert ${type}`;
    const iconClass =
      type === "success"
        ? "fas fa-check-circle"
        : type === "error"
          ? "fas fa-exclamation-circle"
          : "fas fa-exclamation-triangle";

    const alertHTML = `
      <div class="${alertClass}">
        <span class="alert-icon">
          <i class="${iconClass}" aria-hidden="true"></i>
        </span>
        <span class="alert-text">${message}</span>
      </div>
    `;

    // Add to body
    $("body").append(alertHTML);

    // Show the alert with animation
    setTimeout(() => {
      $(".til-success-alert").addClass("show");
    }, 100);

    // Auto hide after duration
    setTimeout(() => {
      $(".til-success-alert").addClass("fade-out");
      setTimeout(() => {
        $(".til-success-alert").remove();
      }, 300);
    }, duration);
  },

  success: function(message, duration = 3000) {
    this.show(message, "success", duration);
  },

  error: function(message, duration = 4000) {
    this.show(message, "error", duration);
  },

  warning: function(message, duration = 4000) {
    this.show(message, "warning", duration);
  }
};
