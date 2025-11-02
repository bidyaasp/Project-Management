from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.db import models, schemas
from app.db.database import get_db
from app.db.models import User, Role
from passlib.context import CryptContext
from app.security.jwt import create_access_token
from app.db.schemas import UserCreate, Token, UserOut, UserLogin  # make sure Token schema exists
from app.deps import get_current_user
from app.core.config import settings

router = APIRouter()

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Utility functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# Register user endpoint
@router.post("/register", response_model=UserOut)
def register_user(user_in: UserCreate, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    # 1. Check if email already exists
    existing_user = db.query(User).filter(
        (User.email == user_in.email)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="email already registered"
        )
    
    # 2. Get role from role_id
    role = db.query(Role).filter(Role.id == user_in.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role_id"
        )
    
    # Use password from request if provided, otherwise use default
    raw_password = user_in.password or settings.DEFAULT_USER_PASSWORD
    
    # 3. Create the new user
    new_user = User(
        name=user_in.name,
        email=user_in.email,
        hashed_password=hash_password(raw_password),
        role=role,
        creator=current_user
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # 4. Return user info
    return UserOut(
        id=new_user.id,
        name=new_user.name,
        email=new_user.email,
        role={"id": new_user.role.id, "name": new_user.role.name},  # ✅ FIXED
        is_active=new_user.is_active
    )

# Login endpoint
@router.post("/token", response_model=Token)
def login_for_access_token(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your account is inactive. Please contact the administrator."
        )

    # Get role name from Role relationship
    role_name = user.role.name if user.role else None

    token_data = {"user_id": user.id, "email": user.email, "role": role_name}
    token = create_access_token(token_data)

    return {"access_token": token, "token_type": "bearer"}


# ✅ Endpoint: Change Password
@router.put("/change-password")
async def change_password(payload: schemas.ChangePasswordRequest, 
                          db: Session = Depends(get_db),
                          current_user: User = Depends(get_current_user)):
    user = db.query(models.User).filter(models.User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # verify old password
    if not verify_password(payload.old_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Old password is incorrect"
        )

    # update new password
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}
