from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from app.db import models, schemas
from app.db.database import get_db
from app.deps import get_current_user
from typing import List
from app.utils.project_history_utils import log_project_history, detect_project_changes

router = APIRouter()

# ---------------------------
# CREATE PROJECT
# ---------------------------
@router.post('/', response_model=schemas.ProjectOut)
def create_project(
    project_in: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # --- Permission check ---
    if current_user.role.name not in ('admin', 'manager'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Not permitted')

    # --- Create project object ---
    project = models.Project(
        title=project_in.title,
        description=project_in.description
    )

    # --- Gather members if provided ---
    members = []
    if project_in.member_ids:
        members = db.query(models.User).filter(models.User.id.in_(project_in.member_ids)).all()

        if len(members) != len(set(project_in.member_ids)):
            existing_ids = [m.id for m in members]
            invalid_ids = list(set(project_in.member_ids) - set(existing_ids))
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid member IDs: {invalid_ids}"
            )

    # --- If manager creates the project, auto-add them as a member ---
    if current_user.role.name == 'manager':
        if current_user not in members:
            members.append(current_user)

    # --- Assign members ---
    project.members = members

    # --- Save ---
    db.add(project)
    db.commit()
    db.refresh(project)

    # Log project creation
    log_project_history(
        db=db,
        project=project,
        user=current_user,
        action="created",
        field=None,
        new_value=f"Project '{project.title}' created"
    )

    return project


# ---------------------------
# LIST ALL PROJECTS
# ---------------------------
@router.get('/', response_model=List[schemas.ProjectOut])
def list_projects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # ✅ Admins see all projects
    if current_user.role.name == "admin":
        return db.query(models.Project).all()

    # ✅ Managers & Developers see only projects where they are members
    member_projects = (
        db.query(models.Project)
        .join(models.Project.members)  # join the association table
        .filter(models.User.id == current_user.id)
        .all()
    )

    return member_projects

# ---------------------------
# GET PROJECTS PROGRESS
# ---------------------------
@router.get("/progress", response_model=List[schemas.ProjectProgress])
@router.get("/progress/", response_model=List[schemas.ProjectProgress])
def get_project_progress(db: Session = Depends(get_db)):
    result = (
        db.query(
            models.Task.project_id,
            func.count(models.Task.id).label("total"),
            func.sum(case((models.Task.status == 'done', 1), else_=0)).label("completed")
        )
        .group_by(models.Task.project_id)
        .all()
    )

    progress_list = []
    for proj_id, total, completed in result:
        total = int(total or 0)
        completed = int(completed or 0)
        completion_percent = (completed / total * 100) if total > 0 else 0.0
        progress_list.append(
            schemas.ProjectProgress(
                project_id=int(proj_id),
                total_tasks=total,
                completed_tasks=completed,
                completion_percent=completion_percent
            )
        )

    return progress_list

# ---------------------------
# GET SINGLE PROJECT PROGRESS
# ---------------------------
@router.get("/{project_id}/progress", response_model=schemas.ProjectProgress)
def get_single_project_progress(project_id: int, db: Session = Depends(get_db)):
    total_tasks = (
        db.query(func.count(models.Task.id))
        .filter(models.Task.project_id == project_id)
        .scalar()
    )

    completed_tasks = (
        db.query(func.count(models.Task.id))
        .filter(models.Task.project_id == project_id, models.Task.status == "done")
        .scalar()
    )

    completion_percent = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0

    return schemas.ProjectProgress(
        project_id=project_id,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        completion_percent=completion_percent,
    )

# ---------------------------
# GET USER PROJECTS
# ---------------------------
@router.get("/user", response_model=List[schemas.ProjectOut])
@router.get("/user/", response_model=List[schemas.ProjectOut])
def get_user_projects(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    member_projects = (
        db.query(models.Project)
        .join(models.Project.members)
        .filter(models.User.id == current_user.id)
        .all()
    )

    task_projects = (
        db.query(models.Project)
        .join(models.Task)
        .filter(models.Task.assignee_id == current_user.id)
        .all()
    )

    # Combine and remove duplicates
    project_dict = {p.id: p for p in member_projects + task_projects}
    return list(project_dict.values())


# ---------------------------
# GET SINGLE PROJECT
# ---------------------------
@router.get('/{project_id}', response_model=schemas.ProjectDetail)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = (
        db.query(models.Project)
        .filter(models.Project.id == project_id)
        .first()
    )

    if not project:
        raise HTTPException(status_code=404, detail='Project not found')

    if current_user.role.name not in ('admin', 'manager'):
        # Restrict if user not member or assignee
        if not any(m.id == current_user.id for m in project.members) and \
           not any(t.assignee_id == current_user.id for t in project.tasks):
            raise HTTPException(status_code=403, detail='Not permitted')

    # Ensure relationships are loaded
    _ = project.members
    _ = project.tasks

    return project


# ---------------------------
# UPDATE PROJECT
# ---------------------------
@router.put("/{project_id}", response_model=schemas.ProjectOut)
def update_project(
    project_id: int,
    project_in: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Keep a snapshot of old values
    old_data = {
        "title": project.title,
        "description": project.description,
        "member_ids": [m.id for m in project.members]
    }

    # Track if any changes were made
    is_changed = False

    # --- TITLE UPDATE ---
    if project_in.title is not None and project_in.title != project.title:
        db.add(models.ProjectHistory(
            project_id=project.id,
            user_id=current_user.id,
            action="field_update",
            field="title",
            old_value=project.title,
            new_value=project_in.title,
            changes={"from": project.title, "to": project_in.title}
        ))
        project.title = project_in.title
        is_changed = True

    # --- DESCRIPTION UPDATE ---
    if project_in.description is not None and project_in.description != project.description:
        db.add(models.ProjectHistory(
            project_id=project.id,
            user_id=current_user.id,
            action="field_update",
            field="description",
            old_value=project.description,
            new_value=project_in.description,
            changes={"from": project.description, "to": project_in.description}
        ))
        project.description = project_in.description
        is_changed = True

    # --- MEMBERS UPDATE ---
    if project_in.member_ids is not None:
        # Validate
        members = db.query(models.User).filter(models.User.id.in_(project_in.member_ids)).all()
        if len(members) != len(set(project_in.member_ids)):
            existing_ids = [m.id for m in members]
            invalid_ids = list(set(project_in.member_ids) - set(existing_ids))
            raise HTTPException(
                status_code=400,
                detail=f"Invalid member IDs: {invalid_ids}"
            )

        old_member_ids = set(old_data["member_ids"])
        new_member_ids = set(project_in.member_ids)

        # Detect changes
        removed_member_ids = list(old_member_ids - new_member_ids)
        added_member_ids = list(new_member_ids - old_member_ids)

        # Log removed members (ONE entry)
        if removed_member_ids:
            removed_users = db.query(models.User).filter(
                models.User.id.in_(removed_member_ids)
            ).all()

            db.add(models.ProjectHistory(
                project_id=project.id,
                user_id=current_user.id,
                action="members_removed",
                field="members",
                old_value=[u.id for u in removed_users],
                new_value=None,
                changes={"removed": [u.id for u in removed_users]},
            ))
            is_changed = True

        # Log added members (ONE entry)
        if added_member_ids:
            added_users = db.query(models.User).filter(
                models.User.id.in_(added_member_ids)
            ).all()

            db.add(models.ProjectHistory(
                project_id=project.id,
                user_id=current_user.id,
                action="members_added",
                field="members",
                old_value=None,
                new_value=[u.id for u in added_users],
                changes={"added": [u.id for u in added_users]},
            ))
            is_changed = True

        # Finally update the members field
        project.members = members

    if not is_changed:
        return project  # Nothing changed → no need to commit

    db.commit()
    db.refresh(project)

    return project


# ---------------------------
# DELETE PROJECT
# ---------------------------
@router.delete('/{project_id}')
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role.name != 'admin':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Only admin can delete projects')

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Project not found')

    db.delete(project)
    db.commit()
    return {'ok': True}

# ---------------------------
# TOGGLE PROJECT ARCHIVE
# ---------------------------
@router.put('/{project_id}/archive', response_model=schemas.ProjectOut)
def toggle_archive_project(project_id:int, archive:bool, db:Session=Depends(get_db), current_user:models.User=Depends(get_current_user)):
    if current_user.role.name not in ('admin','manager'):
        raise HTTPException(403, 'Not permitted')
    project = db.query(models.Project).filter_by(id=project_id).first()
    if not project: raise HTTPException(404, 'Project not found')

    old_value = project.is_archived
    project.is_archived = archive

    db.commit()
    db.refresh(project)

    log_project_history(
        db=db,
        project=project,
        user=current_user,
        action="archive_toggled",
        field="is_archived",
        old_value=old_value,
        new_value=archive,
    )

    return project


# ─────────────────────────────
#  Add members to a project
# ─────────────────────────────
@router.post("/{project_id}/add_members")
def add_members(
    project_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role.name not in ("admin", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough privileges"
        )

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    member_ids = data.get("member_ids", [])
    if not isinstance(member_ids, list):
        raise HTTPException(status_code=400, detail="member_ids must be a list")

    members = db.query(models.User).filter(models.User.id.in_(member_ids)).all()
    if not members:
        raise HTTPException(status_code=400, detail="No valid members found")

    # Determine new members to add
    existing_ids = {m.id for m in project.members}
    new_members = [m for m in members if m.id not in existing_ids]

    # Add them
    for m in new_members:
        project.members.append(m)

        # ─────────────────────────────
    #  Log Project History
    # ─────────────────────────────
    if new_members:
        log_project_history(
            db=db,
            project=project,
            user=current_user,
            action=models.HistoryAction.ADDED,
            field="members",
            old_value=None,
            new_value=", ".join([m.name for m in new_members]),  # <-- convert list to string
            description=f"{current_user.name} added members: {', '.join([m.name for m in new_members])}"
        )

    db.commit()
    db.refresh(project)
    return {"ok": True, "message": "Members added", "members": [m.id for m in project.members]}


# ─────────────────────────────
#  Get All members of a project
# ─────────────────────────────
@router.get("/{project_id}/members", response_model=list[schemas.UserTaskMember])
def get_project_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role.name not in ("admin", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough privileges"
        )

    # Fetch project
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # --- Access Control ---
    if current_user.role.name not in ("admin", "manager", "developer"):
        raise HTTPException(status_code=403, detail="Access denied")

    # Managers and developers can only view projects they are members of
    if current_user.role.name != "admin" and current_user not in project.members:
        raise HTTPException(status_code=403, detail="You are not a member of this project")

    # --- Return members ---
    return project.members


# ─────────────────────────────
#  Delete members from a project
# ─────────────────────────────
@router.post("/{project_id}/remove_members")
def remove_members(
    project_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role.name not in ("admin", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough privileges"
        )

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    member_ids = data.get("member_ids", [])
    if not isinstance(member_ids, list):
        raise HTTPException(status_code=400, detail="member_ids must be a list")

    # Fetch users to remove
    members_to_remove = db.query(models.User).filter(models.User.id.in_(member_ids)).all()

    removed_members = []

    for m in members_to_remove:
        if m in project.members:
            project.members.remove(m)
            removed_members.append(m)

    db.commit()
    db.refresh(project)

    # ------------------------------
    # LOGGING WITH MEMBER NAMES
    # ------------------------------
    if removed_members:
        removed_names = [m.name for m in removed_members]

        log_project_history(
            db=db,
            project=project,
            user=current_user,
            action=models.HistoryAction.REMOVED,
            field="members",
            old_value=None,
            new_value=", ".join(removed_names),  # <-- serialize list to comma-separated string
        )

    return {
        "ok": True,
        "message": "Members removed",
        "members": [m.id for m in project.members]
    }


@router.get("/{project_id}/history", response_model=List[schemas.ProjectHistoryOut])
def get_project_history(project_id: int, db: Session = Depends(get_db)):
    logs = (
        db.query(models.ProjectHistory)
        .filter(models.ProjectHistory.project_id == project_id)
        .order_by(models.ProjectHistory.timestamp.desc())
        .all()
    )
    return logs
