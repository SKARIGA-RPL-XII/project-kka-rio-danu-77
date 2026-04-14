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
  onDelete = () => {},
}) {
  const imgSrc = buildImageSrc(apiRoot, course.thumbnail_url);

  return (
    <div className="overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:shadow-md">
      <div className="h-44 w-full bg-gray-100 overflow-hidden">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={course.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            No image
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="mb-1 line-clamp-1 text-lg font-bold text-gray-900">
            {course.title}
          </div>

          <div className="mb-2 text-xs text-gray-500">
            {course.category || "Pembelajaran"}
          </div>

          <div className="line-clamp-3 text-sm text-gray-700">
            {course.description || ""}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onOpen(course)}
            className="flex-1 rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            Kelola Materi
          </button>

          <button
            onClick={() => onDelete(course.id)}
            className="rounded-xl bg-rose-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}