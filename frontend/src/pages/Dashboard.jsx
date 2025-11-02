import React, { useEffect, useState } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user } = useAuth()

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

  if (loading) return <div className="p-6">Loading dashboard...</div>

  // 🧩 If developer access restricted → show friendly message
  if (error === 'Access restricted to admins and managers only') {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Developer Dashboard</h1>
        <p className="text-gray-700">
          👋 Hello <b>{user?.username}</b>! You don’t have access to admin reports.
        </p>
        <p className="mt-3 text-gray-600">
          You can continue your work by:
          <br />– Viewing your assigned <b>Tasks</b>
          <br />– Checking related <b>Projects</b>
          <br />– Updating task status as you progress
        </p>
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
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Summary</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card title="Projects" value={totals.projects} />
        <Card title="Tasks" value={totals.tasks} />
        <Card title="Users" value={totals.users} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card title="Completed Tasks" value={completed_tasks} />
        <Card title="Overdue Tasks" value={overdue_tasks} />
        <Card title="Overall Progress" value={`${overall_progress_percent}%`} />
      </div>
    </div>
  )
}

function Card({ title, value }) {
  return (
    <div className="bg-white shadow-sm rounded-2xl p-5 border border-gray-200 text-center">
      <h2 className="text-gray-600 text-sm font-medium">{title}</h2>
      <p className="text-2xl font-semibold text-gray-900 mt-2">{value}</p>
    </div>
  )
}
