# Thông tin cần chủ doanh nghiệp bổ sung — Phase 1

> Cập nhật: 2026-10-24. Website đã chạy đủ tính năng Phase 1. Một số chỗ đang **ẩn hoặc viết chung chung** vì còn thiếu thông tin dưới đây.
>
> Cách dùng: điền vào dòng **Trả lời** dưới từng mục. Mỗi mục có mã Q-xx, khớp với `docs/context/11-open-questions.md` (bản đầy đủ). Khi có câu trả lời, em sẽ cập nhật dữ liệu (`site_settings`, nội dung trang) và chuyển câu hỏi sang mục "Answered".
>
> ⚠️ **Không ghi mật khẩu, API key hay token vào file này** (file nằm trong git). Phần A chỉ ghi *ai* sẽ cấp và *đã cấp chưa*; giá trị bí mật được đặt thẳng vào biến môi trường trên server lúc triển khai.

---

## A. Cấu hình và mã bí mật khi triển khai (không ghi giá trị ở đây)

| # | Việc cần | Biến môi trường | Ảnh hưởng nếu thiếu | Trạng thái |
| --- | --- | --- | --- | --- |
| A1 | **Server (VPS)**: nhà cung cấp, khu vực, người quản trị; ai giữ quyền DNS của tên miền 43logistics.vn (Q-15) | — | Chưa ra mắt được | ☐ |
| A2 | Đặt địa chỉ site chính thức | `NEXT_PUBLIC_SITE_URL=https://43logistics.vn` | **Thiếu biến này thì Google không index site** (cố ý: staging luôn noindex) | ☐ |
| A3 | Khoá băm IP riêng (tạo bằng `openssl rand -hex 32`) | `IP_HASH_SALT` | Vẫn chạy (dùng khoá phái sinh từ DATABASE_URL), nhưng nên đặt riêng | ☐ |
| A4 | **Email báo yêu cầu báo giá**: tạo *App Password* cho Gmail 43logistics.danang@gmail.com (Google Account → Bảo mật → Xác minh 2 bước → Mật khẩu ứng dụng) và cho biết **email nào nhận thông báo** (Q-28) | `SMTP_USER`, `SMTP_PASSWORD`, `LEAD_NOTIFY_EMAILS` | Yêu cầu báo giá vẫn được lưu vào DB nhưng **không có email báo** | ☐ |
| A5 | **Zalo báo yêu cầu báo giá**: Zalo Official Account (OA), App ID + App Secret trên developers.zalo.me, một *refresh token* ban đầu, và Zalo user ID của nhân viên nhận tin (nhân viên phải *quan tâm* OA) (Q-28) | `ZALO_OA_APP_ID`, `ZALO_OA_APP_SECRET`, `ZALO_OA_REFRESH_TOKEN`, `ZALO_OA_RECIPIENT_IDS` | Không có tin Zalo báo yêu cầu mới | ☐ |
| A6 | **Google Tag Manager mới**: tạo container mới (GTM-XXXXXXX); container cũ GTM-WF967MKT đã bỏ (Q-13) | `NEXT_PUBLIC_GTM_ID` | Không đo được quảng cáo/chuyển đổi | ☐ |
| A7 | **PostHog** (thống kê hành vi): chọn máy chủ EU hay US, tạo project và lấy *project key*; có cần ghi lại phiên (session replay) không? (Q-20) | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Không có số liệu hành vi người dùng | ☐ |
| A8 | (Tuỳ chọn) **Cloudflare Turnstile** chống spam cho form | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Form vẫn chạy với chống spam cơ bản (ô bẫy + thời gian điền) | ☐ |
| A9 | Tài khoản quản trị Clerk cho trang /admin (phase 2) | `CLERK_*` | Chưa vào được trang quản trị | ☐ |

Trả lời / ghi chú cho phần A:

---

## B. Thông tin doanh nghiệp

**B1 (Q-01)** — Tên pháp lý đầy đủ của công ty, mã số thuế (MST), giấy phép kinh doanh/bưu chính (nếu có).
*Hiện tại:* khối "Thông tin pháp lý" ở trang Giới thiệu và chân trang bị ẩn; chính sách bảo mật ghi "43 Logistics".
Trả lời:

**B2 (Q-02)** — (a) Tên phường/quận mới của hai văn phòng sau sáp nhập 01/07/2025. (b) Có kho Hà Nội không? Địa chỉ? (c) Kho/điểm nhận ở Singapore (cho tuyến SG → VN)?
Trả lời:

**B3 (bản đồ)** — Văn phòng Đà Nẵng có trang **Google Maps / Google Business** không? Gửi link hoặc tên chính xác trên Google Maps (bản đồ Đà Nẵng hiện chưa ghim đúng địa chỉ "24 Bình Hòa 6").
Trả lời:

**B4 (Q-03)** — "CSKH 24/7" có đúng không (ví dụ trả lời Zalo ngoài giờ)? Nhân viên có hỗ trợ khách bằng tiếng Anh không?
Trả lời:

**B5 (Q-08)** — Được nêu tên/dùng logo những hãng vận chuyển đối tác nào (DHL, UPS, FedEx, CJ Logistics, EMS…)?
Trả lời:

