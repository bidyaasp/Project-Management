import React, { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { formatDate, isOverdue } from "../utils/dateUtils";

export default function TaskDetails() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();

  const [task, setTask] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    due_date: "",
    assignee_id: "",
  });

  // Fetch task
  useEffect(() => {
    const fetchTask = async () => {
      try {
        const res = await api.get(`/tasks/${id}`);
        setTask(res.data);
        setStatus(res.data.status);
      } catch (err) {
        console.error("Error fetching task details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [id]);

  // Fetch comments
  useEffect(() => {
    if (!task) return;
    const fetchComments = async () => {
      setLoadingComments(true);
      try {
        const res = await api.get(`/comments/task/${task.id}`);
        setComments(res.data);
      } catch (err) {
        console.error("Error fetching comments:", err);
      } finally {
        setLoadingComments(false);
      }
    };
    fetchComments();
  }, [task]);

  // Populate edit form
  useEffect(() => {
    if (task) {
      setEditForm({
        title: task.title || "",
        description: task.description || "",
        due_date: task.due_date || "",
        assignee_id: task.assignee?.id || "",
      });
    }
  }, [task]);

  // Fetch project members if not already loaded
  useEffect(() => {
    const fetchProjectMembers = async () => {
      if (task?.project && !task.project.members) {
        try {
          const res = await api.get(`/projects/${task.project.id}`);
          setTask((prev) => ({
            ...prev,
            project: { ...prev.project, members: res.data.members || [] },
          }));
        } catch (err) {
          console.error("Error fetching project members:", err);
        }
      }
    };
    fetchProjectMembers();
  }, [task]);

  // Save edited task
  const handleEditTask = async () => {
    try {
      await api.put(`/tasks/${task.id}`, editForm);
      const res = await api.get(`/tasks/${task.id}`);
      setTask(res.data);
      setEditing(false);
    } catch (err) {
      console.error("Error updating task:", err);
      alert("Failed to update task. Check permissions or try again.");
    }
  };

  // Save status
  const handleSaveStatus = async () => {
    if (status === task.status) return;
    setSaving(true);
    try {
      const res = await api.put(`/tasks/${id}/status`, { status });
      setTask((prev) => ({ ...prev, status: res.data.status }));
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status. Check permissions or try again.");
    } finally {
      setSaving(false);
    }
  };

  // Add comment
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      const res = await api.post(`/comments`, {
        task_id: task.id,
        content: newComment,
      });
      setComments((prev) => [...prev, res.data]);
      setNewComment("");
    } catch (err) {
      console.error("Error adding comment:", err);
      alert("Failed to add comment. Check permissions or try again.");
    } finally {
      setPostingComment(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      const res = await api.delete(`/comments/${commentId}`);
      if (res.data.success) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch (err) {
      console.error("Error deleting comment:", err);
      alert("Failed to delete comment. Check permissions or try again.");
    }
  };

  if (loading)
    return (
      <p className="text-gray-500 p-6 text-center">Loading task details...</p>
    );

  const backLink = location.state?.projectId
    ? `/projects/${location.state.projectId}`
    : "/tasks";

  const isAssignee =
    user?.role?.name === "developer"
      ? user?.id === task?.assignee?.id
      : true;

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow-lg border border-gray-200 relative">
      <Link
        to={backLink}
        className="text-blue-500 hover:underline mb-6 inline-block font-medium"
      >
        ← Back
      </Link>

      {/* ✅ Title + Edit Button aligned */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold text-gray-900">{task.title}</h1>
        {["admin", "manager"].includes(user?.role?.name?.toLowerCase()) && (
          <button
            onClick={() => setEditing(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-md hover:bg-blue-700 transition duration-200 flex items-center gap-2"
          >
            ✏️ Edit Task
          </button>
        )}
      </div>

      <p className="text-gray-700 mb-6">
        {task.description || "No description provided."}
      </p>

      {/* --- Task Info --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-gray-700 text-sm">
        <div>
          <p className="font-semibold">Status:</p>
          {isAssignee ? (
            <div className="flex items-center mt-1 gap-2">
              <select
                className={`border rounded px-2 py-1 ${
                  status === "done"
                    ? "text-green-600"
                    : status === "in_progress"
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
              <button
                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
                onClick={handleSaveStatus}
                disabled={saving || status === task.status}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          ) : (
            <p className="mt-1 capitalize">{task.status.replace("_", " ")}</p>
          )}
        </div>

        <div>
          <p className="font-semibold">Due Date:</p>

          {(() => {
            const overdue = isOverdue(task.due_date) && task.status !== "done";
            return (
              <p
                className={`mt-1 ${
                  overdue ? "text-red-600 font-medium" : "text-green-600"
                }`}
              >
                {task.due_date ? formatDate(task.due_date) : "No due date"}
                {overdue && " (Overdue)"}
              </p>
            );
          })()}
        </div>

        <div>
          <p className="font-semibold">Assignee:</p>
          <p className="mt-1">
            {task.assignee ? task.assignee.name : "Unassigned"}
          </p>
        </div>

        <div>
          <p className="font-semibold">Assigned By:</p>
          <p className="mt-1">
            {task.createdBy ? task.createdBy.name : "Unassigned"}
          </p>
        </div>
        
        <div>
          <p className="font-semibold">Assigned Date:</p>
          <p className="mt-1">
            {task.created_at
              ? formatDate(task.created_at)
              : ""}
          </p>
        </div>

        <div>
          <p className="font-semibold">Project:</p>
          <p className="mt-1">{task.project ? task.project.title : "-"}</p>
        </div>
      </div>

      {/* --- Project Details --- */}
      <div>
        <h2 className="text-lg font-semibold mb-2 text-gray-900">
          Project Details
        </h2>
        <p className="text-gray-700">
          {task.project ? task.project.description : "-"}
        </p>
      </div>

      {/* ✅ Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">
              Edit Task
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  value={editForm.due_date ? editForm.due_date.slice(0, 16) : ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, due_date: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              {/* ✅ Assignee dropdown pre-selected */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assignee
                </label>
                <select
                  value={editForm.assignee_id || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, assignee_id: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select Assignee</option>
                  {task.project?.members?.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleEditTask}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Comments ---------------- */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Comments</h2>

        {isAssignee && (
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Write a comment..."
              className="flex-1 border rounded px-3 py-2"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
              onClick={handleAddComment}
              disabled={postingComment || !newComment.trim()}
            >
              {postingComment ? "Posting..." : "Add"}
            </button>
          </div>
        )}

        {loadingComments ? (
          <p className="text-gray-500">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-gray-500">No comments yet.</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li
                key={c.id}
                className="border rounded p-3 bg-gray-50 flex justify-between items-start"
              >
                <div>
                  <p className="font-semibold text-gray-800">
                    {c.author.name}
                  </p>
                  <p className="text-gray-700">{c.content}</p>
                  <p className="text-gray-400 text-xs">
                    {new Date(c.created_at).toLocaleString()}
                  </p>
                </div>
                {c.author?.id === user?.id && (
                  <button
                    onClick={() => handleDeleteComment(c.id)}
                    className="text-red-500 hover:underline text-sm"
                  >
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
