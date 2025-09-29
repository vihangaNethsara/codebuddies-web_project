Template.allStudyGroups.onRendered(function() {
  let instance = this;

  // Initialize all tooltips
  instance.$('[data-toggle="tooltip"]').tooltip();

  // Initialize scroll detection for infinite scroll
  $(window).on("scroll", function() {
    if (
      $(window).scrollTop() > $(document).height() - $(window).height() - 100 &&
      !instance.isLoading.get() &&
      !instance.loadingMore.get() &&
      !instance.flag.get()
    ) {
      instance.loadingMore.set(true);
      instance.addMoreStudyGroups();
    }
  });

  // Apply progress widths after render
  const applyProgressWidths = () => {
    instance.$(".progress-bar").each(function() {
      const $el = $(this);
      const pct = parseInt($el.attr("data-progress") || $el.attr("aria-valuenow") || 0, 10);
      if (!isNaN(pct)) {
        $el.css("width", pct + "%");
      }
    });
  };

  // initial apply
  Meteor.setTimeout(applyProgressWidths, 50);

  // Suggestion display handling
  const $input = instance.$("#sg-search-input");
  const $suggestions = instance.$("#sg-suggestions");

  instance.autorun(() => {
    const sug = (instance.suggestions && instance.suggestions.get && instance.suggestions.get()) || [];
    if (sug && sug.length > 0) {
      $suggestions.empty().show();
      sug.forEach((s, i) => {
        const $item = $(
          "<button type='button' class='list-group-item list-group-item-action sg-sug-item' role='option'></button>"
        );
        $item.text(
          (s.type === "group" ? "Group: " : s.type.charAt(0).toUpperCase() + s.type.slice(1) + ": ") + s.label
        );
        $item.attr("data-idx", i);
        $suggestions.append($item);
      });
      $input.attr("aria-expanded", "true");
    } else {
      $suggestions.hide().empty();
      $input.attr("aria-expanded", "false");
    }
  });

  // highlight active suggestion when suggestionIndex changes
  instance.autorun(() => {
    const idx = instance.suggestionIndex && instance.suggestionIndex.get();
    const $items = instance.$(".sg-sug-item");
    $items.removeClass("active");
    if (typeof idx === "number" && idx >= 0) {
      const $sel = $items.eq(idx);
      $sel.addClass("active");
      $input.attr("aria-activedescendant", $sel.attr("id") || "sg-suggestion-" + idx);
      $sel.attr("id", $input.attr("id") + "-item-" + idx);
      // ensure selected item is visible in container
      const top = $sel.position().top;
      if (top < 0 || top > $suggestions.innerHeight()) {
        $suggestions.scrollTop($suggestions.scrollTop() + top - 10);
      }
    } else {
      $input.removeAttr("aria-activedescendant");
    }
  });

  // click on suggestion
  instance.$(document).on("click", ".sg-sug-item", function(e) {
    const idx = parseInt($(this).attr("data-idx"), 10);
    const sug = instance.suggestions.get() || [];
    const sel = sug[idx];
    if (!sel) return;
    if (sel.type === "category") instance.activeCategory.set(sel.id || sel.label);
    if (sel.type === "tag") instance.selectedTopic.set(sel.label);
    if (sel.type === "group") FlowRouter.go("studyGroupDetails", { slug: sel.id });
    instance.suggestions.set([]);
  });

  // compact search toggle (small screens)
  instance.$(document).on("click", "#sg-search-toggle", function(e) {
    e.preventDefault();
    const $inputWrap = instance.$("#sg-search-input");
    $inputWrap.focus();
  });

  // filter sidebar open/close
  instance.$(document).on("click", "#sg-filter-toggle", function(e) {
    e.preventDefault();
    const $panel = instance.$("#advancedFilters");
    // mobile: show as modal
    if ($(window).width() < 768) {
      const $modal = $('<div class="cb-filter-modal modal-mobile" role="dialog" aria-modal="true"></div>');
      const $backdrop = $('<div class="cb-filter-backdrop"></div>');
      $modal.append(
        $panel
          .clone(true, true)
          .addClass("mobile-modal-content")
          .show()
      );
      $("body")
        .append($backdrop)
        .append($modal);
      $("body").addClass("cb-modal-open");
      $backdrop.on("click", function() {
        $modal.remove();
        $backdrop.remove();
        $("body").removeClass("cb-modal-open");
      });
      $modal
        .find("button, input, select, a")
        .first()
        .focus();
      $(this).attr("aria-expanded", "true");
      return;
    }

    const isOpen = $panel.hasClass("open");
    if (isOpen) {
      $panel.removeClass("open").attr("aria-hidden", "true");
      $(this).attr("aria-expanded", "false");
    } else {
      $panel.addClass("open").attr("aria-hidden", "false");
      $(this).attr("aria-expanded", "true");
      $panel
        .find("button, input, select, a")
        .first()
        .focus();
    }
  });

  instance.$(document).on("click", "#sg-filter-close", function(e) {
    e.preventDefault();
    instance
      .$("#sg-filter-sidebar")
      .removeClass("open")
      .attr("aria-hidden", "true");
  });

  instance.$(document).on("click", "#sg-filter-apply", function(e) {
    e.preventDefault();
    // sidebar contains elements with data-category and data-skill - trigger click on first active
    const activeCat = instance
      .$("#sg-filter-sidebar")
      .find(".btn-tag.active")
      .first();
    if (activeCat.length) {
      const cat = activeCat.attr("data-category");
      instance.activeCategory.set(cat || "all");
    }
    const activeSkill = instance
      .$("#sg-filter-sidebar")
      .find(".btn-tag[data-skill].active")
      .first();
    if (activeSkill.length) instance.selectedSkill.set(activeSkill.attr("data-skill"));
    instance
      .$("#sg-filter-sidebar")
      .removeClass("open")
      .attr("aria-hidden", "true");
  });

  // click outside sidebar to close
  instance.$(document).on("click", function(e) {
    const $target = $(e.target);
    const $sidebar = instance.$("#sg-filter-sidebar");
    if (
      $sidebar.hasClass("open") &&
      !$target.closest("#sg-filter-sidebar").length &&
      !$target.is("#sg-filter-toggle")
    ) {
      $sidebar.removeClass("open").attr("aria-hidden", "true");
    }
  });

  // toggle active class for sidebar filter buttons
  instance.$(document).on("click", "#advancedFilters .chip", function(e) {
    const $btn = $(this);
    if ($btn.attr("data-category")) {
      // single-select category
      instance.$("#advancedFilters .chip[data-category]").removeClass("active");
      $btn.addClass("active");
    } else if ($btn.attr("data-skill")) {
      $btn.toggleClass("active");
    }
  });

  // sticky filters on desktop, collapsible on mobile
  const $filterBar = instance.$(".view-sort-options");
  if ($filterBar.length) {
    const offsetTop = $filterBar.offset().top;
    $(window).on("scroll.sgFilters", () => {
      if ($(window).width() >= 768) {
        if ($(window).scrollTop() > offsetTop) {
          $filterBar.addClass("sticky-filter");
        } else {
          $filterBar.removeClass("sticky-filter");
        }
      } else {
        $filterBar.removeClass("sticky-filter");
      }
    });
  }

  // persist view mode
  const savedView = localStorage.getItem("cb_viewMode");
  if (savedView) {
    instance.viewMode && instance.viewMode.set(savedView);
    if (savedView === "list") instance.$(".groups-grid").addClass("list-view");
  }

  // watch for changes to viewMode and persist
  this.autorun(() => {
    const vm = instance.viewMode && instance.viewMode.get();
    if (vm) localStorage.setItem("cb_viewMode", vm);
    Meteor.setTimeout(applyProgressWidths, 50);
  });
});
