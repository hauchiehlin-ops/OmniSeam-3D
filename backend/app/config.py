import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "OmniSeam 3D - Universal Model Converter & Auto-Healing Engine"
    API_V1_STR: str = "/api/v1"
    VERSION: str = "4.6.0"
    
    # Storage & Fair Usage Guardrails
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/tmp/omniseam/uploads")
    PROCESSED_DIR: str = os.getenv("PROCESSED_DIR", "/tmp/omniseam/processed")
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "500"))
    PUBLIC_NODE_MAX_FILE_SIZE_MB: int = int(os.getenv("PUBLIC_NODE_MAX_FILE_SIZE_MB", "25"))
    IS_PUBLIC_DEMO_NODE: bool = os.getenv("IS_PUBLIC_DEMO_NODE", "false").lower() in ["true", "1", "yes"]
    MAX_CONCURRENT_CONVERSIONS: int = int(os.getenv("MAX_CONCURRENT_CONVERSIONS", "2" if os.getenv("IS_PUBLIC_DEMO_NODE", "false").lower() in ["true", "1", "yes"] else "4"))

    
    # CORS: explicit allow-list. The app's Capacitor WebView origins (iOS:
    # capacitor://localhost; Android: https://localhost) and the Vite dev
    # server. Extra origins: comma-separated env var.
    ALLOWED_ORIGINS: List[str] = [
        "capacitor://localhost",
        "ionic://localhost",
        "https://localhost",
        "http://localhost",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    EXTRA_ALLOWED_ORIGINS: str = os.getenv("EXTRA_ALLOWED_ORIGINS", "")
    # Optional regex for extra origins (e.g. preview deployments); empty = off.
    CORS_ORIGIN_REGEX: str = os.getenv("CORS_ORIGIN_REGEX", "")

    # Abuse protection & data retention
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "20"))
    FILE_TTL_MINUTES: int = int(os.getenv("FILE_TTL_MINUTES", "60"))
    CLEANUP_INTERVAL_SECONDS: int = int(os.getenv("CLEANUP_INTERVAL_SECONDS", "300"))
    TASK_TIMEOUT_SECONDS: int = int(os.getenv("TASK_TIMEOUT_SECONDS", "300"))

    @property
    def cors_origins(self) -> List[str]:
        extra = [o.strip() for o in self.EXTRA_ALLOWED_ORIGINS.split(",") if o.strip()]
        return list(dict.fromkeys(self.ALLOWED_ORIGINS + extra))

    # Performance & Quality Defaults
    DEFAULT_LINEAR_DEFLECTION: float = 0.005  # mm
    DEFAULT_ANGULAR_DEFLECTION: float = 0.1   # rad (~5.7 deg)
    DEFAULT_SEWING_TOLERANCE: float = 0.001   # mm

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.PROCESSED_DIR, exist_ok=True)
