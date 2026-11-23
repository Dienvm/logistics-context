# Agent viết bài SEO, GEO (Claude Project)

Một Claude Project trên claude.ai giúp đội marketing viết bài blog chuẩn SEO và GEO cho 43 Logistics, AV Logistics và GT Logistics. Người viết chỉ cần đưa mô tả bài, tuyến và công ty. Agent trả về đủ các ô của https://43logistics.vn/admin/posts/new/ (tiêu đề, đường dẫn, tóm tắt, tiêu đề SEO, mô tả SEO, tuyến, chuyên mục, nội dung markdown), danh sách ảnh cần chụp và bản tiếng Anh.

## Thư mục

| File | Dùng làm |
| --- | --- |
| `project-instructions.md` | Dán vào ô **Instructions** của project |
| `knowledge/00-cong-ty.md` | Knowledge: điều được và không được viết về từng công ty (sửa tay, theo `docs/context/01-business.md`) |
| `knowledge/10-huong-dan-seo-geo.md` | Knowledge: định dạng website, cấu trúc bài, SEO, GEO, ảnh |
| `knowledge/11-mau-dau-ra.md` | Knowledge: mẫu trả lời và giới hạn từng ô |
| `knowledge/generated/*.md` | Knowledge xuất từ database: tuyến và đường dẫn, quy định hàng hoá, bài và chuyên mục đã có, thuật ngữ, bảng giá và phụ thu có ngày xuất. **Không sửa tay** |
| `scripts/export-knowledge.mjs` | Tạo lại `knowledge/generated/` |

## Tạo project lần đầu

1. Vào claude.ai → **Projects** → **Create project**, đặt tên "Viết bài SEO GEO – 43 / AV / GT".
2. Mở **Instructions** (Set project instructions), dán toàn bộ `project-instructions.md`.
3. Ở **Project knowledge**, tải lên 8 file: 3 file trong `knowledge/` và 5 file trong `knowledge/generated/`.
4. Chia sẻ project cho đội marketing (gói Team/Enterprise: Share → thêm thành viên).

## Cập nhật knowledge (khi có tuyến mới, quy định hàng hoá mới, hoặc sau mỗi vài bài đăng)

Chạy từ thư mục gốc `logistics-context` (cần file `projects/43logistics.vn/.env` và `pnpm install` trong app):

```bash
node tools/seo-writer/scripts/export-knowledge.mjs
```

Script chỉ đọc database. Sau đó vào project, xoá các file `generated` cũ và tải lên các file mới. **Mỗi lần đổi giá trong admin**, chạy lại script, tải lại `05-bang-gia-theo-tuyen.md`, rồi sửa bảng giá trong các bài đã đăng của tuyến đó (bài ghi ngày cập nhật nên dễ tìm). Khi `docs/context/01-business.md` có thông tin công ty mới được xác nhận, sửa `knowledge/00-cong-ty.md` rồi tải lại.

## Cách dùng (cho đội marketing)

Gõ yêu cầu như:

> Viết bài cho AV Logistics, tuyến Hàn Quốc: gửi đồ khô từ Huế đi Hàn Quốc, người đọc là gia đình có con du học.

Sau đó:

1. Mở `/admin/posts/new/`, điền các ô theo Phần B của câu trả lời. Dán markdown vào ô Nội dung.
2. Với mỗi dòng `[ẢNH n: …]`: bôi đen cả dòng → **Chèn ảnh** → tải ảnh thật lên (nhập alt VI và EN theo Phần C). Nếu tải nhiều ảnh trong một lần, ảnh đầu tiên thay dòng đang bôi đen, các ảnh còn lại được nối lần lượt xuống cuối bài: cắt từng dòng `![…](…)` đó dán vào đúng chỗ. Bấm **Xem trước** để kiểm tra.
3. Tạo bài nháp → trong trang sửa bài, bấm **Tạo bản nháp EN** → tab Tiếng Anh: dán bản EN (Phần D).
4. Đọc lại các thông tin riêng của công ty, rồi xuất bản.

## Giới hạn đã biết

- **Bảng giá trong bài là bản sao có ngày** (chủ doanh nghiệp 2026-11-23, ngoại lệ với quy tắc 2): giá trong bài không tự đổi khi sửa bảng giá trong admin, nên phải sửa tay các bài sau mỗi lần đổi giá. Số ngày vận chuyển vẫn không ghi vào bài.
- Bảng markdown chỉ hiển thị trong nội dung bài viết (từ bản sửa `fix/post-markdown-images-tables`), không hiển thị ở trang About hay chính sách.
- Agent không tạo ảnh: chỉ đề xuất vị trí, nội dung và alt; ảnh phải là ảnh thật của công ty.
