# Tin Tức HaUI — Website đọc tin tức có khu quản trị

**Phiên bản:** 1.0.0 (bản đồ án chạy local).  
**Công nghệ:** Node.js 20+, Express 5, EJS, Sequelize 6, MySQL 8.

## 1. Yêu cầu môi trường

- Windows 10/11 hoặc hệ điều hành có Node.js 20+ và npm.
- MySQL 8 (có thể dùng MySQL Workbench).
- Trình duyệt hiện đại.
- Internet trong lần đầu cài package bằng npm.

Kiểm tra Node.js bằng lệnh `node -v` (cần từ v20 trở lên). Nếu báo `not recognized`, tải bản LTS tại https://nodejs.org, cài xong thì mở lại CMD.

> **Lưu ý:** gói dự án **chưa có thư mục `node_modules`** (rất nặng nên không đưa vào file nén). Thư mục này tự sinh ra khi chạy `npm install` lần đầu; phải chạy lệnh đó trước khi dùng bất kỳ lệnh `npm run ...` nào.

## 2. Cài đặt trên máy mới

Dự án dùng `db/schema.sql` để tạo cấu trúc **6 bảng nghiệp vụ** và `scripts/seed.js` để nạp dữ liệu mẫu (tài khoản, chuyên mục, 12 bài đã xuất bản, vài bài ở các trạng thái khác và bình luận).

> **Quan trọng:** `schema.sql` chỉ dùng `CREATE ... IF NOT EXISTS` nên không xóa dữ liệu cũ, nhưng nên chạy trên database `bantin30` mới. Lệnh `npm run seed` chỉ nạp bài viết mẫu khi bảng `articles` còn trống.

### Bước 1. Clone hoặc giải nén dự án và cài package

Mở CMD/Terminal tại thư mục gốc `Nhom30_PTDA`, rồi chạy:

```cmd
npm install
```

Chờ đến khi xong và thấy thư mục `node_modules` xuất hiện.

### Bước 2. Cấu hình ứng dụng

**2.1. Tạo file `.env` bằng cách sao chép `.env.example`** (chạy tại thư mục gốc, chọn đúng lệnh cho hệ điều hành):

```cmd
copy .env.example .env
```

Trên macOS/Linux dùng:

```bash
cp .env.example .env
```

**2.2. Mở file `.env` vừa tạo và sửa các dòng sau** (chỉ cần sửa `DB_PASS` thành mật khẩu MySQL của bạn; nếu dùng tài khoản MySQL khác `root` thì sửa thêm `DB_USER`):

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=bantin30
DB_USER=root
DB_PASS=mat_khau_mysql_cua_ban
```

**2.3. Đặt `SESSION_SECRET`** thành một chuỗi ngẫu nhiên từ 32 ký tự. Có thể sinh nhanh bằng lệnh:

```cmd
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Chép chuỗi in ra dán vào dòng `SESSION_SECRET=...` trong `.env`. Không commit `.env` lên GitHub.

**2.4.** Muốn đổi mật khẩu tài khoản quản lý mẫu, sửa `ADMIN_EMAIL` / `ADMIN_PASSWORD` trong `.env` **trước** khi chạy seed.

### Bước 3. Tạo database và các bảng

Chọn **một** trong ba cách.

**Cách A — Lệnh npm (đơn giản nhất)**

Cách này đọc thông tin MySQL trong `.env` đã cấu hình ở Bước 2. Chạy:

```cmd
npm run db:init
```

**Cách B — MySQL Workbench**

1. Mở tab SQL mới.
2. Mở file `db/schema.sql` trong thư mục dự án (File → Open SQL Script).
3. Nhấn **Execute** (biểu tượng tia sét). File tự tạo database `bantin30` và các bảng.

**Cách C — CMD**

Chạy tại thư mục gốc dự án (MySQL client `mysql` phải có trong PATH):

```cmd
mysql -u root -p < db/schema.sql
```

Nếu dùng tài khoản MySQL khác `root`, thay `root` bằng username tương ứng.

### Bước 4. Nạp dữ liệu mẫu và chạy ứng dụng

```cmd
npm run seed
npm run dev
```

Mở trình duyệt tại **http://localhost:5000**.

Muốn đổi cổng, sửa `PORT` và `APP_URL` trong `.env`.

Có thể gộp Bước 3 (Cách A) và nạp dữ liệu bằng một lệnh: `npm run setup`.

## 3. Tài khoản demo

| Vai trò | Tài khoản | Mật khẩu |
|---|---|---|
| Quản lý (admin) | `quanly@bantin30.vn` | `123456` (hoặc giá trị `ADMIN_PASSWORD` trong `.env`) |
| Biên tập viên mẫu | `bientap@bantin30.vn` | In ra ở cuối lệnh `npm run seed` (ngẫu nhiên mỗi lần seed đầu tiên) |
| Biên tập viên mới | Tự đăng ký tại `/auth?mode=register` | Do người đăng ký đặt |
| Độc giả | Không cần tài khoản | — |

Nút **Đăng nhập** nằm ở góc phải trên cùng. Sau khi đăng nhập, hệ thống chuyển thẳng vào màn hình quản trị.

## 4. Phân quyền và vòng đời bài viết

