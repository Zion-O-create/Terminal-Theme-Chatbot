document.addEventListener('DOMContentLoaded', function() {
    const chatContainer = document.querySelector('.chat-container');
    const messageInput = document.querySelector('.message-input');
    const sendButton = document.querySelector('.send-icon');
    const fileUpload = document.querySelector('input[type="file"]');
    const form = document.querySelector('.input-form');
    const typingIndicator = document.querySelector('.typing-indicator');
    
    // Hide typing indicator initially
    typingIndicator.style.display = 'none';
    
    // Handle message submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const message = messageInput.value.trim();
        if (message) {
            addMessage(message, 'user');
            messageInput.value = '';
            messageInput.style.height = '40px';
            
            // Show typing indicator
            typingIndicator.style.display = 'flex';
            
            // Send message to backend
            sendMessageToBackend(message);
        }
    });
    
    // Auto-resize textarea
    messageInput.addEventListener('input', function() {
        this.style.height = '40px';
        this.style.height = (this.scrollHeight > 40) ? this.scrollHeight + 'px' : '40px';
    });
    
    // File upload handling
    fileUpload.addEventListener('change', function(e) {
        if (this.files.length > 0) {
            Array.from(this.files).forEach(file => {
                // Show file in chat as user message
                const fileType = getFileType(file.name);
                addFileMessage(file, fileType);
                
                // Upload file to server
                uploadFile(file);
            });
        }
    });
    
    // Send message to backend API
    function sendMessageToBackend(message) {
        fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message }),
        })
        .then(response => response.json())
        .then(data => {
            // Hide typing indicator
            typingIndicator.style.display = 'none';
            
            // Add bot response to chat
            if (data.error) {
                addMessage(`Sorry, I encountered an error: ${data.error}`, 'bot');
            } else {
                addMessage(data.response, 'bot');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            typingIndicator.style.display = 'none';
            addMessage('Sorry, there was a problem connecting to the server.', 'bot');
        });
    }
    
    // Upload file to backend API
    function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Show typing indicator
        typingIndicator.style.display = 'flex';
        
        fetch('/api/upload', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            // Hide typing indicator
            typingIndicator.style.display = 'none';
            
            if (data.error) {
                addMessage(`I couldn't process that file properly: ${data.error}`, 'bot');
                return;
            }
            
            // Handle different file types with appropriate responses
            let responseMessage = '';
            
            if (data.file_type === 'pdf') {
                responseMessage = `I've analyzed your PDF (${data.filename}):\n`;
                responseMessage += `• ${data.analysis.page_count} pages\n`;
                if (data.analysis.summary) {
                    responseMessage += `• Summary: ${data.analysis.summary}`;
                }
            } 
            else if (['png', 'jpg', 'jpeg'].includes(data.file_type)) {
                if (data.analysis.caption) {
                    responseMessage = `I see an image that appears to show: ${data.analysis.caption}`;
                } else {
                    responseMessage = `I've received your image (${data.filename}). What would you like to know about it?`;
                }
            }
            else if (data.file_type === 'txt') {
                responseMessage = `I've analyzed your text file (${data.filename}).\n`;
                if (data.analysis.summary) {
                    responseMessage += `Summary: ${data.analysis.summary}`;
                }
            }
            else {
                responseMessage = `I've received your ${data.file_type.toUpperCase()} file (${data.filename}). What would you like me to help you with?`;
            }
            
            addMessage(responseMessage, 'bot');
        })
        .catch(error => {
            console.error('Error:', error);
            typingIndicator.style.display = 'none';
            addMessage('Sorry, there was a problem uploading your file.', 'bot');
        });
    }
    
    // Add message to chat
    function addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.setAttribute('data-sender', sender === 'user' ? 'You' : 'Chatbot');
        
        // Convert URLs to clickable links and preserve newlines
        const formattedContent = content
            .replace(/https?:\/\/[^\s]+/g, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`)
            .replace(/\n/g, '<br>');
        
        messageDiv.innerHTML = formattedContent;
        chatContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // Add file message to chat
    function addFileMessage(file, fileType) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        messageDiv.setAttribute('data-sender', 'You');
        
        if (fileType === 'image') {
            // For images, create preview
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'file-preview';
                img.alt = file.name;
                messageDiv.appendChild(img);
                
                // Scroll after image loads
                img.onload = () => chatContainer.scrollTop = chatContainer.scrollHeight;
            };
            reader.readAsDataURL(file);
        } 
        else if (fileType === 'pdf') {
            // For PDFs, create icon preview
            const pdfPreview = document.createElement('div');
            pdfPreview.className = 'pdf-preview';
            pdfPreview.innerHTML = `
                <div class="pdf-icon">PDF</div>
                <div class="pdf-name">${file.name}</div>
            `;
            messageDiv.appendChild(pdfPreview);
        }
        else if (fileType === 'doc') {
            // For docs, create icon preview
            const docPreview = document.createElement('div');
            docPreview.className = 'doc-preview';
            docPreview.innerHTML = `
                <div class="doc-icon">DOC</div>
                <div class="doc-name">${file.name}</div>
            `;
            messageDiv.appendChild(docPreview);
        }
        else {
            // For other files, just show the name
            messageDiv.textContent = `File: ${file.name}`;
        }
        
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // Determine file type from extension
    function getFileType(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
        if (ext === 'pdf') return 'pdf';
        if (['doc', 'docx'].includes(ext)) return 'doc';
        if (ext === 'txt') return 'text';
        return 'other';
    }
    
    // Handle terminal control buttons
    document.querySelector('.control-close').addEventListener('click', function() {
        alert('This would close the chat in a real application.');
    });
    
    document.querySelector('.control-minimize').addEventListener('click', function() {
        alert('This would minimize the chat in a real application.');
    });
    
    // Add initial greeting
    if (chatContainer.children.length === 0) {
        addMessage('Welcome to Terminal Chatbot. I can process text, images, PDFs, and more. How can I assist you today?', 'bot');
    }
});