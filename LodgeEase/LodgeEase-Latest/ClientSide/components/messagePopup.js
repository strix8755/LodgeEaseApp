document.addEventListener('DOMContentLoaded', () => {
    const messageHostBtn = document.querySelector('button:has(.fa-comment-dots)');
    const chatPopup = document.getElementById('message-host-modal');
    const chatHeader = document.getElementById('chat-header');
    const minimizeBtn = document.getElementById('minimize-chat');
    const closeBtn = document.getElementById('close-message-modal');
    const sendBtn = document.getElementById('send-message');
    const messageInput = document.getElementById('message-body');
  
    // Open chat popup
    messageHostBtn?.addEventListener('click', () => {
      chatPopup.classList.remove('translate-y-full');
    });
  
    // Minimize chat
    minimizeBtn?.addEventListener('click', () => {
      chatPopup.classList.add('translate-y-full');
    });
  
    // Close chat
    closeBtn?.addEventListener('click', () => {
      chatPopup.classList.add('translate-y-full');
    });
  
    // Toggle chat when header is clicked
    chatHeader?.addEventListener('click', (e) => {
      // Prevent triggering if buttons are clicked
      if (e.target.closest('button')) return;
      chatPopup.classList.toggle('translate-y-full');
    });
  
    // Send message functionality
    sendBtn?.addEventListener('click', () => {
      const message = messageInput.value.trim();
      if (message) {
        // Create a new message element
        const messagesContainer = chatPopup.querySelector('.overflow-y-auto');
        const newMessageElement = document.createElement('div');
        newMessageElement.classList.add('flex', 'justify-end');
        newMessageElement.innerHTML = `
          <div class="bg-blue-500 text-white p-3 rounded-lg rounded-br-none shadow-sm max-w-[70%]">
            <p>${message}</p>
          </div>
        `;
        
        // Append the new message
        messagesContainer.appendChild(newMessageElement);
        
        // Clear input
        messageInput.value = '';
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    });
  
    // Allow sending message with Enter key
    messageInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
      }
    });
  });


  // Create and initialize the chat interface
