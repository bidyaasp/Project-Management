import React, { useEffect, useState, useMemo } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { formatDate, isOverdue } from "../utils/dateUtils";

export default function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [sortBy, setSortBy] = useState("due_date");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingTask, setEditingTask] = useState(null);
  const pageSize = 5;
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    due_date: "",
    assignee_id: "",
    project_id: "",
    priority: "low",
    estimated_hours: null,
  });
  const [projectMembers, setProjectMembers] = useState([]);

  const { user } = useAuth();

  const canManage =
    user && ["admin", "manager"].includes(user.role?.name?.toLowerCase());

  // Load tasks
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await api.get(`/users/me`);
        const userId = res.data.id;
        const taskRes = await api.get(`/users/${userId}/tasks`);
        setTasks(taskRes.data);
      } catch (err) {
        console.error("Error loading tasks:", err);
      }
    };
    fetchTasks();
  }, []);

  // Load users
  useEffect(() => {
    if (canManage) {
      api
        .get("/users")
        .then((res) => setUsers(res.data))
        .catch((err) => console.error("Error loading users", err));
    }
  }, [canManage]);

  // Sort tasks
const sortedTasks = useMemo(() => {
  const sorted = [...tasks];

  sorted.sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    // special handling for certain fields
    if (sortBy === "assignee") {
      aVal = a.assignee?.name || "";
      bVal = b.assignee?.name || "";
    } else if (sortBy === "status") {
      const statusOrder = { todo: 1, in_progress: 2, done: 3 };
      aVal = statusOrder[a.status] || 99;
      bVal = statusOrder[b.status] || 99;
    } else if (sortBy === "due_date") {
      aVal = a.due_date ? new Date(a.due_date) : new Date(0);
      bVal = b.due_date ? new Date(b.due_date) : new Date(0);
    } else if (sortBy === "project") {
      aVal = a.project?.title || "";
      bVal = b.project?.title || "";
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  return sorted;
}, [tasks, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedTasks.length / pageSize);
  const paginatedTasks = sortedTasks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error("Failed to delete task", err);
      alert("Failed to delete task.");
    }
  };

  const handleEditTask = async () => {
    try {
      await api.put(`/tasks/${editingTask.id}`, editingTask);
      setEditingTask(null);

      const updated = await api.get(`/users/me`);
      const userId = updated.data.id;
      const refreshed = await api.get(`/users/${userId}/tasks`);
      setTasks(refreshed.data);
    } catch (err) {
      console.error("Error updating task:", err);
      alert("Failed to update task.");
    }
  };

  const handleAddTask = async () => {
    try {
      await api.post("/tasks", newTask);
      setShowTaskForm(false);
      setNewTask({
        title: "",
        description: "",
        due_date: "",
        assignee_id: "",
        project_id: "",
      });

      const res = await api.get(`/users/me`);
      const userId = res.data.id;
      const refreshed = await api.get(`/users/${userId}/tasks`);
      setTasks(refreshed.data);
    } catch (err) {
      alert("Error adding task");
      console.error(err);
    }
  };

  const fetchProjectMembers = async (projectId) => {
    if (!projectId) return setProjectMembers([]);

    try {
      const res = await api.get(`/projects/${projectId}/members`);
      setProjectMembers(res.data);
    } catch (err) {
      console.error("Error fetching project members:", err);
      setProjectMembers([]);
    }
  };

  return (
    <>
      {/* 🟦 MAIN TASK PAGE */}
      <div className="max-w-6xl mx-auto mt-8 p-6 bg-white rounded-2xl shadow">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">
            {user?.role?.name === "developer" ? "My Tasks" : "All Tasks"}
          </h2>
          {canManage && (
            <button
              onClick={() => setShowTaskForm(true)}
              className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
              + Add Task
            </button>
          )}
        </div>

        {/* TABLE */}
        {tasks.length === 0 ? (
          <p className="text-gray-500">No tasks assigned yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Title
                    </th>
                    <th
                      onClick={() => handleSort("project")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                    >
                      Project {sortBy === "project" && (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      onClick={() => handleSort("assignee")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                    >
                      Assignee{" "}
                      {sortBy === "assignee" &&
                        (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      onClick={() => handleSort("status")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                    >
                      Status{" "}
                      {sortBy === "status" &&
                        (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      onClick={() => handleSort("due_date")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer"
                    >
                      Due Date{" "}
                      {sortBy === "due_date" &&
                        (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    {canManage && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedTasks.map((t) => {
                    const overdue = isOverdue(t.due_date, t.status);
                    let dueDateColor = "text-gray-500";
                    if (t.status === "done") dueDateColor = "text-green-600";
                    else if (overdue) dueDateColor = "text-red-600";

                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-gray-50 transition cursor-pointer"
                        onClick={() =>
                          (window.location.href = `/tasks/${t.id}`)
                        }
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {t.title}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {t.project?.title || "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {t.assignee?.name || "Unassigned"}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${t.status === "done"
                              ? "bg-green-100 text-green-800"
                              : t.status === "in_progress"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                              }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td
                          className={`px-6 py-4 text-sm font-medium ${dueDateColor}`}
                        >
                          {formatDate(t.due_date)}
                          {t.status !== "done" && overdue && (
                            <span className="ml-2 inline-flex items-center text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                              ⚠️ Overdue
                            </span>
                          )}
                        </td>

                        {canManage && (
                          <td
                            className="px-6 py-4 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() =>
                                setEditingTask({
                                  ...t,
                                  assignee_id: t.assignee?.id || "",
                                  priority: t.priority || "low", // default to "low" if null
                                })
                              }
                              className="text-blue-600 hover:underline mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTask(t.id)}
                              className="text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </p>

              <div className="space-x-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                >
                  Prev
                </button>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 🟦 ADD TASK MODAL — OUTSIDE THE BIG WRAPPER */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-[90%] max-w-lg max-h-[90vh] overflow-y-auto p-6 relative">
            <h3 className="text-xl font-semibold mb-4">Add Task</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask({ ...newTask, title: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask({ ...newTask, description: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  value={newTask.due_date}
                  onChange={(e) =>
                    setNewTask({ ...newTask, due_date: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Project
                </label>
                <select
                  value={newTask.project_id}
                  onChange={(e) => {
                    const projectId = e.target.value;
                    setNewTask({
                      ...newTask,
                      project_id: projectId,
                      assignee_id: "",
                    });
                    fetchProjectMembers(projectId);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select Project</option>

                  {[...new Map(tasks.map((t) => [t.project?.id, t.project]))
                    .values()]
                    .filter((p) => p)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Assignee
                </label>
                <select
                  value={newTask.assignee_id}
                  disabled={!newTask.project_id}
                  onChange={(e) =>
                    setNewTask({ ...newTask, assignee_id: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">
                    {newTask.project_id
                      ? "Select Member"
                      : "Select project first"}
                  </option>

                  {projectMembers.map((m) => (
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
                  value={newTask.priority}
                  onChange={(e) =>
                    setNewTask({ ...newTask, priority: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
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
                  value={newTask.estimated_hours}
                  onChange={(e) =>
                    setNewTask({
                      ...newTask,
                      estimated_hours: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowTaskForm(false)}
                  className="bg-gray-200 px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTask}
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🟦 EDIT TASK MODAL — OUTSIDE MAIN WRAPPER */}
      {editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-[90%] max-w-lg max-h-[90vh] overflow-y-auto p-6 relative">
            <h3 className="text-xl font-semibold mb-4">Edit Task</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, title: e.target.value })
                  }
                  className="border rounded w-full p-2 mb-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  value={editingTask.description}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, description: e.target.value })
                  }
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
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, due_date: e.target.value })
                  }
                  className="border rounded w-full p-2 mb-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Asignee
                </label>
                <select
                  value={editingTask.assignee_id || ""}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, assignee_id: e.target.value })
                  }
                  className="border rounded w-full p-2 mb-3"
                >
                  <option value="">Assign to</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role?.name})
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
                      estimated_hours: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  className="border rounded w-full p-2 mb-3"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingTask(null)}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleEditTask}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
