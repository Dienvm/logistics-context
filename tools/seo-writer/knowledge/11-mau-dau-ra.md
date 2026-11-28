# Mẫu đầu ra: điền vào https://43logistics.vn/admin/posts/new/

Luôn trả lời theo đúng thứ tự dưới đây. Mỗi ô có giới hạn của form; vượt giới hạn thì form báo lỗi, nên đếm ký tự trước khi đưa ra.

## Phần A: Kiểm tra trước khi viết

- Công ty, tuyến (`key`), từ khoá chính, người đọc chính.
- Bài trùng chủ đề đã có (nếu có) và góc mới đề xuất.
- Điều cần người dùng xác nhận (nếu có): mặt hàng chưa có trong quy định, thông tin công ty chưa xác nhận. Nếu điều đó là trọng tâm bài, **hỏi trước khi viết**.

## Phần B: Các ô của form "Viết bài mới" (tiếng Việt)

| Ô trong form | Giới hạn | Ghi chú |
| --- | --- | --- |
| **Đăng cho** | 43 Logistics / AV Logistics / GT Logistics / Cả 3 công ty | Theo yêu cầu. "Cả 3 công ty" chỉ khi người dùng muốn; nhắc rằng chỉ bài 43 lên Google |
| **Tiêu đề bài (H1)** | ≤ 120 ký tự | H1 của bài. Có từ khoá chính, dạng câu trả lời hoặc câu hỏi rõ ràng, không viết hoa toàn bộ, không dấu "!" |
| **Đường dẫn (slug)** | ≤ 80 ký tự; chỉ `a-z`, `0-9`, một dấu `-` giữa các từ | Không dấu, từ khoá đứng đầu, bỏ từ thừa ("cach", "nhung"). Phải khác mọi bài của cùng công ty. Khoá lại sau khi xuất bản |
| **Tóm tắt** | ≤ 300 ký tự | Hiện dưới tiêu đề bài và trên thẻ bài viết. 1–2 câu trả lời câu hỏi chính |
| **Tiêu đề SEO** | ≤ 60 ký tự | Từ khoá chính ở đầu. Có thể thêm tên công ty ở cuối nếu còn chỗ |
| **Mô tả SEO** | 120–155 ký tự | Một câu trả lời + lợi ích + kêu gọi hành động. Đếm chính xác |
| **Tuyến liên quan** | một tuyến hoặc "Không gắn tuyến" | Ghi tên tuyến như trong form (ví dụ "Hàn Quốc") và `key` |
| **Chuyên mục** | tối đa 5, chỉ chuyên mục **đã có** của công ty đó | Nếu công ty chưa có chuyên mục phù hợp: ghi "không chọn" và đề xuất tên chuyên mục mới để quản trị viên tạo |
| **Nội dung (Markdown)** của khối "Đoạn nội dung" | ≤ 40.000 ký tự | Toàn bộ markdown trong một khối mã ```markdown để người dùng sao chép |

Sau bảng, ghi số ký tự thực tế của Tiêu đề bài, Đường dẫn, Tóm tắt, Tiêu đề SEO, Mô tả SEO, và số chữ của Nội dung.

## Phần C: Ảnh cần chuẩn bị

Danh sách theo số `[ẢNH n]` đã đặt trong nội dung:

- **[ẢNH 1]** Cần chụp: … · Alt VI: … · Alt EN: … · Chú thích (nếu có): …

## Phần D: Bản tiếng Anh (tab "Tiếng Anh" sau khi tạo bài)

Quy trình trong admin: tạo bài tiếng Việt → trong trang sửa bài bấm **Tạo bản nháp EN** (bản nháp chép nguyên chữ tiếng Việt, chưa có dịch máy) → mở tab Tiếng Anh → thay từng ô bằng nội dung dưới đây. Dòng `[ẢNH n]`: bôi đen, bấm Chèn ảnh, chọn lại đúng ảnh đã tải ở bản VI trong kho, rồi sửa chữ trong `![...]` thành alt EN.

| Ô | Giới hạn |
| --- | --- |
| Title | ≤ 120 ký tự |
| Slug | ≤ 80 ký tự, tiếng Anh |
| Excerpt | ≤ 300 ký tự |
| SEO title | ≤ 60 ký tự |
| SEO description | 120–155 ký tự |
| Content | markdown trong một khối ```markdown, link nội bộ dùng đường dẫn `/en/...` |

## Phần E: Danh sách tự kiểm (agent tự đánh dấu)

- [ ] Bài về một tuyến có giá công khai: có bảng giá chép nguyên văn từ `05-bang-gia-theo-tuyen.md`, dòng "Giá tham khảo, cập nhật ngày …" và link `#route-rates` của đúng công ty
- [ ] Không có số ngày vận chuyển; không có giá nào ngoài bảng đã chép; bảng chỉ dùng cho giá và phụ thu
- [ ] Không có `#` (H1), không có mục lục viết tay, không có HTML
- [ ] Không có link liên hệ, số điện thoại trong nội dung
- [ ] H2/H3 dạng câu hỏi; mỗi H2 mở đầu bằng câu trả lời trực tiếp
- [ ] Có "Tóm tắt nhanh" và "Câu hỏi thường gặp" (5–8 câu)
- [ ] 3–6 link nội bộ đúng công ty, chỉ tới trang và bài đang hiển thị
- [ ] Mọi điều về hàng hoá có trong quy định đã duyệt của tuyến; mọi điều về công ty có trong `00-cong-ty.md`
- [ ] Không lời khen không bằng chứng, không tên hay link đối thủ
- [ ] Giới hạn ký tự đều đạt

---

## Ví dụ ngắn (rút gọn, chỉ để thấy định dạng)

**Đăng cho:** AV Logistics · **Tuyến:** Hàn Quốc (`kr`)

**Tiêu đề:** Gửi đồ khô đi Hàn Quốc từ Huế: gửi được gì và đóng gói thế nào

**Đường dẫn:** `gui-do-kho-di-han-quoc-tu-hue`

```markdown
AV Logistics nhận gửi đồ khô từ Huế và Quảng Trị đi Hàn Quốc bằng đường bay. Bài này giúp bạn biết món nào gửi được, món nào bị giữ ở hải quan và cách đóng gói để hàng đi suôn sẻ.

## Tóm tắt nhanh

- **Gửi được:** ...
- **Không gửi được:** ...
- **Cước tính theo:** cân nặng tính cước, là số lớn hơn giữa cân nặng thực và cân nặng quy đổi theo kích thước thùng.
- **Xem giá:** bảng giá theo từng nấc cân trên trang [Gửi hàng đi Hàn Quốc](/gui-hang-di-han-quoc/).

[ẢNH 1: Thùng đồ khô đã hút chân không, xếp gọn trước khi cân tại kho]

## Gửi đồ khô đi Hàn Quốc được những gì?

AV Logistics nhận ... (câu trả lời trực tiếp, rồi giải thích)

### ...

## Câu hỏi thường gặp

### Gửi mắm đi Hàn Quốc có được không?

...
```
