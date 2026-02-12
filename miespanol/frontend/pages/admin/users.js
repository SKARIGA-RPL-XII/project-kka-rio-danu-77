// frontend/pages/admin/users.js
import { useEffect, useState } from "react";
import Sidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/admin/AdminTopbar";
import { apiBase, getToken } from "../../utils/api";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null); // user object shown in modal
  const [busy, setBusy] = useState(false);
  const token = getToken();

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase()}/admin/users`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Gagal memuat data users");
      const j = await res.json();
      setUsers(j.users || []);
    } catch (err) {
      console.error("fetchUsers:", err);
      alert("Gagal mengambil data user. Cek backend.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = users.filter((u) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (u.name || "").toLowerCase().includes(s) || (u.email || "").toLowerCase().includes(s);
  });

  function openUser(u) {
    setSelected(u);
  }
  function closeModal() {
    setSelected(null);
  }

  async function toggleRole(user) {
    if (!confirm(`Ubah role ${user.name} (${user.email}) menjadi ${user.role === "admin" ? "user" : "admin"}?`)) return;
    setBusy(true);
    try {
      const newRole = user.role === "admin" ? "user" : "admin";
      const res = await fetch(`${apiBase()}/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal update role");
      }
      // update local list
      setUsers((prev) => prev.map((p) => (p.id === user.id ? { ...p, role: newRole } : p)));
      setSelected((s) => (s && s.id === user.id ? { ...s, role: newRole } : s));
    } catch (err) {
      console.error("toggleRole:", err);
      alert(err.message || "Gagal mengubah role. Pastikan backend punya endpoint PUT /api/admin/users/:id");
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(user) {
    if (!confirm(`Hapus user ${user.name} (${user.email}) — aksi ini tidak bisa dibatalkan?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`${apiBase()}/admin/users/${user.id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal hapus user");
      }
      // remove locally
      setUsers((prev) => prev.filter((p) => p.id !== user.id));
      closeModal();
    } catch (err) {
      console.error("deleteUser:", err);
      alert(err.message || "Gagal hapus user. Pastikan backend punya endpoint DELETE /api/admin/users/:id");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-[#f6f6f6]">
      <Sidebar />
      <div className="flex-1 p-8 max-h-screen overflow-auto">
        <Topbar />

        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Data User</h2>
              <div className="text-sm text-gray-500">Daftar akun pengguna terdaftar</div>
            </div>

            <div className="flex items-center gap-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari nama atau email..."
                className="px-3 py-2 border rounded-md w-72"
              />
              <button onClick={fetchUsers} className="px-3 py-2 bg-white rounded-md shadow">Refresh</button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full">
              <thead className="text-sm text-gray-500 bg-gray-50">
                <tr>
                  <th className="py-3 px-4 text-left">ID</th>
                  <th className="py-3 px-4 text-left">Nama</th>
                  <th className="py-3 px-4 text-left">Email</th>
                  <th className="py-3 px-4 text-left">Role</th>
                  <th className="py-3 px-4 text-left">Terdaftar</th>
                  <th className="py-3 px-4 text-left">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="p-6 text-center text-gray-500">Memuat…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="6" className="p-6 text-center text-gray-500">Tidak ada user</td></tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u.id} className="border-t hover:bg-gray-50">
                      <td className="py-3 px-4 align-top">{u.id}</td>
                      <td className="py-3 px-4 align-top">{u.name}</td>
                      <td className="py-3 px-4 align-top">{u.email}</td>
                      <td className="py-3 px-4 align-top">
                        <span className={`text-xs px-2 py-1 rounded ${u.role === "admin" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-700"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-top text-sm text-gray-500">{new Date(u.created_at).toLocaleString()}</td>
                      <td className="py-3 px-4 align-top">
                        <div className="flex gap-2">
                          <button onClick={() => openUser(u)} className="px-3 py-1 rounded bg-blue-500 text-white text-sm">Lihat</button>
                          <button onClick={() => toggleRole(u)} className="px-3 py-1 rounded bg-amber-400 text-black text-sm">
                            {u.role === "admin" ? "Jadikan User" : "Jadikan Admin"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: view user */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold">{selected.name}</h3>
                <div className="text-sm text-gray-500">{selected.email}</div>
              </div>
              <button onClick={closeModal} className="text-gray-500">✕</button>
            </div>

            <div className="mt-4 text-sm text-gray-700 space-y-2">
              <div><strong>ID:</strong> {selected.id}</div>
              <div><strong>Role:</strong> <span className={`px-2 py-0.5 rounded ${selected.role === 'admin' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>{selected.role}</span></div>
              <div><strong>Terdaftar:</strong> {new Date(selected.created_at).toLocaleString()}</div>
              {selected.updated_at && <div><strong>Terakhir update:</strong> {new Date(selected.updated_at).toLocaleString()}</div>}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => toggleRole(selected)} disabled={busy} className="px-3 py-2 rounded bg-amber-400 text-black">
                {selected.role === "admin" ? "Turunkan ke user" : "Promosikan jadi admin"}
              </button>

              <button onClick={() => deleteUser(selected)} disabled={busy} className="px-3 py-2 rounded bg-red-500 text-white">Hapus</button>

              <button onClick={closeModal} className="px-3 py-2 rounded bg-gray-200">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
