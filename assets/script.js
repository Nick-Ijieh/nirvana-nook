document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var mobileNav = document.querySelector('.mobile-nav');

  if (toggle && mobileNav) {
    toggle.addEventListener('click', function () {
      var isOpen = mobileNav.classList.toggle('open');
      toggle.classList.toggle('open', isOpen);
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
  }

  document.querySelectorAll('.mobile-sub-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var submenu = btn.closest('.mobile-row').nextElementSibling;
      var isOpen = submenu.classList.toggle('open');
      btn.classList.toggle('open', isOpen);
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
  });

  // Close mobile nav when a direct link is tapped
  document.querySelectorAll('.mobile-nav a').forEach(function (link) {
    link.addEventListener('click', function () {
      mobileNav.classList.remove('open');
      toggle.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // Load More reviews on the testimonials page
  var loadMoreBtn = document.querySelector('#load-more-btn');
  if (loadMoreBtn) {
    var BATCH_SIZE = 6;
    loadMoreBtn.addEventListener('click', function () {
      var hidden = document.querySelectorAll('#testi-grid .review-hidden');
      for (var i = 0; i < Math.min(BATCH_SIZE, hidden.length); i++) {
        hidden[i].classList.remove('review-hidden');
      }
      if (document.querySelectorAll('#testi-grid .review-hidden').length === 0) {
        loadMoreBtn.style.display = 'none';
      }
    });
  }

  // Simple front-end booking form handler (no backend wired up yet)
  var bookingForm = document.querySelector('#booking-form');
  if (bookingForm) {
    bookingForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var confirmation = document.querySelector('#booking-confirmation');
      bookingForm.style.display = 'none';
      if (confirmation) confirmation.style.display = 'block';
    });
  }
});
