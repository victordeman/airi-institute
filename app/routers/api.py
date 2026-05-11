import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
import libsql_client
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

# --- AI Chat ---
import google.generativeai as genai
from huggingface_hub import AsyncInferenceClient

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
