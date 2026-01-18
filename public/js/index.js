
// פונקציה לקישורים פנימיים באותו הדף
function LocalLinks() {
  const links = document.querySelectorAll('.navbar-nav a, .dropdown-menu a');

  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.includes('home.html#')) {
      link.setAttribute('href', href.replace('home.html', ''));
    }
  });
}

// מאזין לטעינת הדף ורק לאחר מכן מריץ את הלוגיקה המרכזית של הכרטיסיות
document.addEventListener('DOMContentLoaded', () => {

  LocalLinks();

  const cards = document.querySelectorAll('.typeOfClasses .class-card');
  // משתנה ששומר איזו כרטיסייה "נעולה" (נשארת פתוחה לאחר לחיצה)
  let pinnedCard = null;

  // פונקציה שסוגרת את כל הכרטיסיות הפתוחות
  const closeAllCards = () => {
    cards.forEach(c => {
      const collapseElement = c.querySelector('.collapse');
      if (collapseElement) {
        const bsCollapse = bootstrap.Collapse.getOrCreateInstance(collapseElement, { toggle: false });
        bsCollapse.hide();
      }
    });
  };

  // פונקציה שפותחת כרטיסייה ספציפית
  const openCard = (card) => {
    const collapseElement = card.querySelector('.collapse');
    if (collapseElement) {
      const bsCollapse = bootstrap.Collapse.getOrCreateInstance(collapseElement, { toggle: false });
      bsCollapse.show();
    }
  };

  // הוספת אירועי עכבר ולחיצה
  cards.forEach(card => {

    // מציאת הכפתור/תמונה שפותח את הכרטיסייה
    const trigger = card.querySelector('a[role="button"]');

    if (!trigger) return;
    trigger.removeAttribute('data-bs-toggle');

    // בעת עמידה עם העכבר: פותח את הכרטיסייה (רק אם אין כרטיסייה נעולה כרגע)
    card.addEventListener('mouseenter', () => {
      if (pinnedCard) return;

      closeAllCards();
      openCard(card);
    });

    // בעת יציאה עם העכבר: סוגר את הכרטיסייה (אלא אם היא כרגע הנעולה)
    card.addEventListener('mouseleave', () => {
      if (pinnedCard === card) return;

      closeAllCards();
    });

    // בעת לחיצה: נועל או משחרר את הכרטיסייה 
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (pinnedCard === card) {
        // אם לוחצים על הכרטיסייה שכבר פתוחה - משחרר את הנעילה וסוגר
        pinnedCard = null;
        closeAllCards();
      } else {
        // אם לוחצים על כרטיסייה חדשה - נועל אותה ופותח אותה
        pinnedCard = card;
        closeAllCards();
        openCard(card);
      }
    });
  });

  // בדיקה אם יש קישור ישיר בכתובת הדפדפן ופתיחת הכרטיסייה המתאימה
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