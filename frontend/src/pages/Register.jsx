import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role_id: '3', // default to Developer
  })

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      await axios.post('http://localhost:8000/api/auth/register', {
        ...formData,
        role_id: Number(formData.role_id),
      })
      setSuccess('🎉 Registration successful! Redirecting to login...')
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.')
    }
  }

  return (
    <div className="flex justify-center items-start bg-gray-50 min-h-screen py-10">
      <div className="w-full max-w-md bg-white px-8 py-6 rounded-2xl shadow-lg border border-gray-200 self-start mt-10">
        <h2 className="text-2xl font-bold text-center text-blue-700 mb-6">Register</h2>

        {/* ✅ Inline Message Boxes */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm animate-fade-in">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="username"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            required
          />
          <input
            name="email"
            type="email"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            name="password"
            type="password"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <select
            name="role_id"
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400 outline-none"
            value={formData.role_id}
            onChange={handleChange}
          >
            <option value="1">Admin</option>
            <option value="2">Manager</option>
            <option value="3">Developer</option>
          </select>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
          >
            Register
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            Login here
          </Link>
        </p>
      </div>
    </div>
  )
}
