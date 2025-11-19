from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from app.db import models


def log_project_history(
    db: Session,
    project: models.Project,
    user: models.User,
    action: str,
    field: str = None,
    old_value: Any = None,
    new_value: Any = None,
    description: str = None  # <-- add this
):
    history = models.ProjectHistory(
        project_id=project.id,
        user_id=user.id,
        action=action,
        field=field,
        old_value=old_value,
        new_value=new_value,
        description=description
    )
    db.add(history)
    db.commit()


def detect_project_changes(project: models.Project, data: dict):
    """
    Compares incoming update payload with existing project values.
    Returns only changed fields.
    """
    changes = {}

    for field, new_value in data.items():
        if hasattr(project, field):
            old_value = getattr(project, field)
            if str(old_value) != str(new_value):
                changes[field] = [str(old_value), str(new_value)]

    return changes
