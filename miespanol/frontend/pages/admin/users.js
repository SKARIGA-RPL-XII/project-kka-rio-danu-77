import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/admin/AdminSidebar";
import Topbar from "../../components/admin/AdminTopbar";

const API_ROOT = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/+$/, "");

function getAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("miespanol_token");
}

function normalizeUsersPayload(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.users)) return data.users;
  if (data && Array.isArray(data.rows)) return data.rows;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString("id-ID");
  }
}

export default function AdminUsersPage() {
  const token = useMemo(() => getAuthToken(), []);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch(`${API_ROOT}/api/admin/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("miespanol_token");
          localStorage.removeItem("miespanol_user");
          window.location.href = "/login";
        }
        return;
      }

      const data = await res.json().catch(() => null);
      setUsers(normalizeUsersPayload(data));
    } catch (err) {
      console.error("fetchUsers error:", err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;

    return (
      String(u.name || u.username || "").toLowerCase().includes(q) ||
      String(u.email || "").toLowerCase().includes(q) ||
      String(u.role || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen flex bg-[#f6f6f6]">
      <Sidebar />

      <div className="flex-1 p-8 overflow-auto max-h-screen">
        <Topbar />

        <div className="mx-auto max-w-6xl space-y-6">
          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Data Users</h1>
                <p className="text-sm text-gray-500">
                  Daftar semua user yang terdaftar.
                </p>
              </div>

              <div className="w-full max-w-sm">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari user..."
                  className="w-full rounded-2xl border px-4 py-2.5"
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Daftar User</h2>
              <div className="text-sm text-gray-500">{filteredUsers.length} user</div>
            </div>

            {loading ? (
              <div>Memuat…</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-sm text-gray-500">Belum ada user.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-600">
                      <th className="py-3 pr-4">Nama</th>
                      <th className="py-3 pr-4">Email</th>
                      <th className="py-3 pr-4">Role</th>
                      <th className="py-3 pr-4">Waktu Terdaftar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium text-gray-900">
                          {u.name || u.username || "-"}
                        </td>
                        <td className="py-3 pr-4 text-gray-700">{u.email || "-"}</td>
                        <td className="py-3 pr-4">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                            {u.role || "user"}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-gray-500">
                          {formatDateTime(u.created_at || u.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}