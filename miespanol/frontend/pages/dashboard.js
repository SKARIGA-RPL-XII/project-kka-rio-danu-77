import { useEffect, useState } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import CourseCardAdmin from "@/components/admin/CourseCardAdmin";

export default function AdminDashboard() {
  const [courses, setCourses] = useState([]);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("miespanol_token")
      : "";

  useEffect(() => {
    fetch("http://localhost:5000/api/admin/courses", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then(setCourses);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />

      <main className="flex-1 p-10">
        <h1 className="text-3xl font-extrabold mb-6">Dashboard</h1>

        <div className="grid grid-cols-4 gap-6">
          {courses.map((course) => (
            <CourseCardAdmin key={course.id} course={course} />
          ))}
        </div>
      </main>
    </div>
  );
}
