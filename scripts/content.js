const createListItem = (article, question, index, list) => {
  let articleId = article.id;
  if (!articleId) {
    articleId = `chat-outline-article-${index}`;
    article.id = articleId;
  }

  const anchor = document.createElement('a');
  anchor.href = `#${articleId}`;
  const span = document.createElement('span');
  span.textContent = question;
  anchor.appendChild(span);

  const item = document.createElement('li');
  item.addEventListener('click', e => {
    e.preventDefault();

    const targetArticle = document.getElementById(articleId);
    if (targetArticle) {
      targetArticle.scrollIntoView({ behavior: 'smooth' });
      targetArticle.style.transition = 'background-color 0.3s ease';
      let flashes = 0;
      const flashInterval = setInterval(() => {
        if (flashes >= 4) {
          clearInterval(flashInterval);
          targetArticle.style.backgroundColor = '';
          return;
        }
        if (flashes % 2 === 0) {
          targetArticle.style.backgroundColor = 'rgba(255, 255, 0, 0.2)';
        } else {
          targetArticle.style.backgroundColor = '';
        }
        flashes++;
      }, 300);
    }
  });
  item.appendChild(anchor);
  list.appendChild(item);
};

const updateDropdownList = () => {
  const dropdown = document.getElementById('chat-outline-dropdown');
  if (!dropdown) return;

  dropdown.innerHTML = '';
  const list = document.createElement('ul');
  const questionElements = Array.from(
    document.querySelectorAll('[data-message-author-role="user"] .whitespace-pre-wrap')
  );
  questionElements.forEach((el, index) => {
    const question = el.textContent.trim();
    const article = el.closest('article');
    if (article) {
      createListItem(article, question, index, list);
    }
  });
  dropdown.appendChild(list);
};

const scanArticles = () => {
  if (document.getElementById('chat-outline-btn')) return;

  const navButton = document.createElement('button');
  navButton.id = 'chat-outline-btn';

  const style = document.createElement('style');
  style.textContent = `
      #chat-outline-btn {
        position: absolute;
        bottom: 3rem;
        right: 3rem;
        width: 2rem;
        display: flex;
        flex-wrap: wrap;
        padding: .5rem;
        border-radius: 5px;
        transition: background-color 0.3s ease;
        z-index: 10;
        cursor: pointer;
        font-size: 0.75rem;
        justify-content: center;
        align-items: center;
      }
      #chat-outline-btn:hover {
        background-color: #818b9826;
      }
      #chat-outline-btn img {
        width: 100%;
        height: 100%;
      }
      #chat-outline-dropdown {
        position: absolute;
        bottom: 6rem;
        right: 3rem;
        width: 360px;
        max-height: 640px;
        background-color: #fff;
        border: 1px solid #818b9826;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        overflow: scroll;
        z-index: 100;
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      #chat-outline-dropdown.show {
        opacity: 1;
        transform: translateY(0);
      }
      #chat-outline-dropdown ul {
        list-style: none;
        padding: 0;
      }
      #chat-outline-dropdown ul li {
        transition: background-color 0.3s ease;
        padding: 1rem;
        cursor: pointer;
      }
      #chat-outline-dropdown ul li:hover {
        background-color: rgba(255, 255, 0, 0.2);
      }
      #chat-outline-dropdown ul li > a {
        color: inherit;
      }
      #chat-outline-dropdown ul li > a span {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 5;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      /* ChatGPT specific dark mode detection */
      html.dark #chat-outline-btn img {
        filter: invert(1) brightness(0.8);
      }
      html.dark #chat-outline-dropdown {
        background-color: #2f2f2f;
        color: #fff;
        border-color: #565869;
      }
      html.dark #chat-outline-dropdown ul li:hover {
        background-color: rgba(255, 255, 0, 0.15);
      }
  `;
  document.head.appendChild(style);

  navButton.innerHTML = `<img src="${chrome.runtime.getURL('images/icon.svg')}" alt="icon">`;
  const body = document.querySelector('body');
  body.insertAdjacentElement('afterbegin', navButton);

  navButton.addEventListener('click', (e) => {
    e.stopPropagation();

    const existingDropdown = document.getElementById('chat-outline-dropdown');
    if (existingDropdown) {
      existingDropdown.classList.remove('show');
      existingDropdown.addEventListener('transitionend', () => existingDropdown.remove(), { once: true });
      return;
    }
    const dropdown = document.createElement('div');
    dropdown.id = 'chat-outline-dropdown';
    body.insertAdjacentElement('afterbegin', dropdown);
    updateDropdownList();
    requestAnimationFrame(() => {
      dropdown.classList.add('show');
    });
  });
};

(function initialize() {
  const trySetup = () => {
    const body = document.querySelector('body');
    if (body) {
      scanArticles();
      console.log('Chat Outline extension initialized successfully.');
    } else {
      setTimeout(trySetup, 100);
    }
  };
  trySetup();
})();

const removeDropdown = () => {
  const dropdown = document.getElementById('chat-outline-dropdown');
  if (dropdown) {
    dropdown.classList.remove('show');
    dropdown.addEventListener('transitionend', () => dropdown.remove(), { once: true });
  }
};

document.addEventListener('click', e => {
  const dropdown = document.getElementById('chat-outline-dropdown');
  const navButton = document.getElementById('chat-outline-btn');
  if (!dropdown) return;
  if (navButton && navButton.contains(e.target)) return;
  if (dropdown.contains(e.target)) return;
  removeDropdown();
});

window.addEventListener('popstate', removeDropdown);

const origPushState = history.pushState;
history.pushState = function(...args) {
  origPushState.apply(this, args);
  removeDropdown();
};
const origReplaceState = history.replaceState;

history.replaceState = function(...args) {
  origReplaceState.apply(this, args);
  removeDropdown();
};

let prevUserQuestions = [];
const observer = new MutationObserver(() => {
  const currentUserQuestions = Array.from(
    document.querySelectorAll('[data-message-author-role="user"] .whitespace-pre-wrap')
  ).map(el => el.textContent.trim());
  const hasChanged = currentUserQuestions.length !== prevUserQuestions.length ||
    currentUserQuestions.some((q, idx) => q !== prevUserQuestions[idx]);

  if (hasChanged) {
    prevUserQuestions = currentUserQuestions;
    updateDropdownList();
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

window.addEventListener('beforeunload', () => observer.disconnect());
