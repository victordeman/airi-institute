# NAIRA - African AI & XR Excellence Hub

AIRI (AIRI Institute.) is a full-stack FastAPI application dedicated to transforming education and innovation through immersive XR experiences and agentic AI architectures, centered on African excellence. Visit the site here https://nairasite0.vercel.app/

## 🚀 Features

- **AI Assistant with RAG**: A context-aware AI agent using Retrieval-Augmented Generation (RAG) powered by Google Gemini or Hugging Face. Supports a Local Mode fallback.
- **Dynamic Content Management**: Strategic pillars, architecture layers, projects, and vision/mission statements are served dynamically from a libSQL/Turso database.
- **User Authentication**: Secure JWT-based authentication system with registration, login, and profile management.
- **Multilingual Support**: Built-in support for English, Yoruba, Swahili, Igbo, and Hausa.
- **Security & Anti-Spam**:
  - Stateless math CAPTCHA for forms.
  - Hidden honeypot fields to deter bots.
  - Rate limiting via SlowAPI.
  - Secure password hashing with BCrypt.
- **Responsive Frontend**: Modern UI built with Tailwind CSS, Feather Icons, and Jinja2 templates.
- **Interactive Pages**: Dedicated sections for Vision, Pillars, Architecture, Projects, and Revenue Streams.

## 📂 Project Structure

```
.
├── app/
│   ├── models/          # Pydantic schemas (schemas.py)
│   ├── routers/         # API, Auth, and Page routers
│   ├── static/          # CSS, JS, and image files
│   ├── templates/       # HTML templates (Jinja2)
│   ├── database.py      # Database configuration and initialization
│   ├── limiter.py       # Rate limiting configuration
│   ├── main.py          # FastAPI application entry point & lifespan
│   ├── rag.py           # RAG Manager for AI Agent context
│   ├── security.py      # Auth logic, JWT, and password hashing
│   └── seed_data.py     # Initial database content
├── tests/               # Pytest suite
├── migrate.py           # Database migration script
├── requirements.txt     # Python dependencies
├── vercel.json          # Vercel deployment configuration
└── README.md            # Project documentation
```

## 🛠️ Tech Stack

- **Backend**: FastAPI (Python)
- **Database**: libSQL / Turso (SQLite compatible)
- **AI/ML**: Google Generative AI (Gemini), Hugging Face Hub, NumPy (Vector Search)
- **Security**: Python-Jose (JWT), Passlib (BCrypt), SlowAPI
- **Frontend**: Tailwind CSS, Feather Icons, Jinja2 Templates

## ⚙️ Environment Variables

To fully enable all features, configure the following environment variables:

| Variable | Description |
| :--- | :--- |
| `TURSO_DATABASE_URL` | URL for the Turso/libSQL database. |
| `TURSO_AUTH_TOKEN` | Auth token for the Turso database. |
| `GOOGLE_API_KEY` | Google AI Studio key (Required for Gemini & RAG embeddings). |
| `HF_TOKEN` | Hugging Face Access Token (Optional for Llama/Mistral models). |
| `SMTP_HOST` | SMTP server host for contact form emails. |
| `SMTP_PORT` | SMTP server port (default: 587). |
| `SMTP_USER` | SMTP username. |
| `SMTP_PASSWORD` | SMTP password. |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins. |
| `SECRET_KEY` | Secret key for JWT token signing. |

## 🚀 Setup and Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Create a virtual environment**:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```

3.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the application**:
    ```bash
    uvicorn app.main:app --reload
    ```
    The application will be available at `http://127.0.0.1:8000`.

## 🧪 Testing

Run the test suite using `pytest`:

```bash
pytest
```

## 🔗 Key Endpoints

- **Pages**:
  - `/`: Home
  - `/vision`: Vision & Mission
  - `/pillars`: Strategic Pillars
  - `/architecture`: Technical Architecture
  - `/projects`: Innovation Projects
  - `/agent`: AI Assistant Interface
  - `/login` / `/register` / `/profile`: User Management

- **API**:
  - `/api/chat`: AI Agent interaction
  - `/api/contact`: Contact form submission
  - `/api/newsletter`: Newsletter subscription
  - `/auth/token`: JWT Token generation
  - `/docs`: Swagger UI documentation
