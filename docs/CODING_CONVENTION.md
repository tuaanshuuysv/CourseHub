# Quy Ước Lập Trình (Coding Convention) — Dự Án CourseHub

Tài liệu này quy định các tiêu chuẩn đặt tên, cấu trúc mã nguồn, quy tắc viết chú thích (comment) và quy trình quản lý phiên bản Git áp dụng thống nhất trên toàn bộ dự án **CourseHub (MERN Stack)**.

---

## 1. Quy tắc viết chú thích (Comment) trong mã nguồn

- **Bắt buộc sử dụng tiếng Việt không dấu** cho toàn bộ comment bên trong các tệp mã nguồn (`.js`, `.jsx`, `.css`).
- Không viết comment dư thừa giải thích lại cú pháp hiển nhiên; tập trung giải thích **mục đích nghiệp vụ**, **mã Use Case** (ví dụ `UC-1.1`, `UC-3.4`, `UC-5.6`) hoặc các ràng buộc dữ liệu.
- **Ví dụ đúng:**
  ```js
  // Khoi tao ket noi toi co so du lieu MongoDB
  // UC-3.4: Tinh lai tong tien va kiem tra ma giam gia tren may chu
  ```
- **Ví dụ không hợp lệ:**
  ```js
  // Khởi tạo kết nối tới cơ sở dữ liệu MongoDB (có dấu)
  // Initialize MongoDB connection (tiếng Anh)
  ```

---

## 2. Quy ước đặt tên (Naming Conventions)

| Thành phần | Quy tắc | Ví dụ |
|---|---|---|
| **Biến & Hàm (JS/JSX)** | `camelCase` | `currentUser`, `fetchCourseDetails()`, `isActivated` |
| **Hằng số cấu hình** | `UPPER_SNAKE_CASE` | `JWT_SECRET`, `DEFAULT_PAGE_LIMIT` |
| **React Component & File** | `PascalCase` | `CourseCard.jsx`, `PublicLayout.jsx`, `StudentDashboardPage.jsx` |
| **Mongoose Model & File** | `PascalCase` (số ít) | `Course.js`, `CourseProgress.js`, `LearningStreak.js` |
| **Route & Utility File** | `camelCase` | `authRoutes.js`, `publicRoutes.js`, `db.js`, `client.js` |
| **Class CSS (Design System)** | Tiền tố `ch-` theo chuẩn BEM | `.ch-card`, `.ch-btn--primary`, `.ch-course-card__title` |
| **API Endpoint URL** | `kebab-case` (danh từ số nhiều) | `/api/courses`, `/api/admin/instructor-requests` |

---

## 3. Quy tắc kiến trúc Backend (Node.js + Express + MongoDB)

1. **Tổ chức theo tầng rõ ràng:**
   - `src/config/`: Quản lý kết nối hạ tầng (`db.js`).
   - `src/models/`: Định nghĩa Mongoose Schema bám sát đặc tả ERD của tài liệu kỹ thuật.
   - `src/middleware/`: Xác thực JWT (`authenticate`, `optionalAuth`) và phân quyền theo vai trò (`requireRole`).
   - `src/routes/`: Xử lý định tuyến và nghiệp vụ cho từng phân hệ (`authRoutes`, `publicRoutes`, `studentRoutes`, `instructorRoutes`, `adminRoutes`).
2. **Định dạng phản hồi JSON thống nhất:**
   - Thành công (`200`, `201`): Trả về đối tượng JSON chứa dữ liệu và trường `message` rõ ràng.
   - Lỗi (`400`, `401`, `403`, `404`, `409`, `500`): Luôn trả về `{ message: '...' }` để Frontend hiển thị thông báo đồng nhất.
3. **Bảo mật:**
   - Mật khẩu luôn được băm bằng `bcryptjs` trước khi lưu xuống MongoDB.
   - Token xác thực JWT được đính kèm qua `HttpOnly Cookie` kết hợp hỗ trợ `Authorization: Bearer <token>`.
   - Mọi phép tính tiền thanh toán, kiểm tra mã giảm giá (`Coupon`) và chấm điểm trắc nghiệm (`Quiz`) phải thực hiện tại máy chủ.

---

## 4. Quy tắc kiến trúc Frontend (React + Vite)

1. **Tách biệt giao diện và trạng thái:**
   - Mọi lời gọi HTTP đi qua lớp `src/api/client.js`.
   - Trạng thái phiên đăng nhập, danh mục, giỏ hàng và danh sách yêu thích dùng chung được quản lý tại `src/context/CourseHubContext.jsx`.
2. **Hệ thống giao diện (Design Tokens):**
   - Sử dụng các biến CSS trong `src/styles/theme.css` (`--bg-canvas`, `--teal`, `--coral`, `--ink`, `--border`) để đảm bảo tính nhất quán trên cả 32 màn hình.
3. **Tái sử dụng Layout:**
   - `PublicLayout`: Dùng cho các màn hình phía khách (`Guest`).
   - `WorkspaceLayout`: Dùng chung cho `Student`, `Educator` và `Admin` thông qua prop `variant`.

---

## 5. Quy ước Git & Lịch sử Commit (Conventional Commits)

Mỗi commit phải đại diện cho một đơn vị công việc hoàn chỉnh và tuân theo mẫu:

```text
<loại>(<phạm-vi>): <mô tả ngắn gọn bằng tiếng Anh>
```

- `chore`: Khởi tạo dự án, cấu hình công cụ, cập nhật dependencies hoặc dữ liệu mẫu (`seed`).
- `feat`: Bổ sung tính năng mới ở Backend (`db`, `auth`, `api`, `student`, `instructor`, `admin`) hoặc Frontend (`ui`).
- `fix`: Sửa lỗi logic hoặc giao diện.
- `docs`: Cập nhật tài liệu `README.md` hoặc `docs/`.
