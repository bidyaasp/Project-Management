import React, { useEffect, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import UserAvatar from "../components/UserAvatar";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwords, setPasswords] = useState({ old_password: "", new_password: "" });
  const [passwordMessage, setPasswordMessage] = useState("");

  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarMessage, setAvatarMessage] = useState("");

  // ⬅️ Added: to update global navbar user
  const { logout, setUser: setAuthUser } = useAuth();

  useEffect(() => {
    api
      .get("/users/me")
      .then((r) => {
        setUser(r.data);
        setForm({ name: r.data.name, email: r.data.email });
      })
      .catch((err) => console.error("Failed to load profile:", err))
      .finally(() => setLoading(false));
  }, []);

  const syncGlobalUser = (updatedUser) => {
    setAuthUser(updatedUser);
    localStorage.setItem("pm_user", JSON.stringify(updatedUser));
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await api.patch("/users/me", form);
      setUser(res.data);
      syncGlobalUser(res.data);
      setMessage("✅ Profile updated successfully!");
    } catch (err) {
      setMessage("❌ Failed to update profile.");
    }
    setSaving(false);
  };

  // 🔹 Remove avatar (with confirmation)
  const handleRemoveAvatar = async () => {
    const ok = window.confirm("Are you sure you want to remove your profile photo?");
    if (!ok) return;

    try {
      await api.delete(`/users/${user.id}/avatar`);

      const updated = { ...user, avatar: null };
      setUser(updated);
      syncGlobalUser(updated);

      setAvatarPreview(null);
      setAvatarFile(null);

      setAvatarMessage("🗑️ Photo removed");
      setTimeout(() => setShowAvatarModal(false), 800);
    } catch {
      setAvatarMessage("❌ Failed to remove photo.");
    }
  };


  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMessage("");
    try {
      await api.put("/auth/change-password", passwords);
      setPasswordMessage("✅ Password changed successfully! Logging out...");
      setTimeout(() => logout(), 1500);
    } catch (err) {
      setPasswordMessage(err.response?.data?.detail || "❌ Failed to change password.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="mt-6 max-w-lg mx-auto bg-white rounded-2xl shadow-md p-6 border border-gray-200">
      <h1 className="text-2xl font-bold mb-4">My Profile</h1>

      {/* Avatar + Change button */}
      <div className="flex items-center gap-4 mb-4">
        <UserAvatar user={user} size={90} />

        <div className="flex flex-col">
          <button
            onClick={() => setShowAvatarModal(true)}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
          >
            Change Avatar
          </button>

          {user?.avatar && (
            <button
              onClick={handleRemoveAvatar}
              className="mt-2 text-sm text-red-600 hover:underline"
            >
              Remove Photo
            </button>
          )}
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {message && (
        <p className="mt-4 text-center text-sm font-medium text-gray-700">{message}</p>
      )}

      {/* Change password */}
      <p className="text-center mt-6">
        <button
          onClick={() => setShowPasswordModal(true)}
          className="text-blue-600 hover:underline text-sm font-medium"
        >
          Change Password
        </button>
      </p>

      {/* PASSWORD MODAL (unchanged) */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96">
            <h2 className="text-lg font-bold mb-4 text-center">Change Password</h2>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <input
                type="password"
                placeholder="Old Password"
                value={passwords.old_password}
                onChange={(e) => setPasswords({ ...passwords, old_password: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />

              <input
                type="password"
                placeholder="New Password"
                value={passwords.new_password}
                onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />

              {passwordMessage && (
                <p className="text-sm text-center text-gray-700">{passwordMessage}</p>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">
                  Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AVATAR MODAL */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-96 shadow-xl">
            <h2 className="text-lg font-bold mb-4 text-center">Change Avatar</h2>

            <div className="flex justify-center mb-4">
                <UserAvatar user={user} size={64} />
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                setAvatarFile(file);
                setAvatarPreview(URL.createObjectURL(file));
              }}
              className="w-full border px-3 py-2 rounded-lg"
            />

            {user?.avatar && !avatarPreview && (
              <button
                onClick={handleRemoveAvatar}
                className="mt-3 text-sm text-red-600 hover:underline w-full text-center"
              >
                Remove Photo
              </button>
            )}

            {avatarMessage && (
              <p className="text-center mt-3 text-sm text-gray-700">{avatarMessage}</p>
            )}

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowAvatarModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  if (!avatarFile) return;

                  const fileData = new FormData();
                  fileData.append("file", avatarFile);

                  try {
                    const res = await api.post(`/users/${user.id}/avatar`, fileData);

                    const updated = { ...user, avatar: res.data.avatar_url };
                    setUser(updated);
                    syncGlobalUser(updated);

                    setAvatarMessage("✅ Avatar updated!");
                    setTimeout(() => setShowAvatarModal(false), 1000);
                  } catch {
                    setAvatarMessage("❌ Failed to upload avatar.");
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
