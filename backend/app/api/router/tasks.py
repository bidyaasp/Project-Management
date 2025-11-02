from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.orm import Session
from app.db import models, schemas
from app.db.database import get_db
from app.deps import get_current_user
from datetime import datetime
from typing import Optional

router = APIRouter()

# -----------------------------
# Helper to fetch project (if project_id is given)
# -----------------------------
def get_project(db: Session, project_id: Optional[int] = None):
    if project_id is None:
        return None
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

# -----------------------------
# Create Task
# -----------------------------
@router.post("/", response_model=schemas.TaskOut)
def create_task(
    task_in: schemas.TaskCreate,
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if not current_user.role or current_user.role.name not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Not permitted")

    project = get_project(db, project_id or task_in.project_id)

    task = models.Task(
        title=task_in.title,
        description=task_in.description,
        due_date=task_in.due_date,
        project=project
    )

    if task_in.assignee_id:
        assignee = db.query(models.User).filter(models.User.id == task_in.assignee_id).first()
        if not assignee:
            raise HTTPException(status_code=404, detail="Assignee not found")
        if assignee not in project.members:
            raise HTTPException(status_code=400, detail="Assignee must be a member of the project")
        task.assignee = assignee

    task.createdBy = current_user

    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.get("/{task_id}", response_model=schemas.TaskDetails)
def get_task(
    task_id: int = Path(..., description="The ID of the task"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    # Admin can always access
    if current_user.role.name == 'admin':
        return task

    # Check if user is the assignee
    if task.assignee_id == current_user.id:
        return task

    # Check if user is member of the project
    project = db.query(models.Project).filter(models.Project.id == task.project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    # Assuming project.members is list of User objects
    project_member_ids = [member.id for member in project.members]

    if current_user.id in project_member_ids:
        return task

    # Otherwise forbid access
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted")

# -----------------------------
# List Tasks (all or by project)
# -----------------------------
@router.get("/")
def list_tasks(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Task)
    if project_id:
        query = query.filter(models.Task.project_id == project_id)
    
    # Developers see only their tasks
    if current_user.role.name == 'developer':
        query = query.filter(models.Task.assignee_id == current_user.id)
    
    return query.all()

# -----------------------------
# Update Task
# -----------------------------
@router.put("/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: int,
    task_in: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if current_user.role.name not in ('admin', 'manager'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted")

    for field in ["title", "description", "due_date", "assignee_id"]:
        value = getattr(task_in, field, None)
        if value is not None:
            if field == "assignee_id":
                assignee = db.query(models.User).filter(models.User.id == value).first()
                if assignee:
                    task.assignee = assignee
            else:
                setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task

# -----------------------------
# Update Task Status
# -----------------------------
@router.put("/{task_id}/status")
def update_task_status(
    task_id: int,
    status_in: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail='Task not found')

    if current_user.role.name == 'developer' and task.assignee_id != current_user.id:
        raise HTTPException(status_code=403, detail='Not permitted')

    new_status = status_in.get('status')
    if new_status not in ('todo', 'in_progress', 'done'):
        raise HTTPException(status_code=400, detail='Invalid status')

    task.status = new_status
    db.commit()
    db.refresh(task)
    return {"ok": True, "status": task.status}

# -----------------------------
# Update Task Deadline
# -----------------------------
@router.put("/{task_id}/deadline")
def update_task_deadline(
    task_id: int,
    new_deadline: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if current_user.role.name not in ("admin", "manager") and task.assignee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not permitted")

    due_date = new_deadline.get("due_date")
    if not due_date:
        raise HTTPException(status_code=400, detail="Missing due_date")

    task.due_date = due_date
    db.commit()
    db.refresh(task)
    return {"ok": True, "task_id": task.id, "due_date": task.due_date}

# -----------------------------
# Delete Task
# -----------------------------
@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if current_user.role.name not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Not permitted")

    db.delete(task)
    db.commit()
    return {"ok": True, "message": "Task deleted successfully"}
