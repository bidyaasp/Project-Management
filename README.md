# 🗂️ Project Management Tool

A full-stack **Project Management App** built with **FastAPI (backend)** and **React + Vite (frontend)**.  
Manage projects, assign tasks, and control user access with secure JWT authentication.

---

## 🚀 Tech Stack
- **Frontend:** React, Vite, TailwindCSS, Axios, React Router  
- **Backend:** FastAPI, SQLAlchemy, MySQL, Pydantic, JWT  

---

## ⚙️ Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

###Frontend
cd frontend
npm install
npm run dev

🌐 Local URLs
Frontend → http://localhost:5173
Backend → http://localhost:8000
