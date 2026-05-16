import json
import os
import logging
import smtplib
import httpx
import asyncio
import time
import tempfile
import urllib.request
import base64
import re
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks, File, UploadFile, Form
from fastapi.responses import JSONResponse
import libsql_client
from gradio_client import Client, handle_file
from huggingface_hub import AsyncInferenceClient
import google.generativeai as genai

from app.limiter import limiter
from app.database import get_db, to_dict_list
from app.rag import rag_manager
from app.models.schemas import (
    PillarResponse,
    PillarCreate,
    ArchitectureLayerResponse,
    ArchitectureLayerCreate,
    RevenueStreamResponse,
    RevenueStreamCreate,
    ContactSubmission,
    ContactResponse,
    NewsletterSubscription,
    NewsletterResponse,
    StatsResponse,
    MessageResponse,
    CaptchaResponse,
    ChatRequest,
    ChatResponse,
    User,
)
from app.security import get_current_user

router = APIRouter(prefix="/api", tags=["api"])
logger = logging.getLogger(__name__)

STABILITY_API_KEY = os.environ.get("STABILITY_API_KEY", "")

@router.get("/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# --- Pillars ---
@router.get("/pillars", response_model=list[PillarResponse], dependencies=[Depends(get_current_user)])
async def get_pillars(db: libsql_client.Client = Depends(get_db)):
    result = await db.execute("SELECT * FROM pillars ORDER BY number")
    return to_dict_list(result)

@router.post("/pillars", response_model=PillarResponse, status_code=201, dependencies=[Depends(get_current_user)])
async def create_pillar(pillar: PillarCreate, db: libsql_client.Client = Depends(get_db)):
    result = await db.execute(
        "INSERT INTO pillars (number, title, summary, description, icon, color) VALUES (?, ?, ?, ?, ?, ?)",
        (pillar.number, pillar.title, pillar.summary, pillar.description, pillar.icon, pillar.color),
    )
    new_id = result.last_insert_rowid
    return {**pillar.model_dump(), "id": new_id}

@router.put("/pillars/{pillar_id}", response_model=PillarResponse, dependencies=[Depends(get_current_user)])
async def update_pillar(pillar_id: int, pillar: PillarCreate, db: libsql_client.Client = Depends(get_db)):
    result = await db.execute("SELECT id FROM pillars WHERE id = ?", (pillar_id,))
    if not result.rows:
        raise HTTPException(status_code=404, detail="Pillar not found")
    
    await db.execute(
        "UPDATE pillars SET number=?, title=?, summary=?, description=?, icon=?, color=? WHERE id=?",
        (pillar.number, pillar.title, pillar.summary, pillar.description, pillar.icon, pillar.color, pillar_id),
    )
    return {**pillar.model_dump(), "id": pillar_id}

@router.delete("/pillars/{pillar_id}", response_model=MessageResponse, dependencies=[Depends(get_current_user)])
async def delete_pillar(pillar_id: int, db: libsql_client.Client = Depends(get_db)):
    result = await db.execute("SELECT id FROM pillars WHERE id = ?", (pillar_id,))
    if not result.rows:
        raise HTTPException(status_code=404, detail="Pillar not found")
    
    await db.execute("DELETE FROM pillars WHERE id = ?", (pillar_id,))
    return {"message": "Pillar deleted", "success": True}

# --- Architecture Layers ---
@router.get("/architecture", response_model=list[ArchitectureLayerResponse], dependencies=[Depends(get_current_user)])
async def get_architecture_layers(db: libsql_client.Client = Depends(get_db)):
    result = await db.execute("SELECT * FROM architecture_layers ORDER BY layer_number")
    res_list = to_dict_list(result)
    for d in res_list:
        d["tags"] = json.loads(d["tags"])
    return res_list

@router.post("/architecture", response_model=ArchitectureLayerResponse, status_code=201, dependencies=[Depends(get_current_user)])
async def create_architecture_layer(layer: ArchitectureLayerCreate, db: libsql_client.Client = Depends(get_db)):
    result = await db.execute(
        "INSERT INTO architecture_layers (layer_number, title, description, icon, color, tags) VALUES (?, ?, ?, ?, ?, ?)",
        (layer.layer_number, layer.title, layer.description, layer.icon, layer.color, json.dumps(layer.tags)),
    )
    new_id = result.last_insert_rowid
    return {**layer.model_dump(), "id": new_id}

@router.put("/architecture/{layer_id}", response_model=ArchitectureLayerResponse, dependencies=[Depends(get_current_user)])
async def update_architecture_layer(layer_id: int, layer: ArchitectureLayerCreate, db: libsql_client.Client = Depends(get_db)):
    result = await db.execute("SELECT id FROM architecture_layers WHERE id = ?", (layer_id,))
    if not result.rows:
        raise HTTPException(status_code=404, detail="Architecture layer not found")
    
    await db.execute(
        "UPDATE architecture_layers SET layer_number=?, title=?, description=?, icon=?, color=?, tags=? WHERE id=?",
        (layer.layer_number, layer.title, layer.description, layer.icon, layer.color, json.dumps(layer.tags), layer_id),
    )
    return {**layer.model_dump(), "id": layer_id}

@router.delete("/architecture/{layer_id}", response_model=MessageResponse, dependencies=[Depends(get_current_user)])
async def delete_architecture_layer(layer_id: int, db: libsql_client.Client = Depends(get_db)):
    result = await db.execute("SELECT id FROM architecture_layers WHERE id = ?", (layer_id,))
    if not result.rows:
        raise HTTPException(status_code=404, detail="Architecture layer not found")
    
    await db.execute("DELETE FROM architecture_layers WHERE id = ?", (layer_id,))
    return {"message": "Architecture layer deleted", "success": True}

# --- Revenue Streams ---
@router.get("/revenue-streams", response_model=list[RevenueStreamResponse], dependencies=[Depends(get_current_user)])
async def get_revenue_streams(db: libsql_client.Client = Depends(get_db)):
    result = await db.execute("SELECT * FROM revenue_streams ORDER BY id")
    return to_dict_list(result)

@router.post("/revenue-streams", response_model=RevenueStreamResponse, status_code=201, dependencies=[Depends(get_current_user)])
async def create_revenue_stream(stream: RevenueStreamCreate, db: libsql_client.Client = Depends(get_db)):
    result = await db.execute(
        "INSERT INTO revenue_streams (title, description, icon, color) VALUES (?, ?, ?, ?)",
        (stream.title, stream.description, stream.icon, stream.color),
    )
    new_id = result.last_insert_rowid
    return {**stream.model_dump(), "id": new_id}

@router.delete("/revenue-streams/{stream_id}", response_model=MessageResponse, dependencies=[Depends(get_current_user)])
async def delete_revenue_stream(stream_id: int, db: libsql_client.Client = Depends(get_db)):
    result = await db.execute("SELECT id FROM revenue_streams WHERE id = ?", (stream_id,))
    if not result.rows:
        raise HTTPException(status_code=404, detail="Revenue stream not found")
    
    await db.execute("DELETE FROM revenue_streams WHERE id = ?", (stream_id,))
    return {"message": "Revenue stream deleted", "success": True}

# --- CAPTCHA ---
@router.get("/captcha", response_model=CaptchaResponse)
async def get_captcha():
    import random
    from app.security import create_access_token
    from datetime import timedelta

    a = random.randint(1, 10)
    b = random.randint(1, 10)
    question = f"{a} + {b} = ?"
    answer = str(a + b)

    # We use a short-lived token to store the answer
    token = create_access_token(data={"ans": answer}, expires_delta=timedelta(minutes=5))
    return {"question": question, "captcha_token": token}

# --- Contact Form Helper ---
def send_contact_email(submission: ContactSubmission):
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")

    if not all([smtp_host, smtp_user, smtp_pass]):
        return

    msg = MIMEMultipart()
    msg['From'] = smtp_user
    msg['To'] = "naira@nbu.edu.ng"
    msg['Subject'] = f"New Contact Submission from {submission.name}"

    body = f"""
    New contact submission received:

    Name: {submission.name}
    Email: {submission.email}
    Role: {submission.role}

    Message:
    {submission.message}
    """
    msg.attach(MIMEText(body, 'plain'))

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
    except Exception:
        pass

# --- Contact Form ---
@router.post("/contact", response_model=MessageResponse, status_code=201)
@limiter.limit("5/minute")
async def submit_contact(request: Request, submission: ContactSubmission, background_tasks: BackgroundTasks, db: libsql_client.Client = Depends(get_db)):
    # Honeypot check
    if submission.honeypot:
        return {"message": "Thank you for reaching out! We will get back to you soon.", "success": True} # Silent fail for bots

    # CAPTCHA check
    if not submission.captcha_token or not submission.captcha_answer:
        raise HTTPException(status_code=400, detail="CAPTCHA required")

    from jose import jwt
    from app.security import SECRET_KEY, ALGORITHM
    try:
        payload = jwt.decode(submission.captcha_token, SECRET_KEY, algorithms=[ALGORITHM])
        expected_answer = payload.get("ans")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired CAPTCHA token")

    if submission.captcha_answer.strip() != expected_answer:
        raise HTTPException(status_code=400, detail="Incorrect CAPTCHA answer")

    await db.execute(
        "INSERT INTO contact_submissions (name, email, role, message) VALUES (?, ?, ?, ?)",
        (submission.name, submission.email, submission.role, submission.message),
    )
    background_tasks.add_task(send_contact_email, submission)
    return {"message": "Thank you for reaching out! We will get back to you soon.", "success": True}

@router.get("/contact", response_model=list[ContactResponse], dependencies=[Depends(get_current_user)])
async def get_contacts(db: libsql_client.Client = Depends(get_db)):
    result = await db.execute("SELECT * FROM contact_submissions ORDER BY created_at DESC")
    return to_dict_list(result)

# --- Newsletter ---
@router.post("/newsletter", response_model=MessageResponse, status_code=201)
@limiter.limit("5/minute")
async def subscribe_newsletter(request: Request, subscription: NewsletterSubscription, db: libsql_client.Client = Depends(get_db)):
    # Honeypot check
    if subscription.honeypot:
        return {"message": "Successfully subscribed to the newsletter!", "success": True} # Silent fail for bots

    try:
        await db.execute(
            "INSERT INTO newsletter_subscribers (email) VALUES (?)",
            (subscription.email,),
        )
        return {"message": "Successfully subscribed to the newsletter!", "success": True}
    except Exception:
        return {"message": "This email is already subscribed.", "success": False}

@router.get("/newsletter", response_model=list[NewsletterResponse], dependencies=[Depends(get_current_user)])
async def get_subscribers(db: libsql_client.Client = Depends(get_db)):
    result = await db.execute("SELECT * FROM newsletter_subscribers ORDER BY created_at DESC")
    return to_dict_list(result)

# --- Stats ---
@router.get("/stats", response_model=StatsResponse, dependencies=[Depends(get_current_user)])
async def get_stats(db: libsql_client.Client = Depends(get_db)):
    pillars_res = await db.execute("SELECT COUNT(*) FROM pillars")
    pillars_count = pillars_res.rows[0][0]
    
    layers_res = await db.execute("SELECT COUNT(*) FROM architecture_layers")
    layers_count = layers_res.rows[0][0]
    
    return {
        "pillars_count": pillars_count,
        "architecture_layers_count": layers_count,
        "xr_label": "XR",
        "ai_label": "AI",
    }

# --- 3D Cell Forge AI Pipeline (Multi-Model) ---

async def try_stable_fast_3d(image_bytes: bytes, filename: str, content_type: str) -> tuple[bytes | None, str | None]:
    """Call Stability AI SF3D API."""
    if not STABILITY_API_KEY:
        return None, "STABILITY_API_KEY not configured."

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "https://api.stability.ai/v2beta/3d/stable-fast-3d",
                headers={"Authorization": f"Bearer {STABILITY_API_KEY}"},
                files={"image": (filename, image_bytes, content_type)},
                data={
                    "texture_resolution": "1024",
                    "foreground_ratio": "0.85",
                    "remesh": "none"
                }
            )

        if response.status_code == 200:
            return response.content, None

        if response.status_code == 401:
            return None, "Invalid STABILITY_API_KEY."
        if response.status_code == 402:
            return None, "Insufficient Stability AI credits."

        return None, f"Stability AI Error: {response.text}"
    except Exception as e:
        return None, str(e)

