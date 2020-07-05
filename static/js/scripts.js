/*!
    Title: Dev Portfolio Template
    Version: 1.2.1
    Last Change: 08/27/2017
    Author: Ryan Fitzgerald (modified by Samarth Kishor)
    Repo: https://github.com/RyanFitzgerald/devportfolio-template
    Issues: https://github.com/RyanFitzgerald/devportfolio-template/issues
    Description: This file contains all the scripts associated with the single-page
    portfolio website timeline.
*/
$("html").removeClass("no-js");

// Create timeline
$("#experience-timeline").each(function() {
  $this = $(this); // Store reference to this
  $userContent = $this.children("div"); // user content

  // Create each timeline block
  $userContent.each(function() {
    $(this)
      .addClass("vtimeline-content")
      .wrap(
        '<div class="vtimeline-point"><div class="vtimeline-block"></div></div>'
      );
  });

  // Add icons to each block
  $this.find(".vtimeline-point").each(function() {
    $(this).prepend(
      '<div class="vtimeline-icon"><i class="fa fa-map-marker"></i></div>'
    );
  });

  // Add dates to the timeline if exists
  $this.find(".vtimeline-content").each(function() {
    const date = $(this).data("date");
    if (date) {
      // Prepend if exists
      $(this)
        .parent()
        .prepend('<span class="vtimeline-date">' + date + "</span>");
    }
  });
});

$("#education-timeline").each(function() {
  $this = $(this); // Store reference to this
  $userContent = $this.children("div"); // user content

  // Create each timeline block
  $userContent.each(function() {
    $(this)
      .addClass("vtimeline-content")
      .wrap(
        '<div class="vtimeline-point"><div class="vtimeline-block"></div></div>'
      );
  });

  // Add icons to each block
  $this.find(".vtimeline-point").each(function() {
    $(this).prepend(
      '<div class="vtimeline-icon"><i class="fa fa-map-marker"></i></div>'
    );
  });

  // Add dates to the timeline if exists
  $this.find(".vtimeline-content").each(function() {
    const date = $(this).data("date");
    if (date) {
      // Prepend if exists
      $(this)
        .parent()
        .prepend('<span class="vtimeline-date">' + date + "</span>");
    }
  });
});

$("#leadership-timeline").each(function() {
  $this = $(this); // Store reference to this
  $userContent = $this.children("div"); // user content

  // Create each timeline block
  $userContent.each(function() {
    $(this)
      .addClass("vtimeline-content")
      .wrap(
        '<div class="vtimeline-point"><div class="vtimeline-block"></div></div>'
      );
  });

  // Add icons to each block
  $this.find(".vtimeline-point").each(function() {
    $(this).prepend(
      '<div class="vtimeline-icon"><i class="fa fa-map-marker"></i></div>'
    );
  });

  // Add dates to the timeline if exists
  $this.find(".vtimeline-content").each(function() {
    const date = $(this).data("date");
    if (date) {
      // Prepend if exists
      $(this)
        .parent()
        .prepend('<span class="vtimeline-date">' + date + "</span>");
    }
  });
});
