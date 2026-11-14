from fastapi import APIRouter
from backend.app.api.v1.health import router as health_router
from backend.app.api.v1.convert import router as convert_router
from backend.app.api.v1.inspect import router as inspect_router
from backend.app.api.v1.tasks import router as tasks_router
from backend.app.api.v1.wind_tunnel import router as wind_tunnel_router

api_v1_router = APIRouter()

api_v1_router.include_router(health_router, tags=["Health"])
api_v1_router.include_router(inspect_router, tags=["Inspect"])
api_v1_router.include_router(convert_router, tags=["Convert"])
api_v1_router.include_router(tasks_router, tags=["Tasks"])
api_v1_router.include_router(wind_tunnel_router, prefix="/wind-tunnel", tags=["WindTunnel"])

