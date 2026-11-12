# Hướng dẫn kiểm tra GEO — 43logistics.vn có được AI tìm thấy và giới thiệu không

> Cập nhật: 2026-10-30. Áp dụng cho G-04 (đã chạy trên production từ bản `ba39061`) và G-05 (đo lường, đang làm).
> Quyết định gốc: `docs/adr/0011-geo-ai-assistant-visibility.md`. Chi tiết kỹ thuật: `docs/context/05-seo-and-tracking.md` mục "AI assistants (GEO)".
> Bộ câu hỏi thử hằng tháng: `data/geo-prompt-panel.csv`.

GEO (Generative Engine Optimization) là việc làm cho các trợ lý AI (ChatGPT, Gemini / Google AI Mode, Perplexity, Copilot, Claude) **tìm thấy, hiểu đúng và trích dẫn** 43 Logistics khi người dùng hỏi về gửi hàng quốc tế.

Hướng dẫn này trả lời ba câu hỏi:

1. Phần kỹ thuật trên website có đang chạy đúng không (phần A).
2. AI có thật sự nhắc và trích dẫn 43 Logistics không, và đúng tới mức nào (phần B, C).
3. Cần làm gì để kết quả tốt lên trên từng công cụ AI (phần D, E).

---

## A. Kiểm tra kỹ thuật — sau mỗi lần deploy

Làm trong khoảng 10 phút. Tất cả đều là kiểm tra chỉ đọc.

### A1. Các URL cơ bản

Mở từng địa chỉ (hoặc chạy `curl -I`). Kết quả mong đợi ghi bên cạnh.

| URL | Mong đợi |
| --- | --- |
| `https://43logistics.vn/robots.txt` | 200; `Allow: /`; chỉ chặn `/admin/`, `/api/`, `/go/`, `/dev/`, `/en/dev/`; có dòng `Sitemap:`. **Không** có dòng nào chặn GPTBot, PerplexityBot, ClaudeBot… |
| `https://43logistics.vn/sitemap.xml` | 200, liệt kê các trang đã publish (VI + EN) |
| `https://43logistics.vn/llms.txt` | 200 `text/plain`; có `# 43 Logistics`, các nhóm "Trang chính", "Tuyến gửi hàng", … rồi `## English` |
| `https://43logistics.vn/BingSiteAuth.xml` | 200, chứa mã xác minh Bing |
| `https://43logistics.vn/indexnow-key.txt` | 200, trả về key IndexNow (32 ký tự) |

Mẹo: số URL trong `/llms.txt` phải **bằng** số URL trong `/sitemap.xml`. Nếu lệch, báo cho kỹ thuật.

### A2. Dữ liệu cấu trúc (JSON-LD)

1. Mở https://validator.schema.org → dán URL → **Run test**. Kiểm tra lần lượt:
   - trang chủ `https://43logistics.vn/`;
   - một trang tuyến, ví dụ `https://43logistics.vn/gui-hang-di-singapore/`;
   - `https://43logistics.vn/hang-cam-gui/`;
   - một bài viết trong `/kinh-nghiem/`.
2. Mong đợi trên **mọi trang**:
   - đúng **một** `Organization` (`@id` = `https://43logistics.vn/#organization`, có `logo`) và đúng **một** `WebSite`;
   - **0 lỗi** (cảnh báo màu vàng chấp nhận được).
3. Riêng trang tuyến: có `WebPage` với `dateModified`, có `Service`; có `Offer` khi tuyến có giá công khai đã xác nhận.
4. Riêng `/hang-cam-gui/`: có `WebPage` và `ItemList` liệt kê các nước.
5. Thêm một lần: https://search.google.com/test/rich-results với trang tuyến Singapore → không có lỗi.

### A3. Nội dung AI dễ trích dẫn

Mở trang tuyến Singapore và kiểm tra bằng mắt:

- Ngay dưới tiêu đề lớn (H1) có **một đoạn tóm tắt**: giá từng phương thức, số ngày, nơi nhận hàng, ngày cập nhật bảng giá, lời mời nhắn Zalo.
- Các con số trong đoạn tóm tắt **khớp** với bảng giá bên dưới.
- Phần hàng hoá cuối trang có link "Xem đầy đủ hàng cấm và hạn chế gửi đi Singapore", bấm vào thì nhảy đúng mục Singapore trên `/hang-cam-gui/`.
- Trên `/hang-cam-gui/`, mỗi nước mở đầu bằng một câu tóm tắt (số nhóm hàng cấm / hạn chế / gửi được, vài ví dụ).

