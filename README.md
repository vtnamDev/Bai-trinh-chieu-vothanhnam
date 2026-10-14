# BioSphere Slides — Không gian thuyết trình

Website workspace mobile-first dành cho các bài thuyết trình khoa học ở trường học.

## Công nghệ và cấu trúc
- `index.html` — cấu trúc ứng dụng, thư viện, mẫu và giao diện trình chiếu.
- `styles.css` — thiết kế responsive, màu sắc, hiệu ứng và chế độ trình chiếu.
- `app.js` — tìm kiếm/lọc, tạo bản nháp, nhập/xuất JSON, điều hướng slide, theme và cài đặt.
- `assets/mark.svg` — biểu tượng BioSphere.
- `vercel.json` — cấu hình hosting tĩnh.

## Chức năng bản xem trước
- Thư viện bài thuyết trình, tìm kiếm và lọc theo môn/trạng thái.
- Tạo khung bài thuyết trình cục bộ.
- Trình chiếu toàn màn hình trên trình duyệt hỗ trợ: chạm/nhấn bên phải để đi tới, bên trái để quay lại, nút điều khiển và phím mũi tên.
- Nhập/xuất bài ở định dạng JSON.
- Chủ đề sáng/tối, giảm chuyển động và layout ưu tiên điện thoại.

## Giới hạn bảo vệ và lưu trữ
Bản hiện tại là frontend prototype. Bản nháp được lưu bằng `localStorage` trên trình duyệt/thiết bị hiện tại, không tự đồng bộ sang thiết bị khác. Hộp thoại chia sẻ hiện chưa phải hệ thống xuất bản an toàn. Cần backend, cơ sở dữ liệu và xác thực phía máy chủ trước khi dùng mật khẩu bảo vệ nội dung hoặc gửi bài riêng tư cho giáo viên.

Khung cho KHTN 8, Tập 1, Bài 32, mục V–VI cố tình chưa điền kiến thức bệnh học cho đến khi sách giáo khoa và yêu cầu cụ thể của giáo viên được cung cấp và đối chiếu.

## Deploy
Repository này được liên kết với Vercel. Commit mới trên nhánh `main` sẽ kích hoạt triển khai tự động.

- Website: https://bai-trinh-chieu-vothanhnam.vercel.app/
- GitHub: https://github.com/vtnamDev/Bai-trinh-chieu-vothanhnam
- Vercel: https://vercel.com/tnam-dev/bai-trinh-chieu-vothanhnam
