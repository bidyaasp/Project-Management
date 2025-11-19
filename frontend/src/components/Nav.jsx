import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import UserAvatar from "../components/UserAvatar";

export default function Nav() {
  const { user, logout } = useAuth()
  const nav = useNavigate()

  const isAdmin = user?.role?.name?.toLowerCase() === 'admin'
  const isManager = user?.role?.name?.toLowerCase() === 'manager'

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto flex justify-between items-center py-4 px-6">

        {/* Left section */}
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="font-bold text-blue-700 text-lg hover:text-blue-900"
          >
            Project Management
          </Link>

          {user && (
            <>
              <Link
                to="/projects"
                className="text-gray-700 hover:text-blue-600 font-medium"
              >
                Projects
              </Link>

              {isAdmin && (
                <Link
                  to="/users"
                  className="text-gray-700 hover:text-blue-600 font-medium"
                >
                  Users
                </Link>
              )}

              {isManager && (
                <Link
                  to="/users"
                  className="text-gray-700 hover:text-blue-600 font-medium"
                >
                  Developers
                </Link>
              )}

              <Link
                to="/tasks"
                className="text-gray-700 hover:text-blue-600 font-medium"
              >
                Tasks
              </Link>

              <Link
                to="/profile"
                className="text-gray-700 hover:text-blue-600 font-medium"
              >
                My Profile
              </Link>
            </>
          )}
        </div>

        {/* Right section */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-4">

              <UserAvatar user={user} size={36} />

              {/* Welcome Text */}
              <span className="text-gray-800 flex items-center gap-2">
                Welcome, <strong>{user.name}</strong>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    isAdmin
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : 'bg-green-100 text-green-700 border border-green-300'
                  }`}
                >
                  {user.role?.name}
                </span>
              </span>

              {/* Logout */}
              <button
                onClick={() => {
                  logout()
                  nav('/login')
                }}
                className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600 transition"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
