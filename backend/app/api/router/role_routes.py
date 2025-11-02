# app/routes/role_routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import models, schemas, database
from typing import List
from app.deps import get_current_user

router = APIRouter(prefix="/roles", tags=["Roles"])

@router.get("/", response_model=List[schemas.RoleOut])
def get_all_roles(db: Session = Depends(database.get_db),
                  current_user: models.User = Depends(get_current_user)):
    
    if current_user.role.name.lower() == 'developer':        
        raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail='Not enough privileges'
    )

    """
    Get all available roles (admin, manager, developer)
    """
    roles = db.query(models.Role).all()
    return roles
