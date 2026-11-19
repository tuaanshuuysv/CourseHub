# CourseHub Backend — Express.js & MongoDB REST API

Phân hệ máy chủ (Backend) của hệ thống đào tạo trực tuyến **CourseHub**, xây dựng bằng **Node.js**, **Express.js** và **Mongoose ODM**.

---

## 1. Công nghệ & Thư viện sử dụng

- **Node.js & Express.js (`^4.21.2`):** Xử lý định tuyến HTTP, middleware và RESTful API.
- **MongoDB & Mongoose (`^8.9.5`):** Quản lý mô hình dữ liệu tài liệu (14 collections theo thiết kế ERD).
- **JSON Web Token (`jsonwebtoken`) & `cookie-parser`:** Xác thực phiên người dùng qua `HttpOnly Cookie` và `Bearer Token`.
- **`bcryptjs`:** Băm và kiểm tra mật khẩu an toàn.
- **`cors` & `dotenv`:** Cấu hình chia sẻ tài nguyên liên nguồn và biến môi trường.

---

## 2. Cấu trúc thư mục

```text
backend/
├── src/
│   ├── config/
│   │   └── db.js            #Ket noi MongoDB qua Mongoose
│   ├── middleware/          #Middleware xac thuc JWT va phan quyen RBAC
│   ├── models/              #Dinh nghia 14 Mongoose Schemas
│   ├── routes/              #Cac tuyen API (auth, public, student, instructor, admin)
│   ├── seed/                #Kich ban khoi tao du lieu mau
│   └── server.js            #Khoi tao ung dung Express va lang nghe cong HTTP
├── .env.example             #Tep mau khai bao bien moi truong
├── package.json
└── README.md
```

---

## 3. Hướng dẫn cài đặt và chạy

1. Di chuyển vào thư mục `backend`:
   ```bash
   cd backend
   ```
2. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```
3. Tạo tệp `.env` từ tệp mẫu `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Khởi chạy máy chủ ở chế độ phát triển:
   ```bash
   npm run dev
   ```
   Kiểm tra trạng thái máy chủ tại: `http://localhost:5000/api/health`