function createChatInterface() {
    // Create main container
    const chatPopup = document.createElement('div');
    chatPopup.id = 'message-host-modal';
    chatPopup.className = 'fixed bottom-4 right-4 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 flex flex-col overflow-hidden transform translate-y-full transition-transform duration-300';
  
    // Create header
    const header = createHeader();
    chatPopup.appendChild(header);
  
    // Create messages container
    const messagesContainer = createMessagesContainer();
    chatPopup.appendChild(messagesContainer);
  
    // Create input section
    const inputSection = createInputSection();
    chatPopup.appendChild(inputSection);
  
    // Add to document
    document.body.appendChild(chatPopup);
  
    // Initialize event listeners
    initializeEventListeners();
  }
  
  function createHeader() {
    const header = document.createElement('div');
    header.id = 'chat-header';
    header.className = 'bg-blue-500 text-white p-4 flex justify-between items-center cursor-pointer';
  
    const leftSection = document.createElement('div');
    leftSection.className = 'flex items-center space-x-3';
  
    const hostImage = document.createElement('img');
    hostImage.src = '../components/model.jpg';
    hostImage.alt = 'Host';
    hostImage.className = 'w-10 h-10 rounded-full object-cover';
  
    const hostInfo = document.createElement('div');
    hostInfo.innerHTML = `
      <h2 class="font-semibold">Chezka</h2>
      <p class="text-xs text-blue-100">Typically responds within an hour</p>
    `;
  
    const buttons = document.createElement('div');
    buttons.className = 'flex items-center space-x-2';
    buttons.innerHTML = `
      <button id="minimize-chat" class="hover:bg-blue-600 p-1 rounded-full transition-colors">
        <i class="fas fa-minus text-lg"></i>
      </button>
      <button id="close-message-modal" class="hover:bg-blue-600 p-1 rounded-full transition-colors">
        <i class="fas fa-times text-lg"></i>
      </button>
    `;
  
    leftSection.appendChild(hostImage);
    leftSection.appendChild(hostInfo);
    header.appendChild(leftSection);
    header.appendChild(buttons);
  
    return header;
  }
  
  function createMessagesContainer() {
    const container = document.createElement('div');
    container.className = 'flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50';
  
    // Add initial message from host
    const hostMessage = document.createElement('div');
    hostMessage.className = 'flex';
    hostMessage.innerHTML = `
      <img src="../components/model.jpg" alt="Host" class="w-8 h-8 rounded-full mr-3 self-end">
      <div class="bg-white p-3 rounded-lg rounded-bl-none shadow-sm max-w-[70%]">
        <p class="text-gray-800">Hi there! Feel free to ask any questions about the lodge or your upcoming stay.</p>
      </div>
    `;
  
    // Add example user message
    const userMessage = document.createElement('div');
    userMessage.className = 'flex justify-end';
    userMessage.innerHTML = `
      <div class="bg-blue-500 text-white p-3 rounded-lg rounded-br-none shadow-sm max-w-[70%]">
        <p>Could you tell me about the check-in process?</p>
      </div>
    `;
  
    container.appendChild(hostMessage);
    container.appendChild(userMessage);
  
    return container;
  }
  
  function createInputSection() {
    const inputSection = document.createElement('div');
    inputSection.className = 'bg-white p-4 border-t';
  
    const inputContainer = document.createElement('div');
    inputContainer.className = 'flex items-center space-x-3';
    inputContainer.innerHTML = `
      <button class="text-gray-500 hover:text-blue-500">
        <i class="fas fa-plus-circle text-2xl"></i>
      </button>
      <div class="flex-grow">
        <textarea 
          id="message-body" 
          rows="1" 
          class="w-full border border-gray-300 rounded-full px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" 
          placeholder="Type your message..."
        ></textarea>
      </div>
      <button 
        id="send-message" 
        class="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors"
      >
        <i class="fas fa-paper-plane"></i>
      </button>
    `;
  
    inputSection.appendChild(inputContainer);
    return inputSection;
  }
  
  function initializeEventListeners() {
    const chatPopup = document.getElementById('message-host-modal');
    const chatHeader = document.getElementById('chat-header');
    const minimizeBtn = document.getElementById('minimize-chat');
    const closeBtn = document.getElementById('close-message-modal');
    const sendBtn = document.getElementById('send-message');
    const messageInput = document.getElementById('message-body');
  
    // Create message host button if it doesn't exist
    let messageHostBtn = document.querySelector('button:has(.fa-comment-dots)');
    if (!messageHostBtn) {
      messageHostBtn = document.createElement('button');
      messageHostBtn.innerHTML = '<i class="fas fa-comment-dots"></i>';
      document.body.appendChild(messageHostBtn);
    }
  
    // Open chat popup
    messageHostBtn?.addEventListener('click', () => {
      chatPopup.classList.remove('translate-y-full');
    });
  
    // Minimize chat
    minimizeBtn?.addEventListener('click', () => {
      chatPopup.classList.add('translate-y-full');
    });
  
    // Close chat
    closeBtn?.addEventListener('click', () => {
      chatPopup.classList.add('translate-y-full');
    });
  
    // Toggle chat when header is clicked
    chatHeader?.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      chatPopup.classList.toggle('translate-y-full');
    });
  
    // Send message functionality
    sendBtn?.addEventListener('click', () => {
      const message = messageInput.value.trim();
      if (message) {
        // Create a new message element
        const messagesContainer = chatPopup.querySelector('.overflow-y-auto');
        const newMessageElement = document.createElement('div');
        newMessageElement.classList.add('flex', 'justify-end');
        newMessageElement.innerHTML = `
          <div class="bg-blue-500 text-white p-3 rounded-lg rounded-br-none shadow-sm max-w-[70%]">
            <p>${message}</p>
          </div>
        `;
        
        // Append the new message
        messagesContainer.appendChild(newMessageElement);
        
        // Clear input
        messageInput.value = '';
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    });
  
    // Allow sending message with Enter key
    messageInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
      }
    });
  }
  
  // Initialize the chat interface when the DOM is loaded
  document.addEventListener('DOMContentLoaded', createChatInterface);