### A4. Thông tin công ty (admin)

Vào `/admin/settings/`:

- Nhóm **Công ty**: tên gọi khác, năm thành lập, lĩnh vực chuyên môn (VI và EN).
- Nhóm **Mạng xã hội**: Facebook, Zalo OA, Google Business Profile, YouTube, TikTok.

Các thông tin này chỉ xuất hiện cho AI khi ô **"Đã xác nhận"** được tích. Chỉ tích khi chủ doanh nghiệp đã xác nhận đúng (Q-01, Q-23, Q-31). Thiếu thì để trống, không điền phỏng đoán.

---

## B. Thiết lập công cụ — làm một lần

| Công cụ | Việc cần làm | Vì sao |
| --- | --- | --- |
| **Bing Webmaster Tools** (https://www.bing.com/webmasters) | Xác minh site (đã có sẵn file `BingSiteAuth.xml` và thẻ meta) → nộp `https://43logistics.vn/sitemap.xml` → xem mục **IndexNow** | ChatGPT search và Copilot dựa nhiều vào chỉ mục Bing. IndexNow báo cho Bing ngay khi trang thay đổi |
| **Google Search Console** (https://search.google.com/search-console) | Xác minh domain → nộp sitemap → dùng **URL Inspection** cho trang chủ và các trang tuyến | Gemini, AI Overviews và AI Mode dùng chỉ mục Google |
| **Cloudflare** (sau L-00b) | Tắt "Block AI bots"; không bật robots.txt do Cloudflare quản lý; nếu bật Bot Fight Mode thì phải cho bot đã xác minh đi qua | Nếu Cloudflare chặn, AI không đọc được site dù code đúng |
| **Cloudflare Web Analytics** | Xem mục **Referrers** hằng tuần | Thấy lượt truy cập từ `chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `copilot.microsoft.com`, `claude.ai` |

Sau khi thiết lập, kiểm tra **Bing → IndexNow**: sau một lần lưu nội dung trong admin (ví dụ sửa nhẹ một trang đang publish), vài giờ sau phải thấy URL được nhận. Lưu nháp **không** gửi ping, đó là đúng thiết kế.

---

## C. Kiểm tra hằng tháng — bộ câu hỏi thử (prompt panel)

Đây là cách đo **duy nhất** cho biết AI có giới thiệu 43 Logistics hay không. Mất khoảng 2–3 giờ mỗi tháng.

### C1. Chuẩn bị

- File `data/geo-prompt-panel.csv`: 52 câu hỏi cố định × 5 công cụ = 260 dòng mỗi lần chạy. `P01`–`P20` hỏi về 43 Logistics; `P21`–`P30` (thêm 2026-11-10) hỏi về AV Logistics, GT Logistics và các câu tiếng Anh của khách ở nước ngoài; `P31`–`P40` (thêm 2026-11-11) là câu hỏi theo từ khoá cụ thể (loại hàng + nước đến + nơi gửi, ví dụ "Gửi đồ khô đi Hàn Quốc từ Đà Nẵng") và theo khu vực; `P41`–`P52` (thêm 2026-11-11) là câu hỏi địa phương quanh các kho Huế, Đồng Hới (Quảng Bình) và Cửa Việt (Quảng Trị), nơi gần như chưa có đối thủ. Mỗi địa phương có một site phụ trách: Huế → 43, Quảng Bình → GT, Quảng Trị → AV. Với `P31`–`P52`, ghi vào `notes` site nào trong 3 site được nêu (43, AV, GT) và có đúng site phụ trách không.
- 5 công cụ:
  - `chatgpt`: ChatGPT, **bật tìm kiếm web**;
  - `gemini`: Gemini hoặc Google AI Mode;
  - `perplexity`: Perplexity;
  - `copilot`: Microsoft Copilot;
  - `claude`: Claude (claude.ai), **bật tìm kiếm web** (thêm 2026-11-11).
- Dùng **cửa sổ ẩn danh** hoặc đăng xuất, mỗi câu hỏi **một cuộc trò chuyện mới**. AI nhớ lịch sử và cá nhân hoá câu trả lời; hỏi trong tài khoản đã quen với 43 Logistics sẽ cho kết quả đẹp giả.
- Nếu được, hỏi từ máy ở Việt Nam, không bật VPN.

### C1b. Phần chạy tự động (từ 2026-11-11)

Hai công cụ được chạy tự động vào **9:00 sáng ngày 1 hằng tháng**, theo skill `.claude/skills/geo-panel/SKILL.md` (quy tắc trả lời, chấm điểm và site phụ trách từng câu nằm ở đó):

| Công cụ | Chạy ở đâu | Ghi chú |
| --- | --- | --- |
| `claude` | Routine Claude Code trên cloud (tài khoản Claude của chủ) | Không cần mở máy |
| `chatgpt` | Máy Mac của chủ, lịch launchd `vn.43logistics.geo-panel-chatgpt`, chạy `run-chatgpt.sh` bằng Codex CLI (tài khoản ChatGPT Pro, không trả thêm phí API) | Lịch thử mỗi ngày lúc 9:00 và mỗi lần đăng nhập; tháng nào đã có kết quả thì bỏ qua. Vì vậy nếu máy tắt ngày 1, **ngày đầu tiên máy được bật sau đó sẽ tự chạy bù**. Chạy tay: `.claude/skills/geo-panel/run-chatgpt.sh` (thêm `--force` để chạy lại tháng đã có). Log: `~/Library/Logs/43l-geo-panel-chatgpt.log`. Lịch dùng bản clone riêng `~/.local/share/43l-geo/logistics-context` vì macOS không cho tiến trình nền đọc `~/Documents` |

Mỗi lần chạy tạo hai file `data/geo-panel-runs/<YYYY-MM>-<công cụ>.csv` (điểm) và `-answers.md` (nguyên văn câu trả lời), rồi mở **một PR** vào repo này. Việc của người phụ trách: mở PR, đọc lướt điểm và câu trả lời, sửa ô nào chấm sai, rồi merge. Kết quả qua công cụ tự động là thước đo xu hướng (cùng cách tìm kiếm nhưng không cá nhân hoá), không phải bản sao màn hình khách thấy.

Gemini, Perplexity và Copilot vẫn hỏi tay theo C2, ghi vào file cùng định dạng `data/geo-panel-runs/<YYYY-MM>-<công cụ>.csv`.

### C2. Cách hỏi và ghi kết quả

1. Gõ **nguyên văn** câu hỏi trong cột `prompt`, không sửa chữ, không thêm gợi ý.
2. Đọc câu trả lời, điền vào dòng tương ứng:

| Cột | Cách điền |
| --- | --- |
| `run_date` | Ngày chạy, dạng `2026-11-05` |
| `mentioned` | `yes` nếu câu trả lời nêu tên 43 Logistics, ngược lại `no` |
| `position` | 43 Logistics đứng thứ mấy trong các công ty được nêu (1 = đầu tiên). Để trống nếu không được nêu |
| `cited` | `yes` nếu có link tới 43logistics.vn (trong câu trả lời hoặc phần nguồn) |
| `cited_url` | Link được trích, ví dụ `https://43logistics.vn/gui-hang-di-singapore/` |
| `facts_correct` | So với website **lúc hỏi**: `yes` đúng hết, `partial` đúng một phần, `no` sai, `n/a` khi không nêu dữ kiện nào |
| `competitors` | Các công ty khác được nêu, cách nhau bằng `;` |
| `notes` | Ghi chú ngắn: AI nói sai gì, lấy từ nguồn nào. **Không** ghi thông tin cá nhân |

3. Mỗi tháng, mỗi công cụ ghi **một file mới** `data/geo-panel-runs/<YYYY-MM>-<công cụ>.csv` (cùng cột với file mẫu, mỗi câu một dòng, có `run_date`). File mẫu `data/geo-prompt-panel.csv` chỉ chứa danh sách câu hỏi, không ghi kết quả vào đó. Không xoá, không sửa file của tháng trước.
4. Không đổi câu hỏi cũ. Muốn hỏi câu mới thì thêm mã mới (`P21`, …) để vẫn so sánh được với các tháng trước.
5. Lần chạy đầu tiên là **mốc (baseline)**. Nên chạy sau khi Bing và Google đã index site (thường 1–3 tuần sau khi nộp sitemap).

### C3. Đọc kết quả

Tính 4 chỉ số cho mỗi lần chạy (có thể làm bằng bảng tính, lọc theo `run_date`):

| Chỉ số | Cách tính | Ý nghĩa |
| --- | --- | --- |
| **Tỉ lệ được nhắc** | số dòng `mentioned = yes` / 80 | AI có biết tới 43 Logistics không |
| **Tỉ lệ được trích link** | số dòng `cited = yes` / 80 | AI có dẫn người dùng về website không (quan trọng nhất cho lead) |
| **Độ chính xác** | số `facts_correct = yes` / số dòng có dữ kiện | AI có nói đúng giá, số ngày, hàng cấm không |
| **Vị trí trung bình** | trung bình cột `position` (bỏ ô trống) | Khi được nêu, 43 Logistics đứng trước hay sau đối thủ |

Xem riêng theo nhóm `intent`:

- `brand` và `facts` (P01–P08) **phải đạt trước**: AI chỉ cần đọc website là trả lời được. Nếu sau 1–2 tháng vẫn thấp, có vấn đề kỹ thuật hoặc lập chỉ mục (xem phần E).
- `route` và `local` (P09–P20) **khó hơn và chậm hơn**: AI chọn công ty dựa nhiều vào việc **các trang khác** nhắc tới 43 Logistics (phần D3). Tăng dần qua nhiều tháng là bình thường.

Đừng kết luận từ một lần hỏi: câu trả lời AI thay đổi giữa các lần. Hãy nhìn xu hướng qua 2–3 tháng.

---

## D. Triển khai hiệu quả trên từng công cụ AI

### D1. Mỗi công cụ lấy thông tin từ đâu

| Công cụ | Nguồn chính | Việc cần làm cho 43 Logistics |
| --- | --- | --- |
| **ChatGPT** (khi tìm web) | Chỉ mục tìm kiếm (phần lớn từ Bing) và bot `OAI-SearchBot` / `ChatGPT-User` | Bing Webmaster Tools đầy đủ; IndexNow bật; robots không chặn bot OpenAI |
| **Copilot** | Bing | Như trên, cộng thêm **Bing Places** cho từng văn phòng |
| **Gemini / AI Overviews / AI Mode** | Chỉ mục Google, Google Business Profile | Search Console; **Google Business Profile** cho từng văn phòng đã xác nhận; dữ liệu cấu trúc không lỗi |
| **Perplexity** | Bot riêng `PerplexityBot` và nhiều nguồn web, ưu tiên nội dung mới và nguồn được trích nhiều | Nội dung có ngày cập nhật rõ; được nhắc trên các trang uy tín, diễn đàn, báo |
| **Claude** (khi tìm web) | Chỉ mục của **Brave Search** (theo báo chí công nghệ từ 2025; Anthropic chưa công bố chính thức) và bot `Claude-SearchBot` / `Claude-User`. Kiểm tra 2026-11-11: chỉ mục này mới có vài trang cũ của 43logistics.vn, chưa có trang nào của avlogistics.vn và gtlogistics.vn | robots không chặn (đã đúng); có hồ sơ doanh nghiệp trên các trang mà Brave đã index (danh bạ như Trang Vàng, Facebook, Zalo OA); bài hướng dẫn trả lời đúng câu hỏi cụ thể; theo dõi bot bằng `deploy/crawler-report.sh`. IndexNow và Bing **không** giúp Claude |

### D2. Trên website (đã có, cần duy trì)

- **Giữ dữ kiện luôn mới và đúng.** Giá, số ngày, hàng cấm đều lấy từ bảng giá và quy định trong admin. Cập nhật bảng giá thì ngày "Bảng giá cập nhật" và `dateModified` tự đổi, và IndexNow tự báo cho Bing.
- **Viết FAQ cho từng tuyến** (C-02): câu hỏi thật của khách trên Zalo, trả lời ngắn, có dữ kiện cụ thể. AI rất hay trích FAQ.
- **Bài hướng dẫn** trong `/kinh-nghiem/`: trả lời đúng câu khách hay hỏi ("gửi đồ ăn khô đi Nhật cần lưu ý gì"), có tiêu đề rõ, có ngày.
- **Thông tin công ty đầy đủ và đã xác nhận** trong `/admin/settings/` (phần A4): tên pháp lý, năm thành lập, các trang mạng xã hội. Đây là cách AI nối website với các hồ sơ khác của công ty.

### D3. Ngoài website (quyết định bởi nhiều nhất cho câu hỏi chung)

Theo ADR 0011, đây là các việc G-01 → G-03:

- **Google Business Profile, Bing Places, Apple Business Connect** cho từng văn phòng đã xác nhận.
- **Tên và thông tin giống hệt nhau ở mọi nơi**: cùng tên thương hiệu "43 Logistics — gửi hàng quốc tế", cùng địa chỉ, cùng số điện thoại (NAP). AI so khớp các nguồn; sai lệch làm AI kém tin.
- **Hồ sơ mạng xã hội** (Facebook, Zalo OA, YouTube, TikTok) có link về 43logistics.vn, và nhập các link này vào `/admin/settings/` nhóm Mạng xã hội.
- **Được nhắc trên trang khác**: danh bạ doanh nghiệp, bài tổng hợp "dịch vụ gửi hàng đi …", báo địa phương. Bài trả phí phải ghi rõ là tài trợ.
- **Cộng đồng**: nhân viên trả lời trong nhóm Facebook / diễn đàn về gửi hàng, **ghi rõ mình là nhân viên 43 Logistics**.
- **Đánh giá thật**: khuyến khích khách thật đánh giá trên Google Business Profile.

### D4. Không được làm

- Mua link, trao đổi link, tạo trang vệ tinh.
- Viết đánh giá giả, nhờ người quen đánh giá, hoặc chỉ xin đánh giá từ khách hài lòng.
- Tạo hàng loạt trang hoặc bài do AI viết, nội dung mỏng.
- Đăng bài tài trợ mà không ghi rõ.
- Đưa lên website con số, cam kết chưa được chủ xác nhận (quy tắc 1 trong `AGENTS.md`).

AI và công cụ tìm kiếm hạ điểm các site làm những việc trên, và ADR 0011 cấm chúng.

---

## E. Xử lý khi kết quả không như mong đợi

| Hiện tượng | Kiểm tra | Cách xử lý |
| --- | --- | --- |
| AI nói "không biết 43 Logistics" (P01–P04) | Bing và Google: `site:43logistics.vn` có ra trang chủ không; URL Inspection | Nộp lại sitemap; yêu cầu index trang chủ; kiểm tra phần A1 (robots, Cloudflare) |
| AI biết công ty nhưng **nói sai giá / số ngày** | So với trang tuyến hiện tại và ngày "Bảng giá cập nhật" | Nếu website đúng: lưu lại trang trong admin để IndexNow báo Bing; đợi AI cập nhật (có thể vài tuần). Nếu website sai: sửa bảng giá trong admin |
| AI nhắc tên nhưng **không có link** | Câu trả lời lấy từ nguồn nào (cột `notes`) | Thêm FAQ và nội dung trả lời đúng câu hỏi đó; tăng hồ sơ ngoài website có link về site |
| AI trích **trang cũ hoặc URL WordPress cũ** | Mở link AI đưa ra | URL cũ phải redirect đúng (`pnpm check:redirects`); nếu là trang mới chưa có, ghi vào `notes` để bổ sung nội dung |
| Không thấy IndexNow trong Bing | `https://43logistics.vn/indexnow-key.txt` có trả key không; log app trên VPS có dòng `indexnow: submission failed` không | Báo kỹ thuật. Lưu ý: chỉ khi lưu nội dung **đang publish** trong admin mới gửi ping |
| Câu hỏi chung (P09–P20) mãi không có 43 Logistics | Đối thủ nào hay được nêu (cột `competitors`), họ có mặt ở đâu | Đẩy mạnh phần D3 (hồ sơ doanh nghiệp, được nhắc trên trang khác, đánh giá thật) |
| Lượt truy cập từ AI = 0 dù được trích link | Cloudflare Web Analytics → Referrers | Bình thường lúc đầu; theo dõi theo tháng. Sau G-05, xem thêm nhóm nguồn "AI assistant" trong báo cáo `/admin` |

---

## F. Lịch và phân công gợi ý

| Khi nào | Việc | Ai |
| --- | --- | --- |
| Sau mỗi lần deploy | Phần A (A1–A3), khoảng 10 phút | Kỹ thuật |
| Hằng tuần | Bing Webmaster Tools và Search Console: lỗi index, IndexNow; Cloudflare Referrers | Kỹ thuật hoặc marketing |
| Hằng tuần | `deploy/crawler-report.sh 7` (repo app, chạy trên Mac): bot nào đã ghé 3 site, trang nào được đọc nhiều. Chú ý `Claude-SearchBot`, `ClaudeBot`, `Bravebot`, `OAI-SearchBot` | Kỹ thuật |
| Hằng tháng (tuần đầu) | Phần C: chạy 260 câu hỏi, điền CSV, tính 4 chỉ số, so với tháng trước | Marketing hoặc sale |
| Hằng quý | Xem xu hướng 3 tháng; quyết định ưu tiên nội dung (FAQ, bài viết) và việc ngoài website (phần D3) | Chủ doanh nghiệp |
| Khi đổi bảng giá hoặc quy định hàng hoá | Lưu trong admin (IndexNow tự gửi); kiểm tra lại đoạn tóm tắt trên trang tuyến | Người sửa bảng giá |

---

## G. Danh sách kiểm tra nhanh

**Kỹ thuật (một lần, rồi sau mỗi deploy)**

- [ ] `robots.txt` không chặn bot AI; Cloudflare không chặn bot AI
- [ ] `sitemap.xml` và `llms.txt` có cùng số URL
- [ ] Schema validator: 0 lỗi trên trang chủ, trang tuyến, `/hang-cam-gui/`, một bài viết
- [ ] Trang tuyến có đoạn tóm tắt dưới H1, số liệu khớp bảng giá
- [ ] Bing Webmaster Tools đã xác minh, đã nộp sitemap, IndexNow nhận URL
- [ ] Google Search Console đã xác minh, đã nộp sitemap

**Nội dung và ngoài website (liên tục)**

- [ ] Thông tin công ty và mạng xã hội trong admin đầy đủ và đã xác nhận
- [ ] FAQ cho các tuyến chính
- [ ] Google Business Profile và Bing Places cho từng văn phòng
- [ ] Tên, địa chỉ, số điện thoại giống hệt nhau ở mọi nơi

**Đo lường (hằng tháng)**

- [ ] Chạy bộ 52 câu hỏi × 5 công cụ, ghi vào `data/geo-prompt-panel.csv`
- [ ] Tính tỉ lệ được nhắc, được trích link, độ chính xác, vị trí; so với tháng trước

---

## H. Website chị em: AV Logistics và GT Logistics

> Thêm 2026-11-04. AV (`avlogistics.vn`) và GT (`gtlogistics.vn`) dùng chung cơ sở dữ liệu và admin với 43 (ADR 0012). Phần kỹ thuật GEO (robots, sitemap, `llms.txt`, JSON-LD, đoạn tóm tắt, IndexNow) đã có sẵn trong code của cả hai. Mỗi site là một **công ty riêng**, nên mỗi site cần **công cụ riêng, mã riêng và bộ câu hỏi riêng**.

### H1. Trạng thái (kiểm tra 2026-11-04)

| Việc | AV | GT |
| --- | --- | --- |
| Site chạy HTTPS | Có | Có: `app-gt` chạy, chứng chỉ đã cấp, trả 200 từ VPS, châu Âu và TP.HCM (check-host.net). Riêng mạng FPT ở văn phòng bị **ngắt kết nối** với tên `gtlogistics.vn` (cả HTTP lẫn HTTPS) trong khi AV/43 vào được: lỗi ở đường mạng, không phải ở server |
| `robots.txt`, `sitemap.xml`, `llms.txt` | Có (64 URL ở cả sitemap và llms.txt) | Kiểm tra lại từ mạng khác (4G) |
| JSON-LD `Organization` riêng (`https://avlogistics.vn/#organization`) | Có | Kiểm tra lại từ mạng khác (4G) |
| `BingSiteAuth.xml` | 404: chưa có mã Bing | Chưa |
| `indexnow-key.txt` | 404: chưa có key IndexNow | Chưa |
| Google Search Console | Chưa xác nhận | Chưa |
| Bộ câu hỏi thử | `data/geo-prompt-panel-av.csv` | `data/geo-prompt-panel-gt.csv` |

### H2. Thiết lập một lần cho mỗi site

Làm lần lượt cho AV, rồi cho GT. Google và Bing truy cập từ nước ngoài nên không bị ảnh hưởng bởi lỗi mạng FPT ở trên.

1. **Google Search Console:** thêm thuộc tính **Miền** (`avlogistics.vn` / `gtlogistics.vn`), xác minh bằng bản ghi TXT tại nhà đăng ký tên miền → nộp `https://<site>/sitemap.xml`.
2. **Bing Webmaster Tools:** thêm site (có thể **Nhập từ Google Search Console**) → nếu chọn xác minh bằng file, lấy mã trong file `BingSiteAuth.xml` mà Bing cho tải → gửi mã cho kỹ thuật.
3. **Kỹ thuật, trên VPS** (`/opt/43logistics`):
   - trong `.env.av` (hoặc `.env.gt`): `BING_SITE_VERIFICATION=<mã Bing của site đó>` và `INDEXNOW_KEY=<key mới, riêng cho site đó>` (tạo bằng `openssl rand -hex 16`). **Không dùng lại key hoặc mã của 43.**
   - `.env` của 43 có `REVALIDATE_SECRET` và `SITE_REVALIDATE_URLS=http://app-av:3000,http://app-gt:3000`; `.env.av` / `.env.gt` có cùng `REVALIDATE_SECRET`.
   - khởi động lại `app-av` / `app-gt`, rồi kiểm tra `https://<site>/BingSiteAuth.xml` và `https://<site>/indexnow-key.txt` trả 200.
4. **Bing → Xác minh**, rồi nộp sitemap.
5. **Cloudflare** (khi site đi qua Cloudflare): như phần B, không chặn bot AI.

Thẻ meta `msvalidate.01` trên các trang dựng sẵn cần biến lúc build; file `BingSiteAuth.xml` đã đủ để xác minh, nên không bắt buộc.

### H3. IndexNow cho site chị em

Admin chỉ chạy trên 43logistics.vn. Khi sửa **tuyến, bảng giá hoặc quy định hàng hoá** (dữ liệu dùng chung), 43 gửi thay đổi sang `app-av` và `app-gt`; mỗi site tự báo IndexNow cho **trang của chính nó**, bằng key của nó. Trang, bài viết và FAQ riêng của AV/GT chưa sửa được trong admin (MS-04), nên chưa có ping cho chúng.

### H4. Bộ câu hỏi hằng tháng

- Dùng `data/geo-prompt-panel-av.csv` và `data/geo-prompt-panel-gt.csv`, cùng cách làm phần C.
- P01–P08 nêu tên AV / GT: hỏi riêng cho từng site.
- P09–P20 **giống hệt** bộ của 43: hỏi **một lần**, rồi ghi kết quả của cả ba công ty từ cùng câu trả lời (43 vào file của 43, AV vào file AV, GT vào file GT). Ghi `notes`: "cùng câu trả lời với panel 43".
- Ba công ty cùng xuất hiện trong một câu trả lời là bình thường; không coi nhau là đối thủ trong cột `competitors`.

### H5. Thông tin công ty (admin, theo từng site)

Như phần A4, nhưng cho từng site: chỉ xác nhận tên khác, năm thành lập, mạng xã hội của **chính công ty đó**. Admin chưa có nút chọn site (MS-04), nên hiện tại chủ gửi thông tin cho kỹ thuật nạp bằng `pnpm db:clone-site av|gt`; không sửa trong `/admin/settings/` (ô đó là của 43). Đang thiếu: giờ làm việc và Facebook / Zalo OA của AV; Facebook URL, giờ làm việc, kho và hotline của GT (Q-37).
