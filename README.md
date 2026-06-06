# BANTRASUA

Website bán trà sữa theo database `qltrasua`.

## Công nghệ

- Frontend: ReactJS, build bằng Vite, file tĩnh xuất vào `src/public/react`
- Backend: NodeJS + Express
- Database: MySQL, schema và seed ở `src/config/database.sql`

## Cách chạy

1. Cài package:

```bash
npm install
```

2. Tạo database từ file seed:

```bash
mysql -u root -p < src/config/database.sql
```

3. Mở file `.env`, sửa `DB_USER` và `DB_PASSWORD` theo MySQL của bạn.

4. Build frontend React:

```bash
npm run build
```

5. Chạy Express:

```bash
npm run dev
```

Mở `http://localhost:3000`.

## Tài khoản mẫu

- Admin: `admin` / `admin123`
- Client: `client` / `client123`

## Chức năng chính

- Client: xem trang chủ, menu, danh mục, sản phẩm, giỏ hàng, áp mã giảm giá, checkout, đơn hàng, hội viên, tin tức, cửa hàng, chat tư vấn.
- Admin: tổng quan, CRUD toàn bộ bảng theo database, sản phẩm, danh mục, đơn hàng, giao hàng, thanh toán, tài xế, khuyến mãi, hội viên, mã quà, người dùng, chat, nhật ký, nhà cung cấp, nguyên liệu, công thức, nhập hàng.
