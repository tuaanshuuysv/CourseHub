# CourseHub Frontend — Giao Diện Người Dùng React & Vite

Phân hệ giao diện người dùng (Frontend) của hệ thống đào tạo trực tuyến **CourseHub**, được xây dựng bằng **React 19**, **Vite 6**, **React Router DOM v6** và **ApexCharts**.

---

## 1. Công nghệ & Kiến trúc Giao diện

- **React 19 & Vite 6:** Tốc độ khởi tạo nhanh, hỗ trợ Hot Module Replacement (HMR) và proxy trực tiếp các yêu cầu `/api`, `/media` sang máy chủ Express (`http://localhost:5000`).
- **Hệ thống Design Tokens (`src/styles/theme.css`):**
  - Tông màu chủ đạo: **Forest Teal (`#0f766e`)**, điểm nhấn **Terracotta Coral (`#ea580c`)**, nền **Warm Alabaster (`#f5f6f3`)** và chữ **Charcoal Obsidian (`#18181b`)**.
  - Typography: Kết hợp font **Outfit** (tiêu đề) và **Be Vietnam Pro** (hiển thị tiếng Việt rõ nét).
  - Phong cách bố cục: **Bento Grid** hiện đại, tách biệt rõ giao diện của 4 vai trò (`Guest`, `Student`, `Educator`, `Admin`).
- **Trực quan hóa dữ liệu:** Sử dụng `apexcharts` và `react-apexcharts` cho biểu đồ hoạt động học tập hàng tuần và biểu đồ doanh thu 12 tháng.

---

## 2. Cấu trúc thư mục

```text
frontend/
├── public/
│   ├── favicon.ico
│   └── logo.svg             #Logo vector chinh thuc cua CourseHub
├── src/
│   ├── api/
│   │   └── client.js        #Lop goi HTTP request kem JWT token va cookie
│   ├── assets/              #Tai nguyen anh khoa hoc, avatar va video mau
│   ├── components/
│   │   └── CourseHubBrand.jsx
│   ├── context/             #Context quan ly phien dang nhap va du lieu
│   ├── layouts/             #PublicLayout va WorkspaceLayout
│   ├── pages/               #32 man hinh chia theo guest, student, educator, admin
│   ├── styles/
│   │   └── theme.css        #Design tokens va he thong class CSS ch-*
│   ├── App.jsx              #Cau hinh dinh tuyen gốc
│   └── main.jsx             #Diem gan ket React DOM
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## 3. Hướng dẫn cài đặt và chạy

1. Di chuyển vào thư mục `frontend`:
   ```bash
   cd frontend
   ```
2. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```
3. Khởi chạy máy chủ phát triển Vite:
   ```bash
   npm run dev
   ```
4. Đóng gói bản build production:
   ```bash
   npm run build
   ```
