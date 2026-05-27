from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
class PillarBase(BaseModel):
    number: str
    title: str
    summary: str = ""
    description: str
    icon: str
    color: str
class PillarResponse(PillarBase):
    id: int
class PillarCreate(PillarBase):
    pass

class VisionMissionBase(BaseModel):
    slug: str
    title: str
    summary: str
    description: str
    icon: str
    color: str

class VisionMissionResponse(VisionMissionBase):
    id: int

class VisionMissionCreate(VisionMissionBase):
    pass

class ArchitectureLayerBase(BaseModel):
    layer_number: int
    title: str
    description: str
    icon: str
    color: str
    tags: list[str]
class ArchitectureLayerResponse(ArchitectureLayerBase):
    id: int
class ArchitectureLayerCreate(ArchitectureLayerBase):
    pass
class RevenueStreamBase(BaseModel):
    title: str
    description: str
    icon: str
    color: str
class RevenueStreamResponse(RevenueStreamBase):
    id: int
class RevenueStreamCreate(RevenueStreamBase):
    pass
class ContactSubmission(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    role: str = Field("", max_length=50)
    message: str = Field(..., min_length=10, max_length=2000)
    honeypot: Optional[str] = Field(None, alias="website_url")
    captcha_token: Optional[str] = None
    captcha_answer: Optional[str] = None

    class Config:
        populate_by_name = True
class ContactResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    message: str
    created_at: str
class NewsletterSubscription(BaseModel):
    email: EmailStr
    honeypot: Optional[str] = Field(None, alias="website_url")

    class Config:
        populate_by_name = True
class NewsletterResponse(BaseModel):
    id: int
    email: str
    created_at: str
class StatsResponse(BaseModel):
    pillars_count: int
    architecture_layers_count: int
    xr_label: str
    ai_label: str
class MessageResponse(BaseModel):
    message: str
    success: bool = True

class CaptchaResponse(BaseModel):
    question: str
    captcha_token: str

class ProjectResponse(BaseModel):
    id: int
    slug: str
    title: str
    summary: str
    full_description: str
    icon: str
    category: str
    status: str
    project_group: str

class ChatRequest(BaseModel):
    message: str
    model: Optional[str] = "local"

class ChatResponse(BaseModel):
    response: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: Optional[bool] = None
    role: Optional[str] = "guest"
    avatar_url: Optional[str] = None
    preferred_language: str = "en"
    institution_id: Optional[str] = None
    department_id: Optional[str] = None
    student_id_number: Optional[str] = None
    bio: Optional[str] = None
    social_links: Optional[str] = "{}"
    xp_points: int = 0
    level: int = 1
    learning_goals: Optional[str] = "[]"
    notification_preferences: Optional[str] = '{"email": true, "push": true, "in_app": true}'
    privacy_settings: Optional[str] = '{"show_profile": true, "show_activity": true, "show_scores": true}'
    theme_preference: str = "dark"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class UserCreate(User):
    password: str

class UserInDB(User):
    hashed_password: str
