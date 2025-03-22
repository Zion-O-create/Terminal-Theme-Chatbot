from flask import Flask, request, jsonify, render_template, send_from_directory
import os
import json
import requests
from werkzeug.utils import secure_filename
import fitz  # PyMuPDF for PDF processing
from transformers import pipeline
import base64
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__, static_folder='static')
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload size
app.config['ALLOWED_EXTENSIONS'] = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'docx'}

# Create uploads folder if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Get Hugging Face API key from environment variable
HUGGINGFACE_API_KEY = os.getenv('HUGGINGFACE_API_KEY')
if not HUGGINGFACE_API_KEY:
    print("Warning: HUGGINGFACE_API_KEY not found in environment variables")

# Initialize text generation pipeline (offline alternative to API)
try:
    text_generator = pipeline("text-generation", model="gpt2")
except:
    text_generator = None
    print("Warning: Local text generation model could not be loaded. Will use API only.")

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('message', '')
    
    # Call Hugging Face API for text generation
    try:
        response = call_huggingface_text_api(message)
        return jsonify({"response": response})
    except Exception as e:
        # Fallback to local model if API fails
        if text_generator:
            fallback_response = text_generator(message, max_length=100)[0]['generated_text']
            return jsonify({"response": fallback_response, "note": "Generated from fallback local model"})
        return jsonify({"error": str(e), "response": "I'm having trouble processing that right now."})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    # Check if file part exists
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        # Process file based on type
        file_type = filename.rsplit('.', 1)[1].lower()
        
        try:
            if file_type in ['png', 'jpg', 'jpeg']:
                analysis = analyze_image(file_path)
            elif file_type == 'pdf':
                analysis = analyze_pdf(file_path)
            elif file_type == 'txt':
                with open(file_path, 'r', encoding='utf-8') as f:
                    text_content = f.read()
                analysis = {"content": text_content, "summary": summarize_text(text_content)}
            else:
                analysis = {"message": f"File uploaded successfully, but detailed analysis for {file_type} is not implemented yet."}
                
            return jsonify({
                "filename": filename,
                "file_type": file_type,
                "file_url": f"/uploads/{filename}",
                "analysis": analysis
            })
        except Exception as e:
            return jsonify({"error": str(e), "filename": filename, "message": "File was uploaded but could not be processed."}), 500
    
    return jsonify({"error": "File type not allowed"}), 400

def call_huggingface_text_api(text):
    """Call Hugging Face API for text generation"""
    API_URL = "https://api-inference.huggingface.co/models/gpt2"
    headers = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}
    payload = {"inputs": text, "parameters": {"max_length": 150}}
    
    response = requests.post(API_URL, headers=headers, json=payload)
    result = response.json()
    
    # Handle different response formats
    if isinstance(result, list) and len(result) > 0:
        if isinstance(result[0], dict) and 'generated_text' in result[0]:
            return result[0]['generated_text']
    
    # Fallback handling for different API response structures
    if isinstance(result, dict) and 'error' in result:
        raise Exception(result['error'])
        
    return str(result)

def analyze_image(image_path):
    """Analyze image using Hugging Face's image-to-text model"""
    API_URL = "https://api-inference.huggingface.co/models/nlpconnect/vit-gpt2-image-captioning"
    headers = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}
    
    with open(image_path, "rb") as image_file:
        image_data = base64.b64encode(image_file.read()).decode('utf-8')
    
    payload = {"inputs": {"image": image_data}}
    response = requests.post(API_URL, headers=headers, json=payload)
    
    # Handle response or errors
    if response.status_code == 200:
        result = response.json()
        if isinstance(result, list) and len(result) > 0:
            return {"caption": result[0]["generated_text"]}
        return {"caption": str(result)}
    else:
        return {"error": f"API Error: {response.status_code}", "message": response.text}

def analyze_pdf(pdf_path):
    """Extract and analyze text from PDF"""
    text_content = ""
    try:
        doc = fitz.open(pdf_path)
        for page in doc:
            text_content += page.get_text()
        doc.close()
        
        # Get summary if content is not too short
        summary = summarize_text(text_content) if len(text_content) > 100 else text_content
        
        return {
            "page_count": doc.page_count,
            "text_preview": text_content[:500] + "..." if len(text_content) > 500 else text_content,
            "summary": summary
        }
    except Exception as e:
        return {"error": str(e), "message": "Failed to process PDF"}

def summarize_text(text, max_length=100):
    """Summarize text using Hugging Face API"""
    API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-cnn"
    headers = {"Authorization": f"Bearer {HUGGINGFACE_API_KEY}"}
    
    # Limit input text to avoid API issues
    truncated_text = text[:5000] if len(text) > 5000 else text
    
    payload = {
        "inputs": truncated_text,
        "parameters": {"max_length": max_length, "min_length": 30}
    }
    
    try:
        response = requests.post(API_URL, headers=headers, json=payload)
        result = response.json()
        
        if isinstance(result, list) and len(result) > 0:
            if isinstance(result[0], dict) and 'summary_text' in result[0]:
                return result[0]['summary_text']
            
        # Fallback to first 100 characters if summarization fails
        return truncated_text[:100] + "..."
    except:
        return "Summary not available. " + truncated_text[:100] + "..."

if __name__ == '__main__':
    app.run(debug=True)