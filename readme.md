# Terminal Chatbot with Multi-Modal Support

This project implements a chatbot with a terminal-style UI that can process text, images, PDFs, and other file types using Hugging Face models.

## Features

- Modern terminal-style UI with responsive design
- Text chat with AI-powered responses
- File uploads (images, PDFs, text files, documents)
- Image analysis and captioning
- PDF text extraction and summarization
- Dark theme with gold accents

## Requirements

- Python 3.7+ 
- Flask
- Transformers library
- PyMuPDF (for PDF processing)
- Hugging Face API key

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/terminal-chatbot.git
   cd terminal-chatbot
   ```

2. Create and activate a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install the dependencies:
   ```
   pip install flask transformers requests python-dotenv PyMuPDF torch
   ```

4. Set up the environment variables:
   - Create a `.env` file in the project root
   - Add your Hugging Face API key: `HUGGINGFACE_API_KEY=your_key_here`

## Project Structure

```
terminal-chatbot/
├── app.py                  # Flask backend
├── static/                 # Static files
│   ├── js/
│   │   └── chat.js         # Frontend JavaScript
│   └── css/
│       └── style.css       # Styles (optional, included in HTML)
├── templates/
│   └── index.html          # Main HTML template
├── uploads/                # File upload directory
└── .env                    # Environment variables
```

## Running the Application

1. Make sure your virtual environment is activated
2. Run the Flask application:
   ```
   flask run
   ```
3. Open your browser and navigate to `http://127.0.0.1:5000`

## Usage

- Type messages in the input box and press Enter or click the send button
- Upload files by clicking the paperclip icon
- The chatbot will process your input and provide AI-generated responses
- For images, the chatbot will attempt to describe what's in the image
- For PDFs, the chatbot will extract text and provide a summary

## Notes on Hugging Face API

This application uses several Hugging Face models:
- Text generation (gpt2)
- Image captioning (vit-gpt2-image-captioning)
- Text summarization (facebook/bart-large-cnn)

If your API calls are rate-limited, the application will attempt to fall back to local models where possible.

## Customization

- To change the theme colors, modify the CSS variables in the `:root` selector
- To use different AI models, update the API_URL values in the appropriate functions