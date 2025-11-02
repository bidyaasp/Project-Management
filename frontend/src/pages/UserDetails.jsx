import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function UserDetails() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const isAdmin = currentUser?.role?.name?.toLowerCase() === "admin";

  const fetchUser = async () => {
    try {
      const res = await api.get(`/users/${id}`);
      setUser(res.data);
      console.log("Current User:", currentUser);
    } catch (err) {
      console.error("Failed to load user:", err);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [id]);

  const toggleActivation = async () => {
    if (!window.confirm("Are you sure you want to toggle this user's activation status?")) return;
    setLoading(true);
    try {
      const res = await api.patch(`/users/${id}/toggle-activation`);
      setUser(res.data); // Update state with updated user
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
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-blue-600 hover:underline mb-6 text-sm font-medium"
      >
        ← Back to Users
      </button>

      {/* Card */}
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
              <span className="text-blue-700 font-medium">{user.creator.name}</span>
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

        {/* Toggle Activation Button (Admin Only) */}
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
    </div>
  );
}