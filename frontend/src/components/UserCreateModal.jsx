import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function UserCreateModal({ open, onClose, onUserCreated, currentUser, roles }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role_id: "3", // default Developer
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  

  if (!open) return null;

  // ✅ Role logic
  const userRole = currentUser?.role?.name?.toLowerCase();
  const canCreateManager = userRole === "admin";
  const canCreateDeveloper = ["admin", "manager"].includes(userRole);

  // ✅ Filter roles based on permission
  const allowedRoles = roles.filter((role) => {
    const roleName = role.name.toLowerCase();
    if (canCreateManager && ["manager", "developer"].includes(roleName)) return true;
    if (canCreateDeveloper && roleName === "developer") return true;
    return false;
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (roleId) => {
    setFormData((prev) => ({ ...prev, role_id: String(roleId) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const res = await api.post("/auth/register", {
        ...formData,
        role_id: Number(formData.role_id),
      });
      setSuccess("✅ User created successfully!");
      onUserCreated(res.data);
      setTimeout(() => {
        setFormData({ name: "", email: "", password: "", role_id: "3" });
        onClose();
      }, 500);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create user");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-lg p-6 relative border border-gray-200">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
          Create New User
        </h2>

        {error && (
          <div className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 text-sm text-green-600 bg-green-50 p-2 rounded-md border border-green-200">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="name"
            placeholder="Full Name"
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
            value={formData.email}
            onChange={handleChange}
            required
          />

          {/* ✅ Role Selection (Radio Buttons) */}
          <div className="space-y-2">
            <label className="block font-semibold text-gray-700 mb-1">
              Select Role:
            </label>
            <div className="flex flex-col space-y-2">
              {allowedRoles.map((role) => (
                <label
                  key={role.id}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="role_id"
                    value={role.id}
                    checked={formData.role_id === String(role.id)}
                    onChange={() => handleRoleChange(role.id)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="capitalize">{role.name}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
          >
            Create
          </button>
        </form>
      </div>
    </div>
  );
}
