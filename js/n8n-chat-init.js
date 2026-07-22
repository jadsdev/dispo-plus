// ===== n8n Chat Widget (floating "Chat AI" button, all pages) =====
// Docs: https://www.npmjs.com/package/@n8n/chat
(function initN8nChatWidget() {
  // 1. Inject the widget's base stylesheet
  const styleLink = document.createElement('link');
  styleLink.rel = 'stylesheet';
  styleLink.href = 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css';
  document.head.appendChild(styleLink);

  // 2. Inject our theme override (maps widget vars to dispo+ theme.css vars)
  const themeLink = document.createElement('link');
  themeLink.rel = 'stylesheet';
  themeLink.href = 'css/chat-widget.css'; // adjust path if shared.js is loaded from a subfolder
  document.head.appendChild(themeLink);

  // 3. Load the widget module and initialize it
  import('https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js')
    .then(({ createChat }) => {
      createChat({
        // TODO: replace with your production n8n Chat Trigger webhook URL
        webhookUrl: 'YOUR_N8N_PRODUCTION_WEBHOOK_URL',

        mode: 'window',            // floating toggle button + popup window
        showWelcomeScreen: false,
        chatInputKey: 'chatInput',
        chatSessionKey: 'sessionId',
        loadPreviousSession: true,

        initialMessages: [
          'Hi! Ask me to find a disposition in the Playbook, or search something up.'
        ],

        i18n: {
          en: {
            title: 'dispo+ Assistant',
            subtitle: '',
            footer: '',
            getStarted: 'Start chat',
            inputPlaceholder: 'Search Playbook or ask a question…',
            closeButtonTooltip: 'Close chat',
          },
        },
      });
    })
    .catch((err) => console.error('n8n chat widget failed to load:', err));
})();
