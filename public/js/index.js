// Correct local links on the home page (Navbar handling)
function fixLocalLinks() {
  const links = document.querySelectorAll('.navbar-nav a, .dropdown-menu a');

  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.includes('home.html#')) {
      link.setAttribute('href', href.replace('home.html', ''));
    }
  });
}

// Card Management System (Hover & Click Logic)
document.addEventListener('DOMContentLoaded', () => {

  fixLocalLinks();

  const cards = document.querySelectorAll('.typeOfClasses .class-card');
  let pinnedCard = null;

  // Helper: Close all cards
  const closeAllCards = () => {
    cards.forEach(c => {
      const collapseElement = c.querySelector('.collapse');
      if (collapseElement) {
        const bsCollapse = bootstrap.Collapse.getOrCreateInstance(collapseElement, { toggle: false });
        bsCollapse.hide();
      }
    });
  };

  // Helper: Open a specific card
  const openCard = (card) => {
    const collapseElement = card.querySelector('.collapse');
    if (collapseElement) {
      const bsCollapse = bootstrap.Collapse.getOrCreateInstance(collapseElement, { toggle: false });
      bsCollapse.show();
    }
  };

  // Main Logic Loop
  cards.forEach(card => {

    // Find the trigger (Image/Text link)
    const trigger = card.querySelector('a[role="button"]');

    if (!trigger) return;
    trigger.removeAttribute('data-bs-toggle');

    // HOVER ENTER
    card.addEventListener('mouseenter', () => {
      if (pinnedCard) return;

      closeAllCards();
      openCard(card);
    });

    // HOVER LEAVE
    card.addEventListener('mouseleave', () => {
      if (pinnedCard === card) return;

      closeAllCards();
    });

    // CLICK (Pin/Unpin Logic)
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (pinnedCard === card) {
        // Unlock: If clicking the already pinned card -> Close it
        pinnedCard = null;
        closeAllCards();
      } else {
        // Lock: If clicking a new card -> Pin it
        pinnedCard = card;
        closeAllCards();
        openCard(card);
      }
    });
  });

  // Open card from Navbar URL
  const handleDeepLink = () => {
    const hash = window.location.hash;
    if (hash) {
      const targetCollapse = document.querySelector(hash);
      if (targetCollapse) {
        const cardToOpen = targetCollapse.closest('.class-card');
        if (cardToOpen) {
          setTimeout(() => {
            pinnedCard = cardToOpen;
            closeAllCards();
            openCard(cardToOpen);
            cardToOpen.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      }
    }
  };

  handleDeepLink();
  window.addEventListener('hashchange', handleDeepLink);
});