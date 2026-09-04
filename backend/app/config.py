import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "OmniSeam 3D - Universal Model Converter & Auto-Healing Engine"
    API_V1_STR: str = "/api/v1"
    VERSION: str = "1.0.20"
    
    # Storage settings
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/tmp/omniseam/uploads")
    PROCESSED_DIR: str = os.getenv("PROCESSED_DIR", "/tmp/omniseam/processed")
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "500"))
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]
    
    # Performance & Quality Defaults
    DEFAULT_LINEAR_DEFLECTION: float = 0.005  # mm
    DEFAULT_ANGULAR_DEFLECTION: float = 0.1   # rad (~5.7 deg)
    DEFAULT_SEWING_TOLERANCE: float = 0.001   # mm

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.PROCESSED_DIR, exist_ok=True)
