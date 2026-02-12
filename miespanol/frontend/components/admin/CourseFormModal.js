//frontend/components/admin/CourseFormModal.js
import { useState, useEffect } from "react";

export default function CourseFormModal({ open, onClose, onSubmit, initial }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    thumbnail_url: "",
    status: "draft",
  });

  useEffect(() => {
    if (initial) setForm(initial);
  }, [initial]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6">
        <h2 className="text-xl font-bold mb-4">
          {initial ? "Edit Course" : "Tambah Course"}
        </h2>

        <div className="space-y-3">
          <input
            className="w-full border rounded-lg p-2"
            placeholder="Judul Course"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />

          <textarea
            className="w-full border rounded-lg p-2"
            placeholder="Deskripsi"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />

          <input
            className="w-full border rounded-lg p-2"
            placeholder="Kategori"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />

          <input
            className="w-full border rounded-lg p-2"
            placeholder="Thumbnail URL"
            value={form.thumbnail_url}
            onChange={(e) =>
              setForm({ ...form, thumbnail_url: e.target.value })
            }
          />

          <select
            className="w-full border rounded-lg p-2"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200"
          >
            Batal
          </button>

          <button
            onClick={() => onSubmit(form)}
            className="px-4 py-2 rounded-lg bg-orange-500 text-white font-bold"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
