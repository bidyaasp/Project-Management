import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    member_ids: [],
  });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [progressMap, setProgressMap] = useState({});


  const canManage =
    user && ["admin", "manager"].includes(user.role?.name?.toLowerCase());

useEffect(() => {
  const fetchProjects = async () => {
    try {
      const res = await api.get("/projects/");
      setProjects(res.data);

      // Fetch progress for each project
      const progressData = {};
      await Promise.all(
        res.data.map(async (p) => {
          try {
            const progressRes = await api.get(`/projects/${p.id}/progress`);
            progressData[p.id] = progressRes.data.completion_percent || 0;
          } catch (err) {
            console.error(`Failed to fetch progress for project ${p.id}`, err);
            progressData[p.id] = 0;
          }
        })
      );
      setProgressMap(progressData);
    } catch (err) {
      console.error(err);
      setError("Failed to load projects.");
    } finally {
      setLoading(false);
    }
  };
  fetchProjects();
}, []);


  // Fetch users
  useEffect(() => {
    if (canManage) {
      api
        .get("/users/")
        .then((res) => setUsers(res.data))
        .catch((err) => console.error("Failed to load users:", err));
    }
  }, [canManage]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleMemberToggle = (id) => {
    setForm((prev) => {
      const updated = prev.member_ids.includes(id)
        ? prev.member_ids.filter((m) => m !== id)
        : [...prev.member_ids, id];
      return { ...prev, member_ids: updated };
    });
  };

  // 🟦 Create or Update Project
  const handleSubmit = async () => {
    if (!form.title.trim()) return alert("Title is required");

    try {
      if (editingProject) {
        // Update existing project
        const res = await api.put(`/projects/${editingProject.id}`, form);
        setProjects((prev) =>
          prev.map((p) => (p.id === editingProject.id ? res.data : p))
        );
      } else {
        // Create new project
        const res = await api.post("/projects", form);
        setProjects((prev) => [...prev, res.data]);
      }

      setShowModal(false);
      setForm({ title: "", description: "", member_ids: [] });
      setEditingProject(null);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to save project");
    }
  };

  const handleEditClick = (project) => {
    setEditingProject(project);
    setForm({
      title: project.title,
      description: project.description || "",
      member_ids: project.member_ids || [],
    });
    setShowModal(true);
  };

  if (loading) return <div className="p-6">Loading projects...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Projects</h1>
        {canManage && (
          <button
            onClick={() => {
              setShowModal(true);
              setEditingProject(null);
              setForm({ title: "", description: "", member_ids: [] });
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition"
          >
            + Add Project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <p className="text-gray-500">No projects found.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition border border-gray-100"
            >
              <div className="flex justify-between items-start">
                <div
                  className="cursor-pointer"
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <h2 className="text-lg font-semibold text-gray-800">
                    {p.title}
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">{p.description}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    Created on {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className="text-sm bg-gray-100 px-3 py-1 rounded-full text-gray-600">
                    Members: {p.member_ids?.length || 0}
                  </span>
                  <span className="text-sm bg-blue-100 px-3 py-1 rounded-full text-blue-700">
                    Progress: {Math.round(progressMap[p.id] ?? 0)}%
                  </span>
                  {/* ✏️ Edit button for managers/admins */}
                  {canManage && (
                    <button
                      onClick={() => handleEditClick(p)}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      ✏️ Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🧩 Modal (Create / Edit) */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-6 space-y-4 relative">
            <h2 className="text-xl font-semibold">
              {editingProject ? "Edit Project" : "Create New Project"}
            </h2>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Project title"
              className="w-full border rounded-lg p-2 focus:ring focus:ring-blue-200"
            />
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Project description"
              className="w-full border rounded-lg p-2 focus:ring focus:ring-blue-200"
              rows={3}
            />

            <div>
              <h3 className="font-medium mb-2">Assign Members:</h3>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                {users.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form.member_ids.includes(u.id)}
                      onChange={() => handleMemberToggle(u.id)}
                    />
                    {u.name} ({u.role?.name})
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingProject(null);
                }}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {editingProject ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