**B6 (Q-11)** — File logo vector (SVG/AI/PDF).
Trả lời:

**B7 (Q-23)** — Số liệu thật: số năm hoạt động, số khách/đơn mỗi năm, báo chí từng nhắc tới (dùng cho trang chủ và Giới thiệu; hiện không hiện con số nào).
Trả lời:

**B8 (Q-24)** — Có được ghi công khai 43 Logistics thuộc nhóm Quý Nam không? 43 Logistics có dùng hệ thống tra cứu vận đơn của Quý Nam không?
Trả lời:

**B9 (giới thiệu)** — Câu chuyện thật, ảnh đội ngũ/kho/đóng gói cho trang Giới thiệu (trang hiện dùng nội dung em soạn chung).
Trả lời:

---

## C. Chính sách (đang đăng bản không có con số)

**C1 (Q-09)** — Mức đền bù chính thức khi mất/hư hỏng: hàng có bảo hiểm và không bảo hiểm (trang cũ SG → VN ghi "bảo hiểm 10% → đền bù 100%", không bảo hiểm "x3 phí vận chuyển"). Áp dụng cho tất cả các tuyến?
Trả lời:

**C2 (Q-17)** — Thời hạn lưu dữ liệu yêu cầu báo giá (ví dụ 24 tháng rồi xoá/ẩn danh).
Trả lời:

**C3** — Anh/chị đã đọc và duyệt 4 trang chính sách chưa (quy định gửi nhận hàng, đền bù, bảo mật, điều khoản)? Ghi điểm cần sửa.
Trả lời:

---

## D. Giá, tuyến và dịch vụ

**D1 (Q-04)** — Quy định VAT, phí bảo hiểm, phụ phí theo tuyến; ai cập nhật bảng giá và bao lâu một lần?
Trả lời:

**D2 (Q-25)** — Quy tắc tính cước: (a) bước làm tròn cân nặng cho các tuyến ngoài Mỹ (0,5 kg hay 1 kg?); (b) mốc khung giá "1–5 kg / 6–20 kg" nghĩa là "đến 5 kg / trên 5 kg"?; (c) có cước tối thiểu/cân tối thiểu không?; (d) hệ số quy đổi 5000 áp dụng cho mọi tuyến và mọi hình thức?
Trả lời:

**D3 (Q-05)** — Các tuyến nhập về Việt Nam đang chạy thật: Nhật → VN, Malaysia → VN, Thái Lan → VN?
Trả lời:

**D4 (Q-22)** — 43 Logistics có những dịch vụ/điểm đến nào khác: Úc, Canada, châu Âu…; gom đơn sàn TMĐT; hàng đông lạnh; hút chân không; **lấy hàng tận nhà** (bài blog cũ có nhắc nhưng chưa xác nhận nên em đã bỏ)?
Trả lời:

**D5** — Nhóm hàng "Hạn chế – cần khai báo" theo từng nước (trang Hàng cấm gửi hiện chỉ có "Cấm gửi" và "Được gửi").
Trả lời:

---

## E. Quảng cáo và đo lường

**E1 (Q-13)** — Ngân sách và thứ tự kênh quảng cáo: Google Ads, Facebook/Meta, TikTok…? Chỉ các kênh chọn mới được gắn thẻ và gửi chuyển đổi phía server. Ai có quyền Search Console / Google Ads / Meta Business?
Trả lời:

**E2 (Q-20)** — Ai chuẩn bị đánh giá chuyển dữ liệu ra nước ngoài theo Luật 91/2025 và Nghị định 13 (máy chủ DB ở Singapore, PostHog ở EU/US)?
Trả lời:

---

## F. Nội dung em đã soạn, cần anh/chị duyệt

| Nội dung | Ở đâu | Đã duyệt? |
| --- | --- | --- |
| Trang Giới thiệu (VI/EN) | `/gioi-thieu/` · `43logistics.vn/data/seed/info-pages/about.*.md` | ☐ |
| 4 trang chính sách | `/quy-dinh-gui-nhan-hang/`, `/chinh-sach-den-bu/`, `/chinh-sach-bao-mat/`, `/dieu-khoan-dich-vu/` | ☐ |
| 4 bài blog | `/kinh-nghiem/` · `43logistics.vn/data/seed/posts/*.md` | ☐ |
| Form báo giá + infographic 3 bước | `/lien-he/#bao-gia`, `/tinh-cuoc/#bao-gia` | ☐ |
| Banner cookie | mọi trang (lần đầu truy cập) | ☐ |
| Trang Hàng cấm gửi | `/hang-cam-gui/` (dữ liệu từ danh sách hàng anh/chị đã duyệt) | ☐ |

Ghi chú sửa:

---

## G. Khác (không gấp)

**G1 (Q-16)** — Dịch tiếng Anh: dùng máy dịch (nhà cung cấp nào) hay người dịch?
Trả lời:

**G2 (Q-18)** — Có API của hãng vận chuyển hoặc hệ thống nội bộ để làm trang tra cứu vận đơn `/tra-cuu/` không?
Trả lời:
