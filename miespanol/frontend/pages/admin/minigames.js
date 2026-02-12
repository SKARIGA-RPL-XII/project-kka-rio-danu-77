// frontend/pages/admin/minigames.js
import { useEffect, useState } from 'react';
import { apiBase, getToken } from '../../utils/api';

export default function AdminMinigames() {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const token = getToken();

  useEffect(()=> { fetchList(); }, []);

  async function fetchList() {
    const r = await fetch(`${apiBase()}/admin/minigames`, { headers: { Authorization: 'Bearer '+token } });
    const j = await r.json();
    if (r.ok) setItems(j.minigames || []);
  }

  async function create() {
    if (!title) return alert('masukkan judul');
    const r = await fetch(`${apiBase()}/admin/minigames`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer '+token },
      body: JSON.stringify({ title, description: desc, config: {}, points_reward: 10, difficulty: 1 })
    });
    const j = await r.json();
    if (r.ok) {
      setTitle(''); setDesc('');
      fetchList();
    } else alert(j.error || 'gagal');
  }

  async function remove(id) {
    if (!confirm('Hapus?')) return;
    const r = await fetch(`${apiBase()}/admin/minigames/${id}`, { method: 'DELETE', headers: { Authorization: 'Bearer '+token } });
    if (r.ok) fetchList();
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Minigames</h2>
      <div className="mb-4 flex gap-2">
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Judul" className="px-3 py-2 rounded border" />
        <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Deskripsi" className="px-3 py-2 rounded border" />
        <button onClick={create} className="bg-orange-400 text-white px-4 py-2 rounded">Buat</button>
      </div>

      <div className="space-y-3">
        {items.map(it => (
          <div key={it.id} className="bg-white p-3 rounded shadow flex justify-between items-center">
            <div>
              <div className="font-bold">{it.title}</div>
              <div className="text-sm text-gray-500">{it.description}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>remove(it.id)} className="text-red-600">Hapus</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
