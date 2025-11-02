from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List

class Settings(BaseSettings):
    # 🔐 Security
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Database
    DATABASE_URL: str

    # Project
    PROJECT_NAME: str
    DEBUG: bool = True

    # Default password
    DEFAULT_USER_PASSWORD: str

    # 🌐 CORS
    ALLOWED_ORIGINS: str = ""

    @field_validator("ALLOWED_ORIGINS")
    def parse_allowed_origins(cls, v: str) -> List[str]:
        # Split comma-separated origins into a list
        return [origin.strip() for origin in v.split(",")] if v else []

    class Config:
        env_file = ".env"  # Load environment variables from .env
        env_file_encoding = "utf-8"

# Create a single settings instance
settings = Settings()
