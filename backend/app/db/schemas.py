from pydantic import BaseModel, EmailStr, field_serializer, Field
from typing import Optional, List
from datetime import datetime
import enum
from app.db.models import TaskStatus, TaskPriority

# Optional: keep RoleEnum for role creation convenience
class RoleEnum(str, enum.Enum):
    admin = 'admin'
    manager = 'manager'
    developer = 'developer'

# ------------------ User Schemas ------------------
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role_id: Optional[int]  # optional when returning user info

class UserCreate(UserBase):
    password: Optional[str]
    role_id: int  # required on create
    created_by_id: Optional[int] = None  # 👈 new

class RoleOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: RoleOut     # <-- changed from str to RoleOut
    is_active: Optional[bool] = True  # optional
    created_at: Optional[datetime] = None
    creator: Optional["UserMini"] = None  # 👈 Add this (nested object)
    avatar: Optional[str] = None

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: str
    password: str

class UserMini(BaseModel):
    id: int
    name: str
    email: str
    avatar: Optional[str] = None

    class Config:
        from_attributes = True  # or from_attributes = True for Pydantic v1    

class UserTaskMember(UserMini):
    role: RoleOut
    class Config:
        from_attributes = True
        
class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class UserUpdate(BaseModel):
    name: Optional[str]
    email: Optional[EmailStr]

# ------------------ Project Schemas ------------------
class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    member_ids: Optional[List[int]] = []

class ProjectOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    created_at: datetime
    member_ids: List[int]

    class Config:
        from_attributes = True  # ✅ Pydantic v2 equivalent of orm_mode

class ProjectMember(BaseModel):
    id: int
    name: str
    email: str
    role: RoleOut
    avatar: Optional[str] = None

    class Config:
        from_attributes = True


class TaskMini(BaseModel):
    id: int
    title: str
    description: str
    status: str
    assignee: Optional[UserMini] = None  # generic user object
    due_date: Optional[datetime]
    created_at: Optional[datetime]
    createdBy: Optional[UserMini] = None
    priority: Optional[TaskPriority] = None
    estimated_hours: Optional[float] = None

    class Config:
        from_attributes = True


class ProjectDetail(ProjectOut):
    members: List[ProjectMember]
    tasks: List[TaskMini]

    class Config:
        from_attributes = True


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    member_ids: Optional[List[int]] = None


class ProjectProgress(BaseModel):
    project_id: int
    total_tasks: int
    completed_tasks: int
    completion_percent: float
    
    class Config:
        from_attributes = True  # <-- This enables from_orm in Pydantic v2

class ProjectHistoryOut(BaseModel):
    id: int
    project_id: int
    user: Optional[UserMini] = None
    action: str
    field: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    changes: Optional[dict] = None
    description: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

# ------------------ Task Schemas ------------------
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[TaskPriority] = None
    estimated_hours: Optional[float] = None

class TaskCreate(TaskBase):
    assignee_id: Optional[int] = None
    project_id: Optional[int] = None  # ✅ Add this

class TaskOut(TaskBase):
    id: int
    status: str
    actual_hours: Optional[float] = None
    project_id: int
    assignee: Optional[UserMini] = None  # generic user object
    createdBy: Optional[UserMini] = None  # generic user object
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProjectBrief(BaseModel):
    id: int
    title: str
    description: Optional[str]

    class Config:
        from_attributes = True

class TaskDetails(TaskOut):
    project: Optional[ProjectBrief]

    class Config:
        from_attributes = True

class TaskUpdate(BaseModel):
    title: Optional[str]
    description: Optional[str]
    due_date: Optional[datetime]
    priority: Optional[TaskPriority] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    assignee_id: Optional[int]

class TimeLogBase(BaseModel):
    hours: float = Field(..., gt=0, description="Time spent in hours")
    description: Optional[str] = None
    log_date: datetime

class TimeLogCreate(TimeLogBase):
    pass

class TimeLogOut(TimeLogBase):
    id: int
    user: Optional[UserMini] = None
    task_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TaskHistoryResponse(BaseModel):
    id: int
    action: str
    field_name: Optional[str] = None
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    description: Optional[str] = None
    changes: Optional[dict] = None
    created_at: datetime
    user: Optional[UserMini] = None   # user, not changed_by

    class Config:
        from_attributes = True

# ------------------ Comment Schemas ------------------
class CommentCreate(BaseModel):
    content: str
    task_id: int

class CommentOut(BaseModel):
    id: int
    content: str
    author: Optional[UserMini] = None   # ✅ nested author object
    task_id: int
    created_at: datetime
    can_delete: Optional[bool] = False

    class Config:
        from_attributes = True

# ------------------ Token Schema ------------------
class Token(BaseModel):
    access_token: str
    token_type: str = 'bearer'
