# Hướng dẫn viết bài chuẩn SEO và GEO cho blog 43 Logistics, AV Logistics, GT Logistics

GEO (Generative Engine Optimization) nghĩa là viết sao cho ChatGPT, Claude, Gemini, Perplexity và Google AI Overviews dễ trích dẫn đúng bài của mình. Bài vừa phải đứng top Google, vừa phải được AI nêu tên công ty khi người dùng hỏi về tuyến hàng.

## 1. Website hiển thị markdown thế nào (bắt buộc tuân theo)

Ô "Nội dung" trong `/admin/posts/new/` nhận **markdown chuẩn CommonMark, không có GFM**. Vì vậy:

| Viết | Hiển thị trên web |
| --- | --- |
| `## Câu hỏi` | Tiêu đề H2, có trong mục lục |
| `### Câu hỏi con` | Tiêu đề H3, có trong mục lục |
| `#` | Cũng thành H2 (H1 duy nhất là tiêu đề bài). **Không dùng `#`.** |
| `####` | H4, không vào mục lục. Hạn chế dùng |
| `- mục`, `1. mục` | Danh sách |
| `**đậm**`, `*nghiêng*` | Chữ đậm, nghiêng |
| `> trích` | Khối trích dẫn |
| `[chữ](/gui-hang-di-han-quoc/)` | Link nội bộ (đường dẫn bắt đầu bằng `/`) |
| Bảng `| a | b |` (dòng thứ hai `|---|---:|`) | Bảng, cuộn ngang được trên điện thoại. **Chỉ dùng cho bảng giá và phụ thu** (mục 2); các so sánh khác vẫn dùng danh sách |
| Thẻ HTML, `<!-- -->` | Hiện thành chữ thường, **không dùng** |
| `![alt](url)` | Chỉ hiện ảnh của kho media. Người viết chèn bằng nút **Chèn ảnh** |

- **Mục lục tự động:** trang bài viết tự tạo mục lục từ các H2/H3. **Không viết mục lục bằng tay** (sẽ bị lặp hai lần).
- **Không đặt link liên hệ trong bài** (`/go/zalo/`, `tel:`, `zalo.me`, số điện thoại): trang bài viết đã có sẵn hộp liên hệ Zalo. Link `/go/...` trong nội dung có thể làm sai số liệu đo lượt liên hệ.
- Giới hạn: tối đa 40.000 ký tự cho một khối nội dung. Một bài nên nằm gọn trong **một** khối.

## 2. Bảng giá trong bài viết về một tuyến

Chủ doanh nghiệp quyết định (2026-11-23): **bài viết đại diện cho một tuyến phải có bảng giá của tuyến đó**, chép từ `05-bang-gia-theo-tuyen.md`. Đây là bản sao tham khảo của bảng giá trong admin, nên bài phải ghi rõ ngày và luôn dẫn tới trang báo giá thật.

- **Có giá khi nào:** tuyến của bài có mục trong `05-bang-gia-theo-tuyen.md`. Tuyến không có ở đó (chưa xác nhận hoặc không công khai giá): không đưa giá, chỉ dẫn tới trang tuyến.
- **Đặt ở đâu:** trong mục H2 về giá, ví dụ `## Bảng giá gửi hàng đi Mỹ bao nhiêu?`. Câu đầu trả lời ngắn (hình thức, kho gửi, cách đọc bảng), rồi đến bảng.
- **Chép bảng nào:** mỗi thẻ giá (mỗi mục `### VI: …`) là một bảng riêng, có một H3 hoặc một dòng đậm nêu hình thức và nơi gửi (ví dụ "Bay nhanh · Việt Nam"). Bài cho một thành phố cụ thể chỉ chép thẻ giá của nơi gửi đó. Có bảng phụ thu của tuyến thì chép luôn, ngay sau bảng giá.
- **Chép nguyên văn:** giữ đúng nhãn cân nặng và ô giá (`1 kg`, `1.680.102 đ/đơn`, `301.000 đ/kg`, `Liên hệ`). Không tự tính, không làm tròn, không đổi tiền tệ, không thêm mốc cân không có trong bảng. Không tự bung ra từng mốc 0,5 kg.
- **Ghi chú ngay dưới bảng**, chép nguyên các dòng ghi chú của thẻ giá (làm tròn cân nặng, tối thiểu, phí giao), rồi luôn thêm hai dòng:
  - `*Giá tham khảo, cập nhật ngày DD/MM/YYYY.*`: lấy **ngày xuất** ghi ở đầu file `05-bang-gia-theo-tuyen.md`;
  - `Xem bảng giá mới nhất và tính cước cho kiện hàng của bạn trên trang [Bảng giá gửi hàng đi Mỹ](/gui-hang-di-my/#route-rates).`: link `#route-rates` của trang tuyến **đúng công ty** (xem `01-tuyen-va-duong-dan.md`), có chữ mô tả rõ.
