import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import UserCreateModal from "../components/UserCreateModal";
import UserAvatar from "../components/UserAvatar";

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
          <table className="min-w-full divide-y divide-gray-200 border rounded-lg text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-600 uppercase text-xs">
                  User
                </th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600 uppercase text-xs">
                  Role
                </th>
                <th className="px-4 py-2 text-left font-semibold text-gray-600 uppercase text-xs">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-100">
              {users.map((u, idx) => (
                <tr
                  key={u.id}
                  className={`hover:bg-gray-50 transition ${idx % 2 === 0 ? "bg-gray-50/20" : ""}`}
                >
                  {/* User */}
                  <td
                    className="px-4 py-2 cursor-pointer"
                    onClick={() => nav(`/users/${u.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      <UserAvatar user={u} size={28} fontSize={11} />

                      <div>
                        <p className="font-medium text-gray-900 leading-tight hover:text-blue-600">
                          {u.name}
                        </p>
                        <p className="text-xs text-gray-500 leading-tight">
                          {u.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td
                    className="px-4 py-2 text-gray-700 cursor-pointer leading-tight"
                    onClick={() => nav(`/users/${u.id}`)}
                  >
                    {u.role?.name || "-"}
                  </td>

                  {/* Status */}
                  <td
                    className="px-4 py-2 cursor-pointer leading-tight"
                    onClick={() => nav(`/users/${u.id}`)}
                  >
                    {u.is_active ? (
                      <span className="text-green-600 font-medium">Active</span>
                    ) : (
                      <span className="text-red-600 font-medium">Inactive</span>
                    )}
                  </td>
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
