import os
import json
from fastapi import APIRouter, Depends, Request
from fastapi.templating import Jinja2Templates
import libsql_client
from app.database import get_db, to_dict_list

router = APIRouter(tags=["pages"])

# Define the base directory for templates
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

@router.get("/")
async def home(request: Request, db: libsql_client.Client = Depends(get_db)):
    pillars_res = await db.execute("SELECT * FROM pillars ORDER BY number")
    pillars = to_dict_list(pillars_res)
    
    layers_res = await db.execute("SELECT * FROM architecture_layers ORDER BY layer_number")
    architecture_layers = to_dict_list(layers_res)
    for d in architecture_layers:
        d["tags"] = json.loads(d["tags"])
    
    pillars_count_res = await db.execute("SELECT COUNT(*) FROM pillars")
    pillars_count = pillars_count_res.rows[0][0]
    
    layers_count_res = await db.execute("SELECT COUNT(*) FROM architecture_layers")
    layers_count = layers_count_res.rows[0][0]
    
    stats = {
        "pillars_count": pillars_count,
        "architecture_layers_count": layers_count,
        "xr_label": "XR",
        "ai_label": "AI",
    }
    
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "pillars": pillars,
            "architecture_layers": architecture_layers,
            "stats": stats,
        },
    )

@router.get("/vision")
async def vision(request: Request, db: libsql_client.Client = Depends(get_db)):
    res = await db.execute("SELECT * FROM vision_missions ORDER BY id")
    vision_missions = to_dict_list(res)
    return templates.TemplateResponse("vision.html", {"request": request, "vision_missions": vision_missions})

@router.get("/services")
async def services(request: Request, db: libsql_client.Client = Depends(get_db)):
    res = await db.execute("SELECT * FROM services ORDER BY id")
    services_list = to_dict_list(res)
    for s in services_list:
        s["items"] = json.loads(s["items"])
    return templates.TemplateResponse("services.html", {"request": request, "services": services_list})

@router.get("/vision/{slug}")
async def vision_detail(slug: str, request: Request, db: libsql_client.Client = Depends(get_db)):
    res = await db.execute("SELECT * FROM vision_missions WHERE slug = ?", (slug,))
    vision_mission = to_dict_list(res)
    if not vision_mission:
        return templates.TemplateResponse("vision.html", {"request": request, "vision_missions": []})
    return templates.TemplateResponse("vision_detail.html", {"request": request, "item": vision_mission[0]})

@router.get("/pillars")
async def pillars(request: Request, db: libsql_client.Client = Depends(get_db)):
    pillars_res = await db.execute("SELECT * FROM pillars ORDER BY number")
    pillars = to_dict_list(pillars_res)
    return templates.TemplateResponse("pillars.html", {"request": request, "pillars": pillars})

@router.get("/pillars/{number}")
async def pillar_detail(number: str, request: Request, db: libsql_client.Client = Depends(get_db)):
    res = await db.execute("SELECT * FROM pillars WHERE number = ?", (number,))
    pillar = to_dict_list(res)
    if not pillar:
        # Fallback if pillar not found, could also raise 404
        return templates.TemplateResponse("pillars.html", {"request": request, "pillars": []})
    return templates.TemplateResponse("pillar_detail.html", {"request": request, "pillar": pillar[0]})

@router.get("/architecture")
async def architecture(request: Request, db: libsql_client.Client = Depends(get_db)):
    layers_res = await db.execute("SELECT * FROM architecture_layers ORDER BY layer_number")
    architecture_layers = to_dict_list(layers_res)
    for d in architecture_layers:
        d["tags"] = json.loads(d["tags"])
    return templates.TemplateResponse("architecture.html", {"request": request, "architecture_layers": architecture_layers})

@router.get("/revenue")
async def revenue(request: Request, db: libsql_client.Client = Depends(get_db)):
    revenue_res = await db.execute("SELECT * FROM revenue_streams ORDER BY id")
    revenue_streams = to_dict_list(revenue_res)
    return templates.TemplateResponse("revenue.html", {"request": request, "revenue_streams": revenue_streams})

