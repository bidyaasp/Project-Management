from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import models, schemas
from app.db.database import get_db
from app.deps import get_current_user
from app.services.tasks_service import get_tasks_for_user


router = APIRouter()

@router.get('/me', response_model=schemas.UserOut)
def read_own_profile(current_user:models.User=Depends(get_current_user)):
    return current_user


@router.get('/', response_model=list[schemas.UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # ✅ Admin can see everyone
    if current_user.role.name.lower() == 'admin':
        return db.query(models.User).all()

    # ✅ Manager can see only developers
    if current_user.role.name.lower() == 'manager':
        return (
            db.query(models.User)
            .join(models.Role)
            .filter(models.Role.name == 'developer')
            .all()
        )

    # ❌ Developers and others cannot view users
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail='Not enough privileges'
    )


# GET user by id (admin)
@router.get('/{user_id}', response_model=schemas.UserOut)
def get_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not current_user.role or current_user.role.name == 'developer':
        raise HTTPException(status_code=403, detail='Not enough privileges')
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return user

@router.patch('/me', response_model=schemas.UserOut)
def update_own_profile(payload: schemas.UserUpdate, db: Session = Depends(get_db), 
                       current_user: models.User = Depends(get_current_user)):
    if payload.name: current_user.name = payload.name
    if payload.email: current_user.email = payload.email
    db.commit(); db.refresh(current_user)
    return current_user


# DELETE user by id (admin only)
@router.delete('/{user_id}', status_code=204)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not current_user.role or current_user.role.name != 'admin':
        raise HTTPException(status_code=403, detail='Not enough privileges')

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')

    db.delete(user)
    db.commit()
    return {"detail": "User deleted successfully"}


@router.get("/{user_id}/tasks", response_model=list[schemas.TaskDetails])
def user_tasks(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    query = get_tasks_for_user(db, user_id, current_user)
    return query.all()


@router.get("/{user_id}/assigned-tasks", response_model=list[schemas.TaskDetails])
def user_tasks(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    role = current_user.role.name.lower()
    if role == "developer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough privileges"
        )
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return db.query(models.Task).filter(models.Task.assignee_id == user_id).all()


@router.patch("/{user_id}/toggle-activation", response_model=schemas.UserOut)
def toggle_user_activation(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Toggle a user's active status (admin only).
    """
    # ✅ Only admin can toggle user status
    if not current_user.role or current_user.role.name.lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough privileges"
        )

    # 🔍 Find user
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # 🚫 Prevent admin from deactivating themselves
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot toggle your own activation status"
        )

    # 🔄 Toggle activation
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)

    return user
