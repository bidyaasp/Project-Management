from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.db import models, schemas
from app.db.database import get_db
from app.utils.time_log_utils import create_time_log
from app.deps import get_current_user

router = APIRouter(prefix="/timelogs", tags=["Time Logs"])

@router.post("/tasks/{task_id}", response_model=schemas.TimeLogOut)
def log_time(task_id: int, log_in: schemas.TimeLogCreate, 
             db: Session = Depends(get_db), 
             current_user: models.User = Depends(get_current_user)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    time_log = create_time_log(
        db=db,
        task=task,
        user=current_user,
        hours=log_in.hours,
        description=log_in.description,
        log_date=log_in.log_date
    )

    return time_log


@router.get("/tasks/{task_id}", response_model=list[schemas.TimeLogOut])
def get_task_time_logs(task_id: int, 
                       db: Session = Depends(get_db), 
                       current_user: models.User = Depends(get_current_user)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    logs = db.query(models.TimeLog).filter(models.TimeLog.task_id == task_id).order_by(models.TimeLog.log_date.desc()).all()
    return logs