- **Thời gian vận chuyển vẫn không ghi số ngày.** Viết "thời gian của từng hình thức ghi trên trang tuyến".
- Giải thích thêm **cách đọc bảng** và **cách tính cước**: cân nặng tính cước là số lớn hơn giữa cân nặng thực và cân nặng quy đổi theo kích thước; giá "/đơn" là trọn gói cho cả kiện ở mốc đó; giá "/kg" nhân với cân nặng tính cước.
- Bản tiếng Anh chép bảng `### EN: …` tương ứng và link `/en/...#route-rates`.

## 3. Cấu trúc bài (khung chuẩn)

1. **Đoạn mở đầu (không có tiêu đề), 2–3 câu:** trả lời thẳng câu hỏi chính của bài, có tên công ty, tuyến, thành phố. Đây là đoạn AI hay trích nhất.
2. **`## Tóm tắt nhanh`**: 4–6 gạch đầu dòng, mỗi dòng là một ý trả lời được ngay (gửi được gì, không gửi được gì, cách tính cước, cách gửi, nơi nhận hàng).
3. **5–8 mục H2 dạng câu hỏi** (bài về một tuyến: một H2 là bảng giá, xem mục 2) người dùng thật sự gõ, ví dụ "Gửi đồ khô đi Hàn Quốc được những gì?", "Cước gửi hàng đi Hàn Quốc tính như thế nào?", "Đóng gói đồ khô thế nào để không bị giữ hàng?". Mỗi H2:
   - câu đầu tiên trả lời trực tiếp (40–60 chữ), sau đó mới giải thích;
   - có 1–3 H3 khi cần chia nhỏ (cũng dạng câu hỏi hoặc cụm danh từ rõ nghĩa);
   - đoạn văn ngắn (2–4 câu), dùng danh sách khi liệt kê.
4. **`## Quy trình gửi hàng`** (khi phù hợp): danh sách đánh số từng bước.
5. **`## Câu hỏi thường gặp`**: 5–8 câu, mỗi câu là một `###` dạng câu hỏi, trả lời 2–4 câu, tự đứng được (không viết "như trên").
6. **Đoạn kết 1–2 câu**, dẫn tới trang tuyến hoặc trang Tính cước. Không nhắc lại toàn bộ bài.

Độ dài: **1.500–2.500 chữ** cho bài tiếng Việt (bài tổng hợp nhiều tuyến có thể tới 3.000). Không độn chữ: mỗi đoạn phải trả lời một câu hỏi.

## 4. Quy tắc SEO

- **Từ khoá chính** (ví dụ "gửi hàng đi Hàn Quốc", "gửi đồ khô đi Hàn Quốc"): có trong tiêu đề, đường dẫn, tiêu đề SEO, mô tả SEO, đoạn mở đầu và ít nhất một H2. Dùng tự nhiên, không lặp máy móc.
- **Từ khoá phụ, biến thể:** tên thành phố gửi (Đà Nẵng, Huế, Quảng Trị…), loại hàng, "bao nhiêu tiền", "mất mấy ngày", "có được không".
- **Link nội bộ (3–6 link):** trang tuyến của đúng công ty, trang Tính cước, trang Hàng gửi được và hàng cấm, 1–2 bài liên quan **đang hiển thị** của cùng công ty (xem `03-bai-viet-va-chuyen-muc.md`). Chữ của link mô tả đích đến (không dùng "xem thêm", "tại đây").
- **Link ra ngoài:** chỉ tới cơ quan chính thức (hải quan, cơ quan nhà nước) khi người viết đưa nguồn. Không bao giờ link sang đối thủ.
- **Không trùng:** đọc `03-bai-viet-va-chuyen-muc.md` trước. Nếu đã có bài cùng chủ đề trên cùng công ty, báo cho người dùng và đề xuất một góc khác (thành phố khác, loại hàng khác, câu hỏi khác).

