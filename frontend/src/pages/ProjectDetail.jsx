import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { formatDate, isOverdue } from "../utils/dateUtils";
import UserAvatar from "../components/UserAvatar";

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    due_date: "",
    assignee_id: "",
    priority: "low",
    estimated_hours: null,    // null instead of ""
  });
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
  });
  const [editingTask, setEditingTask] = useState(null); // ✅ Edit task state
  const { user } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0); // ✅ new state

  const [projectHistory, setProjectHistory] = useState([]);
  const [loadingProjectHistory, setLoadingProjectHistory] = useState(true);
  const [openAccordion, setOpenAccordion] = useState("info");

  const toggleAccordion = (key) => {
    setOpenAccordion(prev => prev === key ? "" : key);
  };


  const canManage =
    user && ["admin", "manager"].includes(user.role?.name?.toLowerCase());

  const isManager = user.role?.name?.toLowerCase() == 'manager'

  const loadProject = async () => {
    try {
      const res = await api.get(`/projects/${id}`);
      setProject(res.data);
      setEditForm({
        title: res.data.title || "",
        description: res.data.description || "",
        member_ids: res.data.members?.map((m) => m.id) || [],
      });
    } catch (err) {
      console.error("Error loading project", err);
    }
  };

  useEffect(() => {
    loadProject();
  }, [id]);

  // ✅ Fetch Project Progress
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await api.get(`/projects/${id}/progress`);
        setProgress(res.data.completion_percent || 0);
      } catch (err) {
        console.error("Error fetching project progress:", err);
      }
    };
    fetchProgress();
  }, [id]);

  useEffect(() => {
    if (canManage) {
      api
        .get("/users/")
        .then((res) => setUsers(res.data))
        .catch((err) => console.error("Error loading users", err));
    }
  }, [canManage]);

  const handleAddTask = async () => {
    try {
      await api.post(`/projects/${id}/tasks`, newTask);
      setShowTaskForm(false);
      setNewTask({ title: "", description: "", due_date: "", assignee_id: "" });
      loadProject();
    } catch (err) {
      alert("Error adding task");
      console.error(err);
    }
  };

  const handleEditTask = async () => {
    try {
      await api.put(`/tasks/${editingTask.id}`, editingTask);
      setEditingTask(null);
      loadProject();
    } catch (err) {
      console.error("Error updating task:", err);
      alert("Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      loadProject();
    } catch (err) {
      alert("Failed to delete task");
      console.error(err);
    }
  };

  const handleAddMember = async () => {
    try {
      await api.post(`/projects/${id}/add_members`, {
        member_ids: selectedMemberIds,
      });
      setShowMemberForm(false);
      setSelectedMemberIds([]);
      loadProject();
    } catch (err) {
      alert("Error adding member");
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await api.delete(`/projects/${id}`);
      navigate("/projects");
    } catch (err) {
      alert("Failed to delete project.");
      console.error(err);
    }
  };

  const handleArchive = async (archive) => {
    try {
      await api.put(`/projects/${id}/archive?archive=${archive}`);
      loadProject();
    } catch (err) {
      alert("Failed to update archive status.");
      console.error(err);
    }
  };

  const handleEditProject = async () => {
    try {
      await api.put(`/projects/${id}`, {
        title: editForm.title,
        description: editForm.description,
        member_ids: editForm.member_ids,
      });
      setShowEditModal(false);
      loadProject();
    } catch (err) {
      console.error("Failed to update project:", err);
      alert("Failed to update project details.");
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm("Are you sure you want to remove this member from the project?")) return;
    try {
      await api.post(`/projects/${id}/remove_members`, {
        member_ids: [Number(memberId)],
      });
      loadProject(); // reload project data
    } catch (err) {
      alert("Failed to remove member.");
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get(`/projects/${project.id}/history`);
        setProjectHistory(res.data);
      } catch (err) {
        console.error("Error fetching project history", err);
      } finally {
        setLoadingProjectHistory(false);
      }
    };

    if (project) fetchHistory();
  }, [project]);


  if (!project) return <div className="p-6">Loading project details...</div>;

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            {project.title}
            {canManage && (
              <button
                onClick={() => setShowEditModal(true)}
                className="text-blue-600 text-sm hover:underline"
              >
                ✏️ Edit
              </button>
            )}
          </h1>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => navigate("/projects")}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded"
          >
            ← Back
          </button>
          {user?.role.name === "admin" && (
            <>
              <button
                onClick={() => handleArchive(!project.is_archived)}
                className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded"
              >
                {project.is_archived ? "Unarchive" : "Archive"}
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-100 text-red-800 px-3 py-1 rounded"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {project.description && (
        <p className="text-gray-700 mb-6">{project.description}</p>
      )}

      {/* ✅ Project Progress */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2 text-gray-900">Project Progress</h2>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600 mt-1">{progress.toFixed(0)}% complete</p>
      </div>

      {/* Members */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold">Team Members</h2>
          {canManage && (
            <button
              onClick={() => {
                setSelectedMemberIds(project.members.map((m) => m.id)); // ✅ preselect current members
                setShowMemberForm(true);
              }}
              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
            >
              + Add Member
            </button>
          )}
        </div>

        {project.members?.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {project.members.map((m) => (
              <li
                key={m.id}
                className="py-2 flex justify-between items-center"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <UserAvatar user={m} size={32} fontSize={14} />

                  {/* Name + Role + Email */}
                  <div>
                    <div className="font-medium text-gray-900 flex items-center gap-1">
                      {m.name}
                      <span className="text-sm text-gray-500">({m.role?.name})</span>
                    </div>
                    <div className="text-sm text-gray-600">{m.email}</div>
                  </div>
                </div>

                {canManage && (
                  <button
                    onClick={() => handleDeleteMember(m.id)}
                    className="text-red-600 text-sm hover:underline"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No members assigned yet.</p>
        )}
      </div>

      {/* Tasks */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold">Tasks</h2>
          {canManage && (
            <button
              onClick={() => setShowTaskForm(true)}
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              + Add Task
            </button>
          )}
        </div>

        {project.tasks?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Title</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Assignee</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Due Date</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                  {canManage && <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {project.tasks.map((t) => (
                  <tr
                    key={t.id}
                    className="border-t hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/tasks/${t.id}`, { state: { from: "project", projectId: project.id } })} // ✅ navigate to task details
                  >
                    <td className="px-4 py-2 text-sm text-gray-900">{t.title}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{t.assignee?.name || "-"}</td>
                    <td
                      className={`px-4 py-2 text-sm font-medium ${t.status === "done"
                        ? "text-green-600"
                        : isOverdue(t.due_date, t.status)
                          ? "text-red-600"
                          : "text-gray-700"
                        }`}
                    >
                      {t.due_date ? formatDate(t.due_date) : "-"}
                      {t.status !== "done" && isOverdue(t.due_date, t.status) && (
                        <span className="ml-2 inline-flex items-center text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                          ⚠️ Overdue
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${t.status === "done"
                          ? "bg-green-100 text-green-800"
                          : t.status === "in_progress"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                          }`}
                      >
                        {t.status.replace("_", " ").toUpperCase()}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-2 text-sm flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click from firing
                            setEditingTask({ ...t, assignee_id: t.assignee?.id || "" });
                          }}
                          className="text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click from firing
                            handleDeleteTask(t.id);
                          }}
                          className="text-red-600 hover:underline"
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
        ) : (
          <p className="text-gray-500">No tasks added yet.</p>
        )}
      </div>

      {/* ────────────── Project History ────────────── */}
      <div className="bg-white p-4 rounded-lg shadow mt-6">
        <div
          className="flex justify-between items-center mb-3 cursor-pointer"
          onClick={() => toggleAccordion("history")}
        >
          <h2 className="text-xl font-semibold">Project History</h2>
          <span className="text-blue-600 text-sm hover:underline">
            {openAccordion === "history" ? "▲" : "▼"}
          </span>
        </div>

        {openAccordion === "history" && (
          <div className="max-h-72 overflow-y-auto">
            {loadingProjectHistory ? (
              <p className="text-gray-500">Loading history...</p>
            ) : projectHistory.length === 0 ? (
              <p className="text-gray-500">No history records yet.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {projectHistory.map((h) => (
                  <li key={h.id} className="py-2">

                    {/* Avatar + Name + Action */}
                    <div className="flex items-start gap-2">
                      <UserAvatar user={h.user} size={26} fontSize={11} />

                      <div>
                        <p className="text-sm text-gray-700 leading-tight">
                          <span className="font-medium">{h.user?.name || "System"}</span>{" "}
                          {h.action.replace(/_/g, " ").toLowerCase()}

                          {h.field && (
                            <>
                              {" "}
                              <span className="font-semibold">{h.field}</span>:{" "}
                              <span className="text-red-600">{h.old_value || "-"}</span> →{" "}
                              <span className="text-green-600">{h.new_value || "-"}</span>
                            </>
                          )}
                        </p>

                        <p className="text-xs text-gray-400 leading-tight mt-1">
                          {new Date(h.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>

                  </li>
                ))}
              </ul>

            )}
          </div>
        )}
      </div>


      {/* Modals */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Add Task</h3>
            <input
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="Title"
              className="border rounded w-full p-2 mb-3"
            />
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="Description"
              className="border rounded w-full p-2 mb-3"
            />
            <div>
              <label className="block text-sm font-medium mb-1">
                Due date
              </label>
              <input
                type="datetime-local"
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                className="border rounded w-full p-2 mb-3"
              />
            </div>
            <select
              value={newTask.assignee_id}
              onChange={(e) => setNewTask({ ...newTask, assignee_id: e.target.value })}
              className="border rounded w-full p-2 mb-4"
            >
              <option value="">Assign to</option>
              {project.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role?.name})
                </option>
              ))}
            </select>
            <select
              value={newTask.priority}
              onChange={(e) =>
                setNewTask({ ...newTask, priority: e.target.value })
              }
              className="border rounded w-full p-2 mb-4"
            >
              <option value="">Select Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <input
              type="number"
              min="1"
              step="0.5"
              value={newTask.estimated_hours}
              placeholder="Estimated Hours"
              onChange={(e) =>
                setNewTask({
                  ...newTask,
                  estimated_hours: e.target.value,
                })
              }
              className="border rounded w-full p-2 mb-3"
            />
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowTaskForm(false)} className="bg-gray-200 px-4 py-2 rounded">
                Cancel
              </button>
              <button onClick={handleAddTask} className="bg-blue-600 text-white px-4 py-2 rounded">
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {showMemberForm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Add Member</h3>
            <div className="mb-4">
              <div className="border rounded w-full p-2 max-h-48 overflow-y-auto">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center space-x-2 mb-1">
                    <input
                      type="checkbox"
                      value={u.id}
                      checked={selectedMemberIds.includes(u.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const value = Number(e.target.value);
                        setSelectedMemberIds((prev) =>
                          checked
                            ? [...prev, value]
                            : prev.filter((id) => id !== value)
                        );
                      }}
                    />
                    <span>{u.name} ({u.role?.name})</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowMemberForm(false)} className="bg-gray-200 px-4 py-2 rounded">
                Cancel
              </button>
              <button onClick={handleAddMember} className="bg-green-600 text-white px-4 py-2 rounded">
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Edit Task</h3>
            <div>
              <label className="block text-sm font-medium mb-1">
                Title
              </label>
              <input
                type="text"
                value={editingTask.title}
                onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                placeholder="Title"
                className="border rounded w-full p-2 mb-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                value={editingTask.description}
                onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                placeholder="Description"
                className="border rounded w-full p-2 mb-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Due date
              </label>
              <input
                type="datetime-local"
                value={editingTask.due_date || ""}
                onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                className="border rounded w-full p-2 mb-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Asignee
              </label>
              <select
                value={editingTask.assignee_id || ""}
                onChange={(e) => setEditingTask({ ...editingTask, assignee_id: e.target.value })}
                className="border rounded w-full p-2 mb-4"
              >
                <option value="">Assign to</option>
                {project.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role?.name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Priority
              </label>
              <select
                value={editingTask.priority || ""}
                onChange={(e) =>
                  setEditingTask({ ...editingTask, priority: e.target.value })
                }
                className="border rounded w-full p-2 mb-3"
              >
                <option value="">Select Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Estimated Hours
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={editingTask.estimated_hours || ""}
                onChange={(e) =>
                  setEditingTask({
                    ...editingTask,
                    estimated_hours: e.target.value,
                  })
                }
                className="border rounded w-full p-2 mb-3"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setEditingTask(null)} className="bg-gray-200 px-4 py-2 rounded">Cancel</button>
              <button onClick={handleEditTask} className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Edit Project Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Edit Project</h3>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              placeholder="Title"
              className="border rounded w-full p-2 mb-3"
            />
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Description"
              className="border rounded w-full p-2 mb-3"
            />
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowEditModal(false)} className="bg-gray-200 px-4 py-2 rounded">Cancel</button>
              <button onClick={handleEditProject} className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