@router.get("/content")
async def content(request: Request, db: libsql_client.Client = Depends(get_db)):
    res = await db.execute("SELECT * FROM content_model ORDER BY id")
    content_models = to_dict_list(res)
    return templates.TemplateResponse("content.html", {"request": request, "content_models": content_models})

@router.get("/content/{slug}")
async def content_detail(slug: str, request: Request, db: libsql_client.Client = Depends(get_db)):
    res = await db.execute("SELECT * FROM content_model WHERE slug = ?", (slug,))
    content_model = to_dict_list(res)
    if not content_model:
        return templates.TemplateResponse("content.html", {"request": request, "content_models": []})
    return templates.TemplateResponse("content_detail.html", {"request": request, "item": content_model[0]})

@router.get("/projects")
async def projects(request: Request, db: libsql_client.Client = Depends(get_db)):
    projects_res = await db.execute("SELECT * FROM projects ORDER BY id")
    projects = to_dict_list(projects_res)

    # Group projects by project_group
    grouped = {
        "student": [p for p in projects if p["project_group"] == "student"],
        "research": [p for p in projects if p["project_group"] == "research"],
        "industry": [p for p in projects if p["project_group"] == "industry"],
        "gallery": [p for p in projects if p["project_group"] == "gallery"],
    }

    return templates.TemplateResponse("projects.html", {"request": request, "projects": grouped})

@router.get("/projects/{slug}")
async def project_detail(slug: str, request: Request, db: libsql_client.Client = Depends(get_db)):
    res = await db.execute("SELECT * FROM projects WHERE slug = ?", (slug,))
    project = to_dict_list(res)
    if not project:
        return templates.TemplateResponse("projects.html", {"request": request, "projects": {}})
    return templates.TemplateResponse("project_detail.html", {"request": request, "item": project[0]})

@router.get("/contact")
async def contact(request: Request):
    return templates.TemplateResponse("contact.html", {"request": request})

@router.get("/agent")
async def agent(request: Request):
    return templates.TemplateResponse("agent.html", {"request": request})

@router.get("/register")
async def register(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

@router.get("/login")
async def login(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@router.get("/profile")
async def profile(request: Request):
    return templates.TemplateResponse("profile.html", {"request": request})

@router.get("/immersive-learning")
async def immersive_learning(request: Request):
    return templates.TemplateResponse("immersive_learning.html", {"request": request})

@router.get("/transformer-tour")
async def transformer_tour(request: Request):
    return templates.TemplateResponse("transformer_tour.html", {"request": request})

@router.get("/economics-tour")
async def economics_tour(request: Request):
    return templates.TemplateResponse("economics_tour.html", {"request": request})

@router.get("/ai-agents-tour")
async def ai_agents_tour(request: Request):
    return templates.TemplateResponse("ai_agents_tour.html", {"request": request})

@router.get("/terracotta-tour")
async def terracotta_tour(request: Request):
    return templates.TemplateResponse("terracotta_tour.html", {"request": request})

@router.get("/immersive-learning/test-tours")
async def test_tours(request: Request):
    return templates.TemplateResponse("test_tours.html", {"request": request})

@router.get("/economics-tour-test")
async def economics_tour_test(request: Request):
    return templates.TemplateResponse("economics_tour_test.html", {"request": request})

@router.get("/terracotta-tour-test")
async def terracotta_tour_test(request: Request):
    return templates.TemplateResponse("terracotta_tour_test.html", {"request": request})

@router.get("/computer-history-tour")
async def computer_history_tour(request: Request):
    return templates.TemplateResponse("computer_history_tour.html", {"request": request})

@router.get("/biology-galaxy")
async def biology_galaxy(request: Request):
    return templates.TemplateResponse("biology_galaxy.html", {"request": request})

@router.get("/privacy")
async def privacy(request: Request):
    return templates.TemplateResponse("privacy.html", {"request": request})

@router.get("/terms")
async def terms(request: Request):
    return templates.TemplateResponse("terms.html", {"request": request})
