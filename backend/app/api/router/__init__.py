from fastapi import APIRouter
from . import auth, users, projects, comments, reporting, tasks, role_routes, time_logs
router = APIRouter()
router.include_router(auth.router, prefix='/auth', tags=['auth'])
router.include_router(users.router, prefix='/users', tags=['users'])
router.include_router(projects.router, prefix='/projects', tags=['projects'])
router.include_router(comments.router, prefix='/comments', tags=['comments'])
router.include_router(reporting.router, prefix='/reporting', tags=['reporting'])
# Tasks as top-level
router.include_router(tasks.router, prefix='/tasks', tags=['tasks'])
router.include_router(time_logs.router)

# Tasks nested under projects (future-proof, still works)
router.include_router(
    tasks.router,
    prefix='/projects/{project_id}/tasks',
    tags=['tasks']
)
router.include_router(role_routes.router) 