- **Quản lý:** duyệt/từ chối, xuất bản, chuyên mục, bình luận, thống kê, tài khoản, phân quyền — **không viết bài**.
- **Biên tập viên:** luôn có quyền viết bài; quản lý cấp thêm quyền (duyệt, xuất bản, chuyên mục, bình luận, thống kê, tài khoản) tại mục **Phân quyền**. Mặc định seed chỉ cấp thêm quyền duyệt bình luận.
- Không ai tự duyệt bài của chính mình; không xóa hoặc hạ quản lý cuối cùng; không xóa chuyên mục còn bài; không xóa tài khoản còn bài (chỉ khóa).
- Vòng đời bài: `Nháp → Chờ duyệt → (Bị từ chối → sửa → gửi lại) | Đã duyệt → Đã xuất bản | Đã lên lịch → (đến giờ) Đã xuất bản`. Gỡ bài hoặc hủy lịch đưa bài về **Đã duyệt**.
- Bài hẹn giờ được chuyển trạng thái mỗi phút bởi `node-cron` (và khi có người mở trang).
- Bình luận của độc giả luôn ở trạng thái **chờ duyệt** cho đến khi được duyệt.

### Ánh xạ User Story

| US | Chức năng | Đường dẫn |
|---|---|---|
| 0101 | Đăng nhập | `/auth` |
| 0201–0204 | Danh sách / thêm / sửa / xóa tài khoản | `/quan-tri/tai-khoan` |
| 0301 | Phân quyền | `/quan-tri/phan-quyen` |
| 0401–0402 | Tạo / sửa bài | `/quan-tri/bai-viet/moi`, `/quan-tri/bai-viet/:id/sua` |
| 0501–0505 | Gửi duyệt, xem chờ duyệt, duyệt, từ chối, xem trạng thái | `/quan-tri/bai-viet?view=…` |
| 0601–0602 | Xuất bản, hẹn giờ | `/quan-tri/bai-viet/:id` |
| 0701–0703 | Thêm / sửa / xóa chuyên mục | `/quan-tri/chuyen-muc` |
| 0801–0803 | Thống kê theo thời gian, theo bài, top xem nhiều | `/quan-tri/thong-ke` |
| 0901–0902 | Duyệt / xóa bình luận | `/quan-tri/binh-luan` |

## 5. Dữ liệu và cấu trúc thư mục

- `db/schema.sql`: cấu trúc 6 bảng nghiệp vụ (`users`, `role_permissions`, `categories`, `articles`, `comments`, `article_daily_views`).
- `scripts/init-db.js`: chạy `schema.sql` qua Node (không cần MySQL client).
- `scripts/seed.js`: tạo dữ liệu mẫu; có thể chạy lại nhiều lần mà không nhân đôi dữ liệu.
- `data/sample-articles.json`: 12 bài mẫu dùng cho seed. Ngày đăng được dịch để bài mới nhất là hôm qua, giúp biểu đồ thống kê có dữ liệu.
- `app_sessions` là bảng kỹ thuật do session store tự tạo khi ứng dụng chạy; không nằm trong `schema.sql`.
- Ảnh minh họa của bài là ảnh SVG tự vẽ theo chuyên mục (`backend/utils/cover.js`), chưa có chức năng tải ảnh lên.
- Nội dung bài là văn bản thuần; cách nhau một dòng trống để tách đoạn.

```
Nhom30_PTDA/
├─ backend/   app.js, server.js, config/, models/, routes/, controllers/, services/, middlewares/, utils/, jobs/
├─ frontend/  views/ (EJS), public/ (css, js)
├─ db/        schema.sql
├─ scripts/   init-db.js, seed.js, check-source.js
├─ tests/     *.test.js
└─ data/      sample-articles.json
```

## 6. Làm lại database từ đầu

Chỉ làm khi chấp nhận mất toàn bộ dữ liệu của database phát triển:

```sql
DROP DATABASE Nhom30_PTDA;
```

Sau đó chạy lại Bước 3 (tạo database) và `npm run seed`.

## 7. Kiểm thử

```cmd
npm run check:source
npm test
```

- `check:source` kiểm tra cú pháp mọi file `.js` và biên dịch mọi template `.ejs` (cần đã chạy `npm install`).
- `npm test` chạy 21 test cho quy tắc nghiệp vụ (phân quyền, vòng đời bài viết, chuyên mục, bình luận, tài khoản, thống kê, ảnh minh họa) và việc dựng toàn bộ giao diện. Các test này dùng dữ liệu giả trong bộ nhớ nên **không cần MySQL**.
- Dự án chưa có integration test chạy qua HTTP + MySQL. Phần kết nối MySQL, Sequelize, session và routes cần được kiểm tra bằng cách chạy ứng dụng trên máy của bạn theo Bước 1–4; nếu gặp lỗi, ghi lại thông báo trong terminal để sửa.

## 8. Lưu ý phạm vi đồ án và bảo mật

- Đây là bản đồ án chạy localhost với dữ liệu giả lập, không phải sản phẩm đã triển khai công khai.
- Không dùng tài khoản/mật khẩu demo trên môi trường thật hoặc mở ứng dụng ra Internet.
- Chính sách bảo mật (helmet CSP) chỉ cho phép script cùng nguồn nên không viết JavaScript inline trong template; xác nhận xóa nằm ở `frontend/public/js/site.js`.
- Mỗi phiên chỉ tính một lượt xem cho mỗi bài.
- Dependency có thể phát sinh cảnh báo bảo mật theo thời gian; cần kiểm tra và cập nhật có kiểm soát trước khi triển khai production.
