import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get('/reporting/summary')
        setSummary(res.data)
      } catch (err) {
        const msg = err.response?.data?.detail || 'Failed to load summary'
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [])

  // ⭐ Skeleton Loader
  if (loading) {
    return (
      <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map((x) => (
          <div key={x} className="bg-gray-200 h-28 rounded-xl shadow-sm"></div>
        ))}
      </div>
    )
  }

  // ⭐ Developer Access Restriction
  if (error === 'Access restricted to admins and managers only') {
    return (
      <div className="w-full flex justify-center mt-10">
        <div className="max-w-lg bg-white shadow-md p-6 rounded-xl border">
          <h1 className="text-xl font-bold flex items-center gap-2">
            🔒 Restricted Dashboard
          </h1>
          <p className="mt-3 text-gray-700">
            Hello <b>{user?.name}</b>! You don’t have access to admin reports.
          </p>
          <p className="mt-3 text-gray-600 leading-relaxed">
            You can continue your work by:
            <br />– Viewing your assigned <b>Tasks</b>
            <br />– Checking related <b>Projects</b>
            <br />– Updating task status
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="p-6 text-red-500 text-center">❌ {error}</div>
  }

  if (!summary) {
    return <div className="p-6 text-red-500 text-center">Failed to load summary.</div>
  }

  const { totals, completed_tasks, overdue_tasks, overall_progress_percent } = summary

  return (
    <div className="p-6 space-y-8">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📊 Dashboard Overview</h1>

        <p className="text-gray-500 text-sm">
          Last updated: {new Date().toLocaleString()}
        </p>
      </div>

      {/* MAIN STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card
          title="Projects"
          value={totals.projects}
          icon="📁"
          onClick={() => navigate('/projects')}
        />

        <Card
          title="Tasks"
          value={totals.tasks}
          icon="📝"
          onClick={() => navigate('/tasks')}
        />

        <Card
          title="Users"
          value={totals.users}
          icon="👥"
          onClick={() => navigate('/users')}
        />
      </div>

      {/* TASK METRICS */}
      <h2 className="text-lg font-semibold mt-4">Task Summary</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card
          title="Completed Tasks"
          value={completed_tasks}
          icon="✅"
        />

        <Card
          title="Overdue Tasks"
          value={overdue_tasks}
          icon="⚠️"
        />

        <ProgressCard
          title="Overall Progress"
          percent={overall_progress_percent}
          icon="📈"
        />
      </div>
    </div>
  )
}

/* ------------------------------
   ⭐ Pretty Card Component (Clickable)
--------------------------------*/
function Card({ title, value, icon, onClick }) {
  const clickable = typeof onClick === 'function'

  return (
    <div
      onClick={onClick}
      className={`bg-white shadow-sm rounded-2xl p-5 border border-gray-200 
        flex items-center gap-4 transition-all
        ${clickable ? 'cursor-pointer hover:shadow-md hover:-translate-y-1' : ''}`}
    >
      <div className="text-3xl">{icon}</div>

      <div>
        <h2 className="text-gray-600 text-sm font-medium">{title}</h2>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

/* ------------------------------
   ⭐ Card With Progress Bar
--------------------------------*/
function ProgressCard({ title, percent, icon }) {
  return (
    <div className="bg-white shadow-sm rounded-2xl p-5 border border-gray-200">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">{icon}</span>
        <div>
          <h2 className="text-gray-600 text-sm font-medium">{title}</h2>
          <p className="text-xl font-semibold text-gray-900">{percent}%</p>
        </div>
      </div>

      <div className="w-full bg-gray-200 h-3 rounded-lg mt-2">
        <div
          className="bg-green-500 h-3 rounded-lg"
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  )
}