def try_hf_space(image_path: str, space_id: str, display_name: str) -> tuple[bytes | None, str | None]:
    """Try a single HF Gradio Space."""
    try:
        logger.info(f"Trying Space: {space_id}")

        HF_TOKEN = os.environ.get("HF_API_TOKEN", "")
        if HF_TOKEN:
            os.environ["HUGGING_FACE_HUB_TOKEN"] = HF_TOKEN

        client = Client(space_id)

        # Log available endpoints for debugging
        try:
            api_info = client.view_api(return_format="dict", print_info=False)
            endpoints = list(api_info.get("named_endpoints", {}).keys())
            logger.info(f"{space_id} endpoints: {endpoints}")
        except Exception:
            pass

        image_input = handle_file(image_path)

        # Try common endpoints
        result = None
        for api_name in ["/image_to_3d", "/predict", "/generate"]:
            try:
                result = client.predict(
                    image=image_input,
                    multiimages=[],
                    seed=0,
                    ss_guidance_strength=7.5,
                    ss_sampling_steps=12,
                    slat_guidance_strength=3,
                    slat_sampling_steps=12,
                    multiimage_algo="stochastic",
                    api_name=api_name
                )
                logger.info(f"{space_id} responded on {api_name}")
                break
            except Exception as e:
                if "api_name" in str(e).lower():
                    continue
                raise e

        if result is None:
            return None, "No valid API endpoint found"

        # Extract GLB from result
        glb_path = None
        if isinstance(result, (list, tuple)):
            for item in result:
                if isinstance(item, str) and item.endswith(".glb"):
                    glb_path = item
                    break
                if isinstance(item, dict):
                    for v in item.values():
                        if isinstance(v, str) and v.endswith(".glb"):
                            glb_path = v
                            break

        if not glb_path:
            return None, f"No GLB in result: {str(result)[:300]}"

        with open(glb_path, "rb") as f:
            glb_bytes = f.read()

        logger.info(f"{space_id} success: {len(glb_bytes)} bytes")
        return glb_bytes, None

    except Exception as e:
        error_msg = str(e)[:300]
        logger.warning(f"{space_id} failed: {error_msg}")
        return None, error_msg

