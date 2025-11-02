import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import UserCreateModal from "../components/UserCreateModal";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();
  const nav = useNavigate();
  const [roles, setRoles] = useState([]);

  const isAdmin = user?.role?.name?.toLowerCase() === "admin";
  const isManager = user?.role?.name?.toLowerCase() === "manager";

  useEffect(() => {
    api.get("/users/").then((r) => setUsers(r.data)).catch(console.error);
    api.get("/roles/").then((r) => setRoles(r.data)).catch(console.error);  // fetch roles here
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch {
      alert("Failed to delete user.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto mt-10 bg-white p-6 rounded-2xl shadow">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">👥 Users</h1>

        {(isAdmin || isManager) && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm shadow-sm"
          >
            ➕ Add User
          </button>
        )}
      </div>

      {users.length === 0 ? (
        <p className="text-gray-500 text-center">No users found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Status
                </th>                
                {(isAdmin) && (
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {users.map((u, idx) => (
                <tr
                  key={u.id}
                  className={`hover:bg-gray-50 transition ${
                    idx % 2 === 0 ? "bg-gray-50/30" : ""
                  }`}
                >
                  <td
                    className="px-6 py-4 text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                    onClick={() => nav(`/users/${u.id}`)}
                  >
                    {u.name}
                  </td>
                  <td
                    className="px-6 py-4 text-sm text-gray-700 cursor-pointer"
                    onClick={() => nav(`/users/${u.id}`)}
                  >
                    {u.email}
                  </td>
                  <td
                    className="px-6 py-4 text-sm text-gray-600 italic cursor-pointer"
                    onClick={() => nav(`/users/${u.id}`)}
                  >
                    {u.role?.name || "-"}
                  </td>
                  <td
                    className="px-6 py-4 text-sm text-gray-600 italic cursor-pointer"
                    onClick={() => nav(`/users/${u.id}`)}
                  >
                    {u.is_active ? (
                      <span className="text-green-600 font-medium">Active</span>
                    ) : (
                      <span className="text-red-600 font-medium">Inactive</span>
                    )}
                  </td>                  
                  {(isAdmin) && u.id !== user.id && (
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="bg-red-500 text-white px-3 py-1.5 text-sm rounded-md hover:bg-red-600 shadow-sm transition"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ✅ Modal */}
      <UserCreateModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onUserCreated={(newUser) => setUsers((p) => [...p, newUser])}
        currentUser={user}
        roles={roles}
      />
    </div>
  );
}
