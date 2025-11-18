from sqlalchemy.orm import Session
from app.db import models
from app.utils.task_history_utils import log_task_history

def create_time_log(db: Session, task: models.Task, user: models.User, hours: float, description: str, log_date):
    # 1️⃣ Create TimeLog entry
    time_log = models.TimeLog(
        task_id=task.id,
        user_id=user.id,
        hours=hours,
        description=description,
        log_date=log_date
    )
    db.add(time_log)

    # 2️⃣ Update task.actual_hours
    task.actual_hours = (task.actual_hours or 0) + hours
    db.add(task)

    # 3️⃣ Add history entry
    log_task_history(
        db=db,
        task=task,
        user=user,
        action=models.HistoryAction.updated,
        field_name="actual_hours",
        old_value=task.actual_hours - hours,
        new_value=task.actual_hours,
        description=f"{user.name} logged {hours}h on task '{task.title}'"
    )

    db.commit()
    db.refresh(time_log)
    return time_log
