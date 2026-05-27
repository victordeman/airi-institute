from fastapi import APIRouter, Depends, Request, HTTPException, status
from fastapi.templating import Jinja2Templates
import os
from app.security import get_current_user, SECRET_KEY, ALGORITHM
from jose import jwt, JWTError
from app.models.schemas import User
from app.database import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboards"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))

def role_required(allowed_roles: list[str]):
    async def dependency(request: Request, db = Depends(get_db)):
        # Check for token in cookie or Authorization header
        token = request.cookies.get("access_token")
        auth_header = request.headers.get("Authorization")

        if not token and auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

        if not token:
            # For page loads, redirect to login if no token
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated",
                headers={"WWW-Authenticate": "Bearer"},
            )

        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if username is None:
                raise HTTPException(status_code=401, detail="Invalid token")
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")

        from app.security import get_user
        user_data = await get_user(db, username)
        if not user_data:
            raise HTTPException(status_code=401, detail="User not found")

        current_user = User(**user_data)
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this dashboard"
            )
        return current_user
    return dependency

@router.get("/admin")
async def admin_dashboard(request: Request, user: User = Depends(role_required(["super_admin"]))):
    return templates.TemplateResponse("dashboard/admin.html", {"request": request, "user": user})

@router.get("/institute")
async def institute_dashboard(request: Request, user: User = Depends(role_required(["institute_director"]))):
    return templates.TemplateResponse("dashboard/institute.html", {"request": request, "user": user})

@router.get("/faculty")
async def faculty_dashboard(request: Request, user: User = Depends(role_required(["faculty"]))):
    return templates.TemplateResponse("dashboard/faculty.html", {"request": request, "user": user})

@router.get("/research")
async def research_dashboard(request: Request, user: User = Depends(role_required(["research_assistant", "faculty"]))):
    return templates.TemplateResponse("dashboard/research.html", {"request": request, "user": user})

@router.get("/student")
async def student_dashboard(request: Request, user: User = Depends(role_required(["student"]))):
    return templates.TemplateResponse("dashboard/student.html", {"request": request, "user": user})

@router.get("/partner")
async def partner_dashboard(request: Request, user: User = Depends(role_required(["industry_partner"]))):
    return templates.TemplateResponse("dashboard/partner.html", {"request": request, "user": user})
