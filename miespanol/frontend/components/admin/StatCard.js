import React from "react";

export default function StatCard({ title, value }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow hover:scale-[1.02] transition">
      <p className="text-sm text-gray-500 mb-2">{title}</p>
      <h2 className="text-3xl font-extrabold text-orange-600">
        {value}
      </h2>
    </div>
  );
}
