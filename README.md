# CourseHub — Hệ Thống Đào Tạo Trực Tuyến (MERN Stack)

> **Đề tài Tiểu luận Chuyên ngành Công nghệ Phần mềm**  
> **Trường:** Đại học Công nghệ Kỹ thuật TP. Hồ Chí Minh (HCMUTE) — Khoa Công nghệ Thông tin  
> **Giảng viên hướng dẫn:** TS. Lê Văn Vinh  
> **Sinh viên thực hiện:** Nguyễn Tuấn Huy — MSSV: `22110334`

---

## 1. Giới thiệu dự án

**CourseHub** là nền tảng quản lý học tập và kinh doanh khóa học trực tuyến (LMS & E-Learning Marketplace) được phát triển trên kiến trúc **MERN Stack** (**M**ongoDB, **E**xpress.js, **R**eact, **N**ode.js). Hệ thống cung cấp môi trường đồng nhất cho 4 nhóm đối tượng sử dụng:

- **Khách (Guest):** Khám phá trang chủ, tìm kiếm/lọc/sắp xếp danh mục khóa học, xem chi tiết chương trình học, học thử các bài giảng miễn phí, đăng ký tài khoản xác thực qua Email OTP và đăng nhập.
- **Học viên (Student):** Quản lý hồ sơ cá nhân, lưu khóa học yêu thích (Wishlist), quản lý giỏ hàng (Cart), áp mã giảm giá (Coupon), thanh toán trực tuyến (VNPay, MoMo, Free), học video bài giảng có lưu tiến độ (`CourseProgress`), làm bài trắc nghiệm cuối bài (`Quiz`), duy trì chuỗi ngày học liên tục (`LearningStreak`), đánh giá khóa học (`Review`) và gửi hồ sơ đăng ký trở thành giảng viên.
- **Giảng viên (Instructor / Educator):** Theo dõi thống kê doanh thu 12 tháng, tạo mới và cập nhật khóa học/chương trình giảng dạy, quản lý và tra cứu danh sách học viên, xem báo cáo thu nhập chi tiết.
- **Quản trị viên (Admin):** Giám sát số liệu toàn hệ thống, phê duyệt hoặc khóa khóa học (`Pending` / `Live` / `Rejected` / `Blocked`), quản lý danh mục khóa học, quản lý mã khuyến mãi (`Coupon`), quản lý trạng thái học viên/giảng viên và xét duyệt yêu cầu trở thành giảng viên.

---

## 2. Cấu trúc thư mục dự án

```text
CourseHub/
├── backend/                 #Ung dung Express.js REST API & Mongoose ODM
│   ├── src/
│   │   ├── config/          #Cau hinh ket noi co so du lieu MongoDB
│   │   ├── middleware/      #Middleware xac thuc JWT va phan quyen RBAC
│   │   ├── models/          #14 Mongoose Schemas theo thiet ke ERD
│   │   ├── routes/          #Cac nhom REST API endpoint theo phan he
│   │   ├── seed/            #Kich ban khoi tao du lieu mau
│   │   └── server.js        #Diem khoi chay may chu Express
│   ├── .env.example         #Mau bien moi truong Backend
│   ├── package.json
│   └── README.md            #Tai lieu huong dan Backend
├── frontend/                #Ung dung giao dien nguoi dung React + Vite
│   ├── public/              #Tai nguyen tinh cong khai (favicon, logo)
│   ├── src/
│   │   ├── api/             #Lop giao tiep HTTP client voi Backend
│   │   ├── assets/          #Hinh anh khoa hoc, avatar va video bai giang
│   │   ├── components/      #Cac thanh phan giao dien dung chung
│   │   ├── context/         #Quan ly trang thai phien dang nhap va du lieu
│   │   ├── layouts/         #Khung bo cuc cho Guest, Student, Educator, Admin
│   │   ├── pages/           #32 man hinh chuc nang theo 4 vai tro
│   │   └── styles/          #He thong Design Tokens va CSS
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── README.md            #Tai lieu huong dan Frontend
├── docs/
│   └── CODING_CONVENTION.md #Quy uoc viet code, comment va quy trinh Git
├── .gitignore
└── README.md
```

---

## 3. Tài liệu thành phần

- [Quy ước lập trình & Quy trình Git (Coding Convention)](./docs/CODING_CONVENTION.md)
- [Tài liệu kỹ thuật Backend (`backend/README.md`)](./backend/README.md)
- [Tài liệu kỹ thuật Frontend (`frontend/README.md`)](./frontend/README.md)
