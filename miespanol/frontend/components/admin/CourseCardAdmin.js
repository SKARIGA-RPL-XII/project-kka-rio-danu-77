// frontend/components/admin/CourseCardAdmin.js
import React from "react";

function buildImageSrc(apiRoot, thumbnail) {
  if (!thumbnail) return null;
  const t = String(thumbnail).trim();
  if (!t) return null;

  if (/^https?:\/\//i.test(t)) return t;

  try {
    const base = apiRoot.replace(/\/+$/, "") + "/";
    const url = new URL(t, base);
    return url.href;
  } catch (e) {
    if (t.startsWith("/")) return apiRoot.replace(/\/+$/, "") + t;
    return apiRoot.replace(/\/+$/, "") + "/uploads/" + t;
  }
}

export default function CourseCardAdmin({
  apiRoot = "http://localhost:4000",
  course = {},
  onOpen = () => {},
  onDelete = () => {}
}) {
  const imgSrc = buildImageSrc(apiRoot, course.thumbnail_url);

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition overflow-hidden flex flex-col">
      
      {/* IMAGE */}
      <div className="w-full h-44 bg-gray-100 overflow-hidden">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">
            No image
          </div>
        )}
      </div>

      {/* CONTENT */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        
        <div>
          <div className="text-lg font-bold mb-1 line-clamp-1">
            {course.title}
          </div>

          <div className="text-xs text-gray-500 mb-2">
            {course.category || "Pembelajaran"}
          </div>

          <div className="text-sm text-gray-700 line-clamp-3">
            {course.description || ""}
          </div>
        </div>

        {/* BUTTONS */}
        <div className="mt-4 flex gap-2">

          <button
            onClick={() => onOpen(course)}
            className="flex-1 px-3 py-2 text-sm font-semibold bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition"
          >
            Materi
          </button>

          <button
            onClick={() => onDelete(course.id)} 
            className="px-3 py-2 text-sm font-semibold bg-red-500 text-white rounded-md hover:bg-red-600 transition"
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}