@router.post("/cellforge/generate")
@limiter.limit("2/minute")
async def generate_3d_cell(
    request: Request,
    file: UploadFile = File(None),
    url: str = Form(None),
    model_id: str = Form("stable_fast_3d")
):
    VALID_MODELS = ["stable_fast_3d", "trellis2", "hunyuan3d", "hi3dgen", "triposr"]
    if model_id not in VALID_MODELS:
        model_id = "stable_fast_3d"

    if not file and not url:
        return JSONResponse(
            status_code=400,
            content={"error": "Please provide an image file upload or an image URL."}
        )

    image_path = None
    image_bytes = None
    filename = "image.jpg"
    content_type = "image/jpeg"

    try:
        # Get image data
        if file:
            image_bytes = await file.read()
            filename = file.filename or "image.jpg"
            content_type = file.content_type or "image/jpeg"
            # Need a physical file for Gradio handle_file
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1] or ".jpg") as tmp:
                tmp.write(image_bytes)
                image_path = tmp.name
        else:
            # Download from URL
            with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
                urllib.request.urlretrieve(url, tmp.name)
                with open(tmp.name, "rb") as f:
                    image_bytes = f.read()
                image_path = tmp.name
            filename = url.split("/")[-1] or "image.jpg"
            for ext, ct in {".png": "image/png", ".webp": "image/webp"}.items():
                if url.lower().endswith(ext):
                    content_type = ct
                    break

        glb_bytes = None
        error = None
        provider_used = None

        if model_id == "stable_fast_3d":
            glb_bytes, error = await try_stable_fast_3d(image_bytes, filename, content_type)
            provider_used = "Stable Fast 3D"
        elif model_id == "trellis2":
            glb_bytes, error = await asyncio.to_thread(try_hf_space, image_path, "microsoft/TRELLIS.2", "TRELLIS.2-4B (Microsoft)")
            provider_used = "TRELLIS.2-4B"
        elif model_id == "hunyuan3d":
            glb_bytes, error = await asyncio.to_thread(try_hf_space, image_path, "tencent/Hunyuan3D-2", "Hunyuan3D 2.1 (Tencent)")
            provider_used = "Hunyuan3D 2.1"
        elif model_id == "hi3dgen":
            glb_bytes, error = await asyncio.to_thread(try_hf_space, image_path, "weights-community/Hi3DGen", "Hi3DGen")
            provider_used = "Hi3DGen"
        elif model_id == "triposr":
            glb_bytes, error = await asyncio.to_thread(try_hf_space, image_path, "stabilityai/TripoSR", "TripoSR")
            provider_used = "TripoSR"

        # Cleanup
        if image_path and os.path.exists(image_path):
            try:
                os.unlink(image_path)
            except:
                pass

        if not glb_bytes:
            return JSONResponse(
                status_code=502,
                content={
                    "error": f"{provider_used} failed: {error}",
                    "suggestion": "Try a different model — some Spaces may be temporarily down."
                }
            )

        # Success
        glb_b64 = base64.b64encode(glb_bytes).decode()
        return JSONResponse(
            status_code=200,
            content={
                "model_data": glb_b64,
                "format": "glb",
                "provider": provider_used
            }
        )

    except Exception as e:
        logger.error(f"generate_3d error: {str(e)}")
        if image_path and os.path.exists(image_path):
            try:
                os.unlink(image_path)
            except:
                pass
        return JSONResponse(
            status_code=500,
            content={"error": f"Server error: {str(e)}"}
        )

