import React, { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { formatDate, isOverdue } from "../utils/dateUtils";
import UserAvatar from "../components/UserAvatar";

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
    priority: "low",       // default instead of ""
    estimated_hours: null,    // null instead of ""
    actual_hours: null,       // null instead of ""
  });

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [openAccordion, setOpenAccordion] = useState("comments");

  const toggleAccordion = (key) => {
    setOpenAccordion((prev) => (prev === key ? "" : key));
  };

  const [timeLogs, setTimeLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const [logHours, setLogHours] = useState("");
  const [logNote, setLogNote] = useState("");
  const [showLogWorkModal, setShowLogWorkModal] = useState(false);


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
        priority: task.priority || "",
        estimated_hours: task.estimated_hours || "",
        actual_hours: task.actual_hours || "",
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
      const payload = {
        ...editForm,
        priority: editForm.priority || "medium",
        estimated_hours:
          editForm.estimated_hours === "" ? null : Number(editForm.estimated_hours),
        actual_hours:
          editForm.actual_hours === "" ? null : Number(editForm.actual_hours),
      };

      await api.put(`/tasks/${task.id}`, payload);

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

  // Fetch task history
  useEffect(() => {
    if (!task) return;
    const fetchHistory = async () => {
      try {
        const res = await api.get(`/tasks/${task.id}/history`);
        setHistory(res.data);
      } catch (err) {
        console.error("Error loading task history:", err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [task]);

  // fetch time logs
  useEffect(() => {
    if (!task) return;
    const fetchTimeLogs = async () => {
      try {
        const res = await api.get(`/timelogs/tasks/${task.id}`);
        setTimeLogs(res.data);
      } catch (err) {
        console.error("Error loading time logs:", err);
      } finally {
        setLoadingLogs(false);
      }
    };
    fetchTimeLogs();
  }, [task]);


  const handleLogWorkSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.post(`/timelogs/tasks/${task.id}`, {
        hours: logHours,
        description: logNote,
        log_date: new Date().toISOString(),
      });

      // Clear form
      setLogHours("");
      setLogNote("");

      // Close modal
      setShowLogWorkModal(false);

      // Refresh task after log
      const res = await api.get(`/tasks/${task.id}`);
      setTask(res.data);

    } catch (err) {
      console.error(err);
    }
  };


  if (loading)
    return (
      <p className="text-gray-500 p-6 text-center">Loading task details...</p>
    );

  let backLink = "/tasks"; // default

  if (location.state?.from === "project") {
    backLink = `/projects/${location.state.projectId}`;
  } else if (location.state?.from === "user") {
    backLink = `/users/${location.state.userId}`;
  } else if (location.state?.from === "task_list") {
    backLink = "/tasks";
  }

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

        <div className="flex gap-2">
          {["admin", "manager"].includes(user?.role?.name?.toLowerCase()) && (
            <button
              onClick={() => setEditing(true)}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium shadow-md hover:bg-blue-700 transition duration-200 flex items-center whitespace-nowrap"
            >
              ✏️ Edit Task
            </button>
          )}

          {isAssignee && (
            <button
              onClick={() => setShowLogWorkModal(true)}
              className="bg-green-600 text-white px-5 py-2 rounded-lg font-medium shadow-md hover:bg-green-700 transition duration-200 flex items-center whitespace-nowrap"
            >
              Log Work
            </button>
          )}
        </div>
      </div>



      <p className="text-gray-700 mb-6">
        {task.description || ""}
      </p>

      {/* --- Task Info --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-gray-700 text-sm">
        {/* Status */}
        <div>
          <p className="font-semibold">Status:</p>
          {isAssignee ? (
            <div className="flex items-center mt-1 gap-2">
              <select
                className={`border rounded px-2 py-1 ${status === "done"
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

        {/* Priority */}
        <div>
          <p className="font-semibold">Priority:</p>
          <p
            className={`mt-1 capitalize ${task.priority === "high"
              ? "text-red-600 font-medium"
              : task.priority === "medium"
                ? "text-yellow-600 font-medium"
                : "text-green-600"
              }`}
          >
            {task.priority || "Not set"}
          </p>
        </div>

        {/* Due Date */}
        <div>
          <p className="font-semibold">Due Date:</p>
          {(() => {
            const overdue = isOverdue(task.due_date) && task.status !== "done";
            return (
              <p
                className={`mt-1 ${overdue ? "text-red-600 font-medium" : "text-green-600"
                  }`}
              >
                {task.due_date ? formatDate(task.due_date) : "No due date"}
                {overdue && " (Overdue)"}
              </p>
            );
          })()}
        </div>

        {/* Estimated Hours */}
        <div>
          <p className="font-semibold">Estimated Hours:</p>
          <p className="mt-1">{task.estimated_hours ?? "Not set"}</p>
        </div>

        {/* Actual Hours */}
        <div>
          <p className="font-semibold">Actual Hours Logged:</p>
          <p className="mt-1">{task.actual_hours ?? 0}</p>
        </div>

        {/* Updated At */}
        <div>
          <p className="font-semibold">Last Updated:</p>
          <p className="mt-1">
            {task.updated_at ? formatDate(task.updated_at) : "—"}
          </p>
        </div>

        {/* Assignee */}
        <div>
          <p className="font-semibold">Assignee:</p>
          <p className="mt-1">
            {task.assignee ? task.assignee.name : "Unassigned"}
          </p>
        </div>

        {/* Created By */}
        <div>
          <p className="font-semibold">Created By:</p>
          <p className="mt-1">
            {task.createdBy ? task.createdBy.name : "Unassigned"}
          </p>
        </div>

        {/* Project */}
        <div>
          <p className="font-semibold">Project:</p>
          <p className="mt-1">{task.project ? task.project.title : "-"}</p>
        </div>

        {/* Created At */}
        <div>
          <p className="font-semibold">Created Date:</p>
          <p className="mt-1">{task.created_at ? formatDate(task.created_at) : ""}</p>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 
                        max-h-[90vh] overflow-y-auto">
            {/* Header + Close Button */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Edit Task</h3>
              <button
                onClick={() => setEditing(false)}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ✕
              </button>
            </div>

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

            {/* ✅ Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={editForm.priority || "medium"}
                onChange={(e) =>
                  setEditForm({ ...editForm, priority: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* ✅ Estimated Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Hours
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={editForm.estimated_hours || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, estimated_hours: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            {/* ✅ Actual Hours */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Actual Hours
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={editForm.actual_hours || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, actual_hours: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
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


      {showLogWorkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 shadow-xl">
            {/* Header + Close Button */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold mb-4">Log Work</h3>
              <button
                onClick={() => setShowLogWorkModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ✕
              </button>
            </div>


            <form onSubmit={handleLogWorkSubmit} className="flex flex-col gap-4">
              <div>
                <label>Hours</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.1"
                  className="border p-2 w-full rounded"
                  value={logHours}
                  onChange={(e) => setLogHours(e.target.value)}
                />
              </div>

              <div>
                <label>Notes</label>
                <textarea
                  required
                  className="border p-2 w-full rounded"
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => setShowLogWorkModal(false)}
                  className="px-4 py-2 bg-gray-400 text-white rounded"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ---- HORIZONTAL ACCORDIONS ---- */}
      <div className="mt-10 grid grid-cols-1 gap-4">

        {/* COMMENTS ACCORDION */}
        <div className="border rounded-lg overflow-hidden">
          <button
            onClick={() => toggleAccordion("comments")}
            className="w-full flex justify-between items-center px-4 py-3 bg-gray-100 hover:bg-gray-200 text-left"
          >
            <span className="font-semibold text-gray-900">💬 Comments</span>
            <span>{openAccordion === "comments" ? "▲" : "▼"}</span>
          </button>

          {openAccordion === "comments" && (
            <div className="p-4 bg-white">

              {/* Add Comment */}
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

              {/* Comments List */}
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
                      <div className="flex gap-2 py-2 border-b border-gray-100">
                        {/* Avatar */}
                        <UserAvatar user={c.author} size={32} fontSize={12} />

                        {/* Right Block */}
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-gray-900 text-sm">{c.author.name}</span>
                            <span className="text-xs text-gray-400">• {new Date(c.created_at).toLocaleString()}</span>
                          </div>

                          <p className="text-gray-700 text-sm mt-0.5 leading-snug">
                            {c.content}
                          </p>
                        </div>
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
          )}
        </div>

        {/* TASK HISTORY ACCORDION */}
        <div className="border rounded-lg overflow-hidden">
          <button
            onClick={() => toggleAccordion("history")}
            className="w-full flex justify-between items-center px-4 py-3 bg-gray-100 hover:bg-gray-200 text-left"
          >
            <span className="font-semibold text-gray-900">📜 Task History</span>
            <span>{openAccordion === "history" ? "▲" : "▼"}</span>
          </button>

          {openAccordion === "history" && (
            <div className="max-h-72 overflow-y-auto">

              {loadingHistory ? (
                <p className="text-gray-500">Loading history...</p>
              ) : history.length === 0 ? (
                <p className="text-gray-500">No history available.</p>
              ) : (
                <ul className="space-y-3">
                  {history.map((h) => (
                    <li key={h.id} className="border rounded p-3 bg-gray-50 space-y-2">

                      {/* Header Row: Avatar + Name + Action */}
                      <div className="flex items-center gap-2">
                        <UserAvatar user={h.user} size={28} fontSize={12} />
                        <p className="font-semibold text-gray-800">
                          {h.user?.name} {h.action}
                        </p>
                      </div>

                      {/* Description */}
                      {h.description && (
                        <p className="text-gray-700 text-sm leading-tight">{h.description}</p>
                      )}

                      {/* Field Changes */}
                      {h.changes && (
                        <div className="space-y-1">
                          {Object.entries(h.changes).map(([field, [oldVal, newVal]]) => {
                            const clean = (v) =>
                              typeof v === "string" ? v.replace("TaskPriority.", "") : v;

                            return (
                              <p key={field} className="text-sm text-gray-800 leading-tight">
                                <span className="font-medium capitalize">
                                  {field.replace("_", " ")}
                                </span>
                                : {clean(oldVal) ?? "—"} →{" "}
                                <span className="font-semibold text-green-600">
                                  {clean(newVal) ?? "—"}
                                </span>
                              </p>
                            );
                          })}
                        </div>
                      )}

                      {/* Timestamp */}
                      <p className="text-gray-400 text-xs">
                        {new Date(h.created_at).toLocaleString()}
                      </p>
                    </li>
                  ))}

                </ul>
              )}

            </div>
          )}
        </div>

        {/* TIME LOGS ACCORDION */}
        <div className="border rounded-lg overflow-hidden">
          <button
            onClick={() => toggleAccordion("timelogs")}
            className="w-full flex justify-between items-center px-4 py-3 bg-gray-100 hover:bg-gray-200 text-left"
          >
            <span className="font-semibold text-gray-900">⏱️ Time Logs</span>
            <span>{openAccordion === "timelogs" ? "▲" : "▼"}</span>
          </button>

          {openAccordion === "timelogs" && (
            <div className="max-h-72 overflow-y-auto">

              {loadingLogs ? (
                <p className="text-gray-500">Loading time logs...</p>
              ) : timeLogs.length === 0 ? (
                <p className="text-gray-500">No time logs yet.</p>
              ) : (
                <ul className="space-y-3">
                  {timeLogs.map((log) => (
                    <li
                      key={log.id}
                      className="border rounded p-3 bg-gray-50 space-y-2"
                    >

                      {/* Avatar + Name + Hours */}
                      <div className="flex items-center gap-2">
                        <UserAvatar user={log.user} size={28} fontSize={12} />

                        <p className="font-semibold text-gray-800 leading-tight">
                          {log.user?.name || "Unknown User"} logged {log.hours}h
                        </p>
                      </div>

                      {/* Description */}
                      {log.description && (
                        <p className="text-gray-700 text-sm leading-tight">
                          {log.description}
                        </p>
                      )}

                      {/* Timestamp */}
                      <p className="text-gray-400 text-xs leading-tight">
                        {new Date(log.log_date).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>

              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
