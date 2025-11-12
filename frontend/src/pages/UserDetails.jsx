import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function UserDetails() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const isAdmin = currentUser?.role?.name?.toLowerCase() === "admin";

  // 🧩 Fetch user details
  const fetchUser = async () => {
    try {
      const res = await api.get(`/users/${id}`);
      setUser(res.data);
    } catch (err) {
      console.error("Failed to load user:", err);
    }
  };

  // 🧩 Fetch assigned tasks
  const fetchAssignedTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await api.get(`/users/${id}/assigned-tasks`);
      setTasks(res.data);
    } catch (err) {
      console.error("Failed to load assigned tasks:", err);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchAssignedTasks();
  }, [id]);

  const toggleActivation = async () => {
    if (
      !window.confirm(
        "Are you sure you want to toggle this user's activation status?"
      )
    )
      return;
    setLoading(true);
    try {
      const res = await api.patch(`/users/${id}/toggle-activation`);
      setUser(res.data);
    } catch (err) {
      console.error("Failed to toggle activation:", err);
      alert(err.response?.data?.detail || "Failed to toggle activation.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="mt-10">
      {/* 🔙 Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-blue-600 hover:underline mb-6 text-sm font-medium"
      >
        ← Back to Users
      </button>

      {/* 🧾 User Card */}
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-xl mx-auto border border-gray-200">
        <h1 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-3">
          {user.name}
        </h1>

        <div className="space-y-4 text-gray-700 text-base">
          <p>
            <span className="font-semibold text-gray-800">Email:</span>{" "}
            {user.email}
          </p>
          <p>
            <span className="font-semibold text-gray-800">Role:</span>{" "}
            <span className="capitalize">{user.role?.name}</span>
          </p>
          <p>
            <span className="font-semibold text-gray-800">User ID:</span>{" "}
            {user.id}
          </p>
          <p>
            <span className="font-semibold text-gray-800">Created At:</span>{" "}
            {new Date(user.created_at).toLocaleString()}
          </p>
          <p>
            <span className="font-semibold text-gray-800">Created By:</span>{" "}
            {user.creator ? (
              <span className="text-blue-700 font-medium">
                {user.creator.name}
              </span>
            ) : (
              <span className="italic text-gray-500">System / N/A</span>
            )}
          </p>
          <p>
            <span className="font-semibold text-gray-800">Status:</span>{" "}
            {user.is_active ? (
              <span className="text-green-600 font-medium">Active</span>
            ) : (
              <span className="text-red-600 font-medium">Inactive</span>
            )}
          </p>
        </div>

        {/* 🔘 Toggle Activation Button (Admin Only) */}
        {isAdmin && currentUser.id !== user.id && (
          <div className="mt-6 text-center">
            <button
              onClick={toggleActivation}
              disabled={loading}
              className={`px-6 py-2 rounded-lg font-semibold text-white ${
                user.is_active
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              } ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {loading
                ? "Processing..."
                : user.is_active
                ? "Deactivate User"
                : "Activate User"}
            </button>
          </div>
        )}
      </div>

      {/* 📋 Assigned Tasks Table */}
      <div className="mt-10 bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">
          Assigned Tasks
        </h2>

        {loadingTasks ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No tasks assigned to this user.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 rounded-lg">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Title</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Project</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Due Date</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold">Assigned By</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((t) => {
                  const overdue =
                    t.due_date && new Date(t.due_date) < new Date() && t.status !== "done";
                  return (
                    <tr key={t.id} className="border-t hover:bg-gray-50 transition">
                      {/* 🏷️ Task Title */}
                      <td className="px-4 py-2 text-sm font-medium text-gray-800">
                        {t.title}
                      </td>

                      {/* 📁 Project */}
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {t.project ? (
                          <span className="font-medium text-blue-700">
                            {t.project.title}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* 📊 Status */}
                      <td
                        className={`px-4 py-2 text-sm font-medium ${
                          t.status === "done"
                            ? "text-green-600"
                            : overdue
                            ? "text-red-600"
                            : "text-gray-700"
                        }`}
                      >
                        {t.status}
                      </td>

                      {/* 📅 Due Date */}
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {t.due_date ? new Date(t.due_date).toLocaleDateString() : "-"}
                        {overdue && (
                          <span className="ml-2 text-xs text-red-600 font-semibold">
                            ⚠️ Overdue
                          </span>
                        )}
                      </td>

                      {/* 👤 Created By */}
                      <td className="px-4 py-2 text-sm text-gray-700">
                        {t.createdBy ? (
                          <span className="font-medium text-gray-800">
                            {t.createdBy.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