## 5. Quy tắc GEO (để AI trích dẫn)

- **Câu trả lời đứng riêng được:** mỗi đoạn mở đầu của H2 và mỗi câu trả lời FAQ phải hiểu được khi bị cắt riêng ra, có đủ chủ ngữ ("43 Logistics nhận…", "Tuyến Hàn Quốc không nhận…"), không dùng "nó", "ở trên".
- **Nêu tên thực thể rõ ràng:** tên công ty đúng cách viết, tên tuyến, thành phố, loại hàng. Viết tên công ty 3–5 lần trong bài, tự nhiên.
- **Định nghĩa ngắn:** khi dùng thuật ngữ (cân nặng quy đổi, thông quan, phụ thu), định nghĩa trong một câu.
- **Danh sách cho ý so sánh:** mỗi dòng `- **Tên mục:** giải thích` để AI tách ý dễ dàng. Bảng chỉ dành cho giá (mục 2), có tiêu đề cột rõ ràng.
- **Bảng giá có ngữ cảnh:** ngay trước bảng nêu tuyến, hình thức, nơi gửi; ngay sau bảng là ngày cập nhật và link trang báo giá, để AI trích kèm nguồn và thời điểm.
- **Sự thật có nguồn:** mọi điều về hàng hoá lấy từ `02-quy-dinh-hang-hoa.md`; mọi điều về công ty lấy từ `00-cong-ty.md`. Mặt hàng chưa có quy định: viết "hãy hỏi nhân viên qua Zalo trước khi gửi".

## 6. Hình ảnh

Website chỉ dùng **ảnh thật** do công ty chụp hoặc sở hữu, tải lên kho media. Agent không tạo hay tìm ảnh trên mạng; agent đề xuất **vị trí và nội dung ảnh** để người viết chụp hoặc chọn.

- 3–5 ảnh mỗi bài: sau đoạn mở đầu hoặc trong mục đóng gói, mục quy trình, mục hàng hoá.
- Tại đúng vị trí trong markdown, đặt một dòng riêng:
  `[ẢNH 1: <mô tả ảnh cần chụp>]`
  Người viết bôi đen cả dòng này, bấm **Chèn ảnh**, tải ảnh lên: dòng đánh dấu được thay bằng ảnh đúng chỗ. Tải nhiều ảnh một lần thì ảnh đầu thay dòng đang bôi đen, các ảnh còn lại nối xuống cuối bài.
- Với mỗi ảnh, đưa ra: mô tả cần chụp; **alt tiếng Việt** và **alt tiếng Anh** (mô tả đúng nội dung ảnh, 8–15 chữ, có từ khoá khi tự nhiên, không bắt đầu bằng "ảnh"/"hình"); chú thích ngắn nếu cần.
- Không có chữ trong ảnh (giá, tên nước, tiêu đề phải là chữ trên trang). Ảnh khách hàng chỉ dùng khi khách đồng ý và đã che thông tin cá nhân (tên, số điện thoại, địa chỉ trên nhãn).

## 7. Bài cho "Cả 3 công ty" và bài riêng từng công ty

- Ô **Đăng cho = Cả 3 công ty** tạo bài gốc trên 43 Logistics và bản sao cho AV, GT; bản sao trỏ canonical về bài 43, nên **chỉ bài 43 lên Google**. Khi đó viết bài theo 43 Logistics, và nhắc người dùng đọc lại bản AV, GT (tên công ty, đường dẫn trang tuyến) trước khi đăng.
- Muốn bài của AV hoặc GT cũng lên Google: viết **bài riêng cho từng công ty**, khác góc nhìn và câu chữ (không chỉ thay tên). Ví dụ AV nhấn khách ở Huế, Quảng Trị; GT nhấn Quảng Bình và nhận hàng toàn quốc (theo H1 trang tuyến của từng công ty trong `01-tuyen-va-duong-dan.md`).

## 8. Tiếng Anh

- Bản EN không dịch từng chữ: viết lại cho người đọc ở nước ngoài, câu ngắn, dùng đúng thuật ngữ trong `04-thuat-ngu-vi-en.md`.
- Link nội bộ dùng đường dẫn EN (`/en/...`). Đường dẫn EN dùng từ khoá tiếng Anh (`shipping-dry-food-to-korea-from-da-nang`).
- Độ dài có thể ngắn hơn bản VI 10–20%.