# --- AI Biology Lab Endpoints (Open-Source Vision) ---

async def call_os_vision_model(image_b64: str, prompt: str, model_id: str) -> tuple[str | None, str | None]:
    """Helper to call open-source vision models via HF Inference API."""
    token = os.getenv("HF_TOKEN")
    if not token:
        return None, "HF_TOKEN (Hugging Face API Token) not configured."

    # Use a vision-capable open-source model
    # Routing based on model_id
    models = {
        "llava": "llava-hf/llava-1.5-7b-hf",
        "moondream": "vikhyatk/moondream2",
        "bakllava": "SkunkworksAI/BakLLaVA-1",
        "florence": "llava-hf/llava-1.5-7b-hf" # Default to llava for Florence if not using specific Florence pipeline
    }
    target_model = models.get(model_id, models["llava"])

    try:
        client = AsyncInferenceClient(token=token)

        # Format for vision models on HF Inference API
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
                ],
            }
        ]

        response = await client.chat_completion(
            messages=messages,
            model=target_model,
            max_tokens=1000
        )
        return response.choices[0].message.content, None
    except Exception as e:
        logger.error(f"HF Vision Error ({target_model}): {e}")
        return None, str(e)

@router.post("/biology-lab/analyse")
@limiter.limit("2/minute")
async def analyse_biology_image(
    request: Request,
    file: UploadFile = File(None),
    url: str = Form(None),
    model_id: str = Form("llava")
):
    """
    Analyse a biology image using open-source vision models.
    Returns structured list of biological components.
    """
    if not file and not url:
        return JSONResponse(
            status_code=400,
            content={"error": "No image or URL provided"}
        )

    try:
        # Get image bytes
        if file:
            image_bytes = await file.read()
        elif url:
            async with httpx.AsyncClient() as client:
                response = await client.get(url)
                image_bytes = response.content

        image_b64 = base64.b64encode(image_bytes).decode()

        # Structured prompt for component extraction
        prompt = """
        Analyse this biological/microscopy image.
        Identify ALL visible biological components, organelles, or structures.

        Return ONLY a valid JSON array. No markdown, no conversation.

        Format:
        [
          {
            "id": "nucleus",
            "name": "Nucleus",
            "type": "nucleus",
            "color": "#6366f1",
            "size": "large",
            "description": "The control center of the cell containing DNA",
            "function": "Controls cell activities and contains genetic material",
            "facts": ["Contains DNA", "Surrounded by nuclear envelope", "Directs protein synthesis"],
            "position_hint": "center"
          }
        ]

        Types: nucleus, mitochondria, membrane, chloroplast, vacuole, ribosome, golgi, endoplasmic_reticulum, lysosome, cytoplasm, rod, sphere, tissue, bacteria.
        Size: large, medium, small.
        Position_hint: center, inner, outer, scattered.
        """

        result_text, error = await call_os_vision_model(image_b64, prompt, model_id)

        if error:
            return JSONResponse(status_code=502, content={"error": error})

        # Parse JSON response
        text = result_text.strip()
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'\s*```$', '', text)

        # Find the first [ and last ] to handle potential chatter
        start = text.find('[')
        end = text.rfind(']') + 1
        if start != -1 and end != 0:
            text = text[start:end]

        components = json.loads(text)

        return JSONResponse(
            status_code=200,
            content={
                "components": components,
                "count": len(components),
                "model_used": model_id
            }
        )

    except Exception as e:
        logger.error(f"Biology analysis failed: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Analysis failed: {str(e)}"}
        )

