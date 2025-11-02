from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.db import models

def get_tasks_for_user(
    db: Session, target_user_id: int, current_user: models.User
):
    """
    Returns a SQLAlchemy query for tasks assigned to target_user_id,
    filtered according to the current_user's role and project membership.
    """
    target_user = db.query(models.User).filter(models.User.id == target_user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    role = current_user.role.name.lower()

    # 🔹 Admin: can view all tasks for any user
    if role == "admin":
        return db.query(models.Task)

    # 🔹 Developer: can only view their own tasks
    elif role == "developer":
        if current_user.id != target_user_id:
            raise HTTPException(status_code=403, detail="Not permitted")
        return db.query(models.Task).filter(models.Task.assignee_id == target_user_id)

    # 🔹 Manager: can view
    #   - their own tasks
    #   - tasks of developers who are in the same project(s)
    elif role == "manager":
        # Step 1: find all project IDs where the manager is a member
        manager_project_ids = [
            p.id for p in current_user.projects
        ]

        if not manager_project_ids:
            raise HTTPException(status_code=403, detail="Manager has no projects")

        # Step 2: allow tasks if:
        #   - assignee is the manager themselves
        #   - OR assignee is a developer in one of manager's projects
        return (
            db.query(models.Task)
            .join(models.Project, models.Task.project_id == models.Project.id)
            .join(models.User, models.Task.assignee_id == models.User.id)
            .filter(
                (models.Task.assignee_id == current_user.id) |
                (
                    (models.Project.id.in_(manager_project_ids)) &
                    (models.User.role.has(name="developer"))
                )
            )
            .distinct()
        )

    else:
        raise HTTPException(status_code=403, detail="Not permitted")
