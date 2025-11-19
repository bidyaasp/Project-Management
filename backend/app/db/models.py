from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum, Boolean, Table, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.database import Base
import enum

# Association table for many-to-many between projects and users
project_members = Table(
    'project_members',
    Base.metadata,
    Column('project_id', Integer, ForeignKey('projects.id', ondelete='CASCADE')),
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE'))
)

# Enum for task status
class TaskStatus(str, enum.Enum):
    todo = 'todo'
    in_progress = 'in_progress'
    in_review = "in_review"
    done = 'done'

class TaskPriority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class HistoryAction(str, enum.Enum):
    created = "created"
    updated = "updated"
    status_changed = "status_changed"
    assigned = "assigned"
    reassigned = "reassigned"
    comment_added = "comment_added"
    time_logged = "time_logged"
    ADDED = "added"
    REMOVED = "removed"

# Role model
class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)  # Admin, Manager, Developer

    users = relationship("User", back_populates="role")

# User model
class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey('roles.id'))
    is_active = Column(Boolean, default=True)
    avatar = Column(String(255), nullable=True)  # store avatar URL or path
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by_id = Column(Integer, ForeignKey('users.id'), nullable=True)  # nullable for first admin

    # ✅ Self-referencing creator relationship
    creator = relationship(
        "User",
        remote_side=[id],
        backref="created_users"   # renamed to something clearer
    )

    assigned_tasks = relationship(
        'Task', back_populates='assignee',
        foreign_keys='Task.assignee_id'
    )

    created_tasks = relationship(
        'Task', back_populates='createdBy',
        foreign_keys='Task.created_by'
    )
    role = relationship("Role", back_populates="users")
    projects = relationship('Project', secondary=project_members, back_populates='members')
    time_logs = relationship('TimeLog', back_populates='user')
    task_history = relationship('TaskHistory', back_populates='user')

# Project model
class Project(Base):
    __tablename__ = 'projects'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    is_archived = Column(Boolean, default=False)

    # Foreign Keys
    created_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)


    members = relationship('User', secondary=project_members, back_populates='projects')
    tasks = relationship('Task', back_populates='project', cascade='all, delete')
    creator = relationship('User', foreign_keys=[created_by])

    # ✅ Add this property
    @property
    def member_ids(self) -> list[int]:
        """Return a list of member IDs for this project."""
        return [member.id for member in self.members]


class ProjectHistory(Base):
    __tablename__ = "project_history"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    action = Column(String(255), nullable=False)  # FIXED
    field = Column(String(255), nullable=True)    # FIXED
    old_value = Column(String(500), nullable=True)
    new_value = Column(String(500), nullable=True)

    changes = Column(JSON, nullable=True, comment="JSON object of all changes")
    description = Column(Text, nullable=True, comment="Human readable description")
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    project = relationship("Project")


# Task model
class Task(Base):
    __tablename__ = 'tasks'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(Enum(TaskStatus), default=TaskStatus.todo)
    priority = Column(Enum(TaskPriority), nullable=True)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Time tracking fields
    estimated_hours = Column(Float, nullable=True, comment="Estimated time in hours")
    actual_hours = Column(Float, default=0.0, comment="Total logged time in hours")

    project_id = Column(Integer, ForeignKey('projects.id', ondelete='CASCADE'))
    assignee_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    created_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    project = relationship('Project', back_populates='tasks')
    assignee = relationship(
        'User', back_populates='assigned_tasks',
        foreign_keys=[assignee_id]
    )

    createdBy = relationship(
        'User', back_populates='created_tasks',
        foreign_keys=[created_by]
    )
    comments = relationship('Comment', back_populates='task', cascade='all, delete')
    time_logs = relationship('TimeLog', back_populates='task', cascade='all, delete-orphan')
    history = relationship('TaskHistory', back_populates='task', cascade='all, delete-orphan', order_by='TaskHistory.created_at.desc()')


# Time Log model
class TimeLog(Base):
    __tablename__ = 'time_logs'

    id = Column(Integer, primary_key=True, index=True)
    hours = Column(Float, nullable=False, comment="Time spent in hours")
    description = Column(Text, nullable=True, comment="What was done during this time")
    log_date = Column(DateTime(timezone=True), nullable=False, comment="Date when work was done")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Foreign Keys
    task_id = Column(Integer, ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    # Relationships
    task = relationship('Task', back_populates='time_logs')
    user = relationship('User', back_populates='time_logs')


# Task History model
class TaskHistory(Base):
    __tablename__ = 'task_history'

    id = Column(Integer, primary_key=True, index=True)
    action = Column(Enum(HistoryAction), nullable=False)
    field_name = Column(String(100), nullable=True, comment="Field that was changed")
    old_value = Column(Text, nullable=True, comment="Previous value")
    new_value = Column(Text, nullable=True, comment="New value")
    changes = Column(JSON, nullable=True, comment="JSON object of all changes")
    description = Column(Text, nullable=True, comment="Human readable description")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Foreign Keys
    task_id = Column(Integer, ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    # Relationships
    task = relationship('Task', back_populates='history')
    user = relationship('User', back_populates='task_history')


# Comment model
class Comment(Base):
    __tablename__ = 'comments'

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    task_id = Column(Integer, ForeignKey('tasks.id', ondelete='CASCADE'))
    author_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))

    task = relationship('Task', back_populates='comments')
    author = relationship('User')
