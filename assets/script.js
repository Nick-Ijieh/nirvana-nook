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

  // Header: hides on scroll down, reappears translucent on scroll up
  var siteHeader = document.querySelector('header');
  if (siteHeader) {
    var lastScrollY = window.scrollY;
    var ticking = false;
    var REVEAL_THRESHOLD = 80; // px from top before the hide/reveal behavior kicks in

    function updateHeader() {
      var currentY = window.scrollY;
      if (currentY < REVEAL_THRESHOLD) {
        siteHeader.classList.remove('header-hidden', 'header-translucent');
      } else if (currentY > lastScrollY) {
        // scrolling down
        siteHeader.classList.add('header-hidden');
      } else {
        // scrolling up
        siteHeader.classList.remove('header-hidden');
        siteHeader.classList.add('header-translucent');
      }
      lastScrollY = currentY;
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(updateHeader);
        ticking = true;
      }
    });
  }
});