@router.post("/biology-lab/chat")
async def biology_lab_chat(
    request: Request
):
    """
    AI Biology Guide chat using open-source models.
    """
    try:
        body = await request.json()
        user_message = body.get("message", "")
        scene_context = body.get("components", [])
        model_id = body.get("model_id", "hf") # Fallback to default HF model

        context_str = ", ".join([c.get("name", "") for c in scene_context]) if scene_context else "general biology"

        system_prompt = f"""
        You are an expert Biology Guide at the NAIRA Institute.
        You are helping a student explore a 3D visualization.

        Visible components: {context_str}

        Role:
        - Explain structures clearly.
        - Connect to African examples (e.g. local parasites, flora).
        - Use student-friendly analogies.
        - Under 120 words.
        """

        # Use open-source model via HF
        token = os.getenv("HF_TOKEN")

        # Map biology models to chat-capable OS models
        chat_models = {
            "llava": "mistralai/Mistral-7B-Instruct-v0.3",
            "moondream": "Qwen/Qwen2.5-7B-Instruct",
            "bakllava": "mistralai/Mistral-7B-Instruct-v0.3",
            "florence": "microsoft/Phi-3-mini-4k-instruct"
        }
        target_chat_model = chat_models.get(model_id, "mistralai/Mistral-7B-Instruct-v0.3")

        if token:
            response = await call_huggingface(system_prompt, user_message, model_id=target_chat_model)
        else:
            # Final fallback if keys are missing
            response = "I'm currently in local mode. I can see you're looking at " + context_str + ". How can I assist you with these biological structures?"

        return JSONResponse(
            status_code=200,
            content={"response": response}
        )
    except Exception as e:
        logger.error(f"Biology Guide error: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Guide error: {str(e)}"}
        )

