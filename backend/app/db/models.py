from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum, Boolean, Table
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
    done = 'done'

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

# Project model
class Project(Base):
    __tablename__ = 'projects'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_archived = Column(Boolean, default=False)

    members = relationship('User', secondary=project_members, back_populates='projects')
    tasks = relationship('Task', back_populates='project', cascade='all, delete')

    # ✅ Add this property
    @property
    def member_ids(self) -> list[int]:
        """Return a list of member IDs for this project."""
        return [member.id for member in self.members]

# Task model
class Task(Base):
    __tablename__ = 'tasks'

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(Enum(TaskStatus), default=TaskStatus.todo)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

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
