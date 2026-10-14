# BioSphere Slides — Bài 32 KHTN 8

Website trình chiếu khoa học tối ưu cho màn hình điện thoại và máy tính. Bài mẫu hiện có 32 trang về **5 bệnh thường gặp liên quan đến đường tiêu hóa** theo chủ đề “Dinh dưỡng và tiêu hóa ở người” — SGK Khoa học Tự nhiên 8, tập 1, Bài 32.

## Cấu trúc
- `index.html` — thư viện bài trình chiếu, mẫu, thiết lập và khung trình chiếu.
- `styles.css` — giao diện responsive nhiều bảng màu, bố cục ảnh editorial, hiệu ứng chiều sâu và chuyển động.
- `app.js` — thư viện, tìm kiếm, nhập/xuất JSON, điều hướng slide, chia sẻ link, toàn màn hình.
- `bai32-deck.js` — nội dung 20 trang, URL ảnh thực riêng cho từng slide, chú thích/nguồn ảnh và liên kết tham khảo.
- `assets/mark.svg` — biểu tượng BioSphere.
- `vercel.json` — cấu hình hosting tĩnh.

## Video nền trực tuyến
- Slide sử dụng video MP4 nền thật từ Pexels và Mixkit, chọn theo chủ đề (rau củ/nấu ăn, nha khoa, tư vấn y tế, hoạt hình y khoa). Video lặp im lặng, có ảnh poster để hiển thị ngay trong khi video tải.
- Pexels có bản master 3840×2160 cho năm cảnh gồm rửa rau, chuẩn bị thực phẩm và khám răng; website chỉ chọn master 4K trên màn hình lớn và đường truyền phù hợp. Trên điện thoại, website dùng bản 1080p/720p để tránh tải tệp 25 MB+ và giảm nhiệt/pin. Video chỉ tải cho slide đang xem; khi ẩn tab hoặc tắt chuyển động, video dừng.
- Các video dẫn về trang nguồn để ghi công. Pexels và Mixkit có điều kiện sử dụng riêng; kiểm tra giấy phép của từng video trước khi tái sử dụng ngoài mục đích bài thuyết trình học tập.

## Chuyển cảnh và hỏi đáp
- Chuyển trang theo hướng tiến/lùi với bốn preset CSS riêng: wipe, depth, focus và rise; tiêu đề, phần mô tả, từng ý chính và ảnh có nhịp xuất hiện riêng.
- Trong quiz, bấm một đáp án là nhận phản hồi đúng/sai và lời giải thích ngay trên slide. Không có nút “hiện đáp án” hoặc nút “câu tiếp theo” lớn; chạm vùng slide hoặc phím mũi tên để chuyển sang câu kế tiếp.
- Âm báo đúng/sai và chuyển slide có thể bật/tắt; chế độ giảm chuyển động vẫn được tôn trọng.

## Hình ảnh và thiết kế
- Mỗi trang trong bài Bài 32 có một URL ảnh thực riêng (32 trang có ảnh minh họa và nguồn ghi kèm), mô tả thay thế, ghi nguồn và liên kết mở nguồn; một số trang có thêm thẻ ảnh phụ.
- Ảnh được tải trực tiếp từ nguồn trực tuyến khi mở trang. Nguồn sử dụng gồm Wikimedia Commons (sơ đồ giải phẫu/ảnh y khoa có giấy phép ghi trên trang file), Unsplash, Pexels và một số nguồn y tế/giáo dục như WHO. Ví dụ: [sơ đồ hệ tiêu hóa trên Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Digestive_system_diagram_en.svg), [ảnh răng sâu trên Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Dental_Caries_Cavity_1.JPG), [ảnh nội soi ổ loét dạ dày](https://commons.wikimedia.org/wiki/File:Gastric_Ulcer_Antrum.jpg), [ảnh trẻ chải răng trên Pexels](https://www.pexels.com/photo/a-kid-brushing-her-teeth-7979784/).
- Vì ảnh tải trực tiếp từ máy chủ nguồn, thiết bị cần Internet; chất lượng/tốc độ có thể thay đổi theo nguồn ảnh. Trình chiếu sẽ thử dùng ảnh dự phòng nếu một URL không tải được.

## Cách trình chiếu
- Mở bài Bài 32 trong thư viện rồi chọn **Trình chiếu**.
- Bấm nửa phải để đi tiếp, nửa trái để quay lại; có thể dùng phím mũi tên trên bàn phím.
- Trang 19 có bài kiểm tra tương tác 5 câu; chọn đáp án để xem phản hồi đúng/sai, lời giải thích và điểm tổng kết. Nút `♫` bật/tắt âm thanh phản hồi; hiệu ứng âm thanh được tạo trong trình duyệt.
- Bật **Toàn màn hình** khi thuyết trình trên máy tính hoặc trình duyệt hỗ trợ.
- Chỉnh các dòng `[Điền họ tên]` và phân công thành viên trong `bai32-deck.js` trước khi thuyết trình.

## Nội dung khoa học
- Nền tảng theo SGK KHTN 8, Bài 32, trang in 128–134.
- Bài 32 trình bày cụ thể sâu răng, viêm loét dạ dày–tá tràng; đề cập tiêu chảy du lịch và an toàn vệ sinh thực phẩm.
- Táo bón và một số chi tiết y tế được bổ sung, phân biệt rõ, từ WHO, CDC và NIDDK.
- Bài mang tính giáo dục sức khỏe, không dùng để tự chẩn đoán hay tự điều trị. Khi có dấu hiệu nặng, cần báo người lớn và đến cơ sở y tế.

## Giới hạn hiện tại
Website là bản tĩnh. Bài Bài 32 đã đóng gói cùng website nên liên kết trình chiếu bài này có thể mở trên thiết bị khác. Các bản nháp/tệp nhập được lưu trong bộ nhớ của trình duyệt hiện tại; chúng chưa đồng bộ qua tài khoản hay cơ sở dữ liệu. Ảnh của bài mẫu được tải từ nguồn trực tuyến, không được chép thành tệp ảnh nội bộ trong repository. Link hiện chưa có bảo vệ bằng mật khẩu. Không đưa thông tin riêng tư của học sinh lên mã nguồn công khai.

## Nguồn tham khảo chính
- SGK Khoa học Tự nhiên 8, tập 1 — Bài 32, trang in 128–134.
- WHO: [Diarrhoeal disease](https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease), [Food safety in Viet Nam](https://www.who.int/vietnam/health-topics/food-safety/food-safety).
- CDC: [About Cavities (Tooth Decay)](https://www.cdc.gov/oral-health/about/cavities-tooth-decay.html).
- NIDDK: [Peptic ulcers](https://www.niddk.nih.gov/health-information/digestive-diseases/peptic-ulcers-stomach-ulcers/symptoms-causes), [Constipation in children](https://www.niddk.nih.gov/health-information/digestive-diseases/constipation-children/symptoms-causes).

## Deploy
GitHub `main` được kết nối với Vercel; thay đổi trên nhánh chính sẽ tạo deployment mới.