# --- AI Chat ---

async def call_gemini(system_prompt: str, user_msg: str):
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = await model.generate_content_async(f"{system_prompt}\n\nUser: {user_msg}")
        return response.text
    except Exception as e:
        return f"Error calling Gemini: {str(e)}"

async def call_huggingface(system_prompt: str, user_msg: str, model_id: str = "mistralai/Mistral-7B-Instruct-v0.3"):
    token = os.getenv("HF_TOKEN")
    if not token:
        return None
    try:
        client = AsyncInferenceClient(token=token)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_msg},
        ]
        response = await client.chat_completion(messages, model=model_id, max_tokens=500)
        return response.choices[0].message.content
    except Exception as e:
        return f"Error calling Hugging Face: {str(e)}"

@router.post("/chat", response_model=ChatResponse)
@limiter.limit("10/minute")
async def chat_ai(request: Request, chat_request: ChatRequest, db: libsql_client.Client = Depends(get_db)):
    user_msg = chat_request.message
    selected_model = chat_request.model
    
    # Enhanced RAG retrieval
    relevant_docs = await rag_manager.query(user_msg)
    naira_context = "\n".join(relevant_docs) if relevant_docs else "No specific NAIRA context found for this query."
    
    system_prompt = f"""You are the NAIRA AI Assistant, an expert on the NBU AI Research & Advancement Institute.
Your goal is to provide helpful, accurate, and culturally relevant information about NAIRA's work in AI and XR.

RELEVANT NAIRA CONTEXT:
{naira_context}

Guidelines:
1. Use the provided context to answer questions about NAIRA.
2. If the user asks something outside this context, answer generally but try to relate it back to NAIRA's mission (African-centered AI/XR).
3. Be professional, visionary, and encouraging.
4. Keep responses concise but informative.
"""

    gemini_key = os.getenv("GOOGLE_API_KEY")
    hf_token = os.getenv("HF_TOKEN")

    if selected_model == "gemini" and gemini_key:
        response_text = await call_gemini(system_prompt, user_msg)
        return {"response": response_text}
    elif selected_model == "hf" and hf_token:
        response_text = await call_huggingface(system_prompt, user_msg)
        return {"response": response_text}
    elif selected_model == "qwen" and hf_token:
        response_text = await call_huggingface(system_prompt, user_msg, model_id="Qwen/Qwen3-Next-80B-A3B-Instruct")
        return {"response": response_text}
    elif selected_model in ["gemini", "hf", "qwen"]:
        # User selected a premium model but keys are missing
        return {"response": f"I see you selected {selected_model.upper()}, but I'm currently running in Local Mode because no API keys were found. To use {selected_model.upper()}, please configure the environment variables."}
    else:
        # Enhanced Fallback: if user message matches keywords, use specific context
        full_message = user_msg.lower()
        if any(k in full_message for k in ["pillar", "strategy", "focus"]):
            return {"response": "NAIRA operates on six strategic pillars, including African-Centered AI Research and Educational Transformation. Based on our records: " + naira_context[:200] + "..."}
        if any(k in full_message for k in ["project", "doing", "working"]):
            return {"response": "We are currently working on high-impact projects. Relevant info: " + naira_context[:200] + "..."}
        if any(k in full_message for k in ["architecture", "layer", "system"]):
            return {"response": "Our architecture is built on multiple layers: Experience, Intelligence, and Data. " + naira_context[:200] + "..."}
            
        return {"response": f"I'm the NAIRA Assistant. Using our knowledge base, I found this relevant information: {naira_context[:300]}... How else can I help you today?"}
