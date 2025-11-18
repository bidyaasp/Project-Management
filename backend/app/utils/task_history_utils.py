from sqlalchemy.orm import Session
from app.db import models
from typing import Optional, Dict

def log_task_history(
    db: Session,
    task: models.Task,
    user: Optional[models.User],
    action: models.HistoryAction,
    field_name: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    changes: Optional[Dict] = None,
    description: Optional[str] = None,
):
    """
    Creates a TaskHistory record for any change on a task.
    """

    history_entry = models.TaskHistory(
        task_id=task.id,
        user_id=user.id if user else None,
        action=action,
        field_name=field_name,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        changes=changes,
        description=description,
    )

    db.add(history_entry)
    db.commit()
    db.refresh(history_entry)
    return history_entry


def detect_task_changes(task, update_data: dict):
    """
    Compare existing task values with updated data and return a dict of changed fields.
    Example: {"title": ["Old Title", "New Title"], "due_date": ["2024-11-10", "2024-11-20"]}
    """
    changes = {}
    for field, new_value in update_data.items():
        if hasattr(task, field):
            old_value = getattr(task, field)
            # Convert datetimes and others to strings for consistent comparison
            if str(old_value) != str(new_value):
                changes[field] = [str(old_value), str(new_value)]
    return changes
