import React from "react";

export default function UserAvatar({ user, size = 40, fontSize }) {
  if (!user) return null;

  // --------------------------
  // Extract initials
  // --------------------------
  const getInitials = (name) => {
    if (!name) return "?";

    const parts = name.trim().split(" ");

    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }

    return (
      parts[0].charAt(0).toUpperCase() +
      parts[1].charAt(0).toUpperCase()
    );
  };

  const initials = getInitials(user.name);

  // --------------------------
  // Generate consistent color
  // --------------------------
  const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

  const bgColor = stringToColor(user.name);

  const imageUrl = user.avatar
    ? `http://127.0.0.1:8000${user.avatar}`
    : null;

  return (
    <>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="avatar"
          className="rounded-full object-cover border"
          style={{
            width: size,
            height: size,
          }}
        />
      ) : (
        <div
          className="flex items-center justify-center rounded-full text-white font-bold border"
          style={{
            width: size,
            height: size,
            backgroundColor: bgColor,
            fontSize: fontSize || size * 0.42, // ⬅️ Use passed fontSize or fallback
          }}
        >
          {initials}
        </div>
      )}
    </>
  );
}
