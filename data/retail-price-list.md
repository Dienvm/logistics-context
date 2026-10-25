# Bảng giá bán lẻ 43 Logistics: bản chuyển đổi để review

> **Nguồn:** `data/TỔNG HỢP GIÁ BÁN LẺ.xlsx`, do nhân viên kinh doanh gửi, nhận ngày 2026-10-25. File có 27 tab. 15 tab nhập dạng ô, 12 tab chỉ chứa **ảnh chụp bảng giá** (đã chép lại bằng tay từ ảnh; các bảng đó đánh dấu 🖼).
> **Trạng thái:** *chưa xác nhận*. Theo AGENTS.md rule 1, giá chỉ được công khai sau khi chủ doanh nghiệp xác nhận. Checklist §E1 liệt kê các điểm cần kiểm tra tay trước khi nhập vào DB. **Quét lại ngày 2026-10-26:** giá trị trong ô và ảnh không đổi so với lần đầu. Ô, dòng và cột bị **ẩn** trong Excel được xem là không thuộc bảng giá lẻ.
> Chữ **[sic]** đánh dấu chỗ giữ nguyên như bản gốc dù có vẻ sai. Đơn vị là VND nếu không ghi khác.

## Mục lục

- A. Tuyến đi (VN → nước ngoài): A1 Singapore · A2 Malaysia · A3 Hàn Quốc · A4 Đài Loan · A5 Nhật Bản · A6 Philippines · A7 Thái Lan · A8 Mỹ · A9 Canada · A10 Anh · A11 Úc · A12 châu Âu (EU) · A13 Indonesia (chưa dùng)
- B. Tuyến về (nước ngoài → VN): B1 Singapore → VN · B2 Đài Loan → VN · B3 Hàn Quốc → VN · B4 Nhật Bản → VN
- C. Bảng phụ thu dùng chung: C1 phụ thu hải quan Singapore · C2 phụ thu đầu Hà Nội · C3 phụ thu đầu SGN
- D. Quy tắc chung rút ra từ toàn bộ file
- E. Phân tích: lỗi dữ liệu, chênh lệch với DB hiện tại, những gì schema chưa chứa được

---

## A. Tuyến đi (VN → nước ngoài)

### A1. Singapore

#### A1.1 HCM → Singapore (AIR), tab `HCM - SINGAPORE`, giá chưa VAT

| Cân nặng | Đơn giá |
|---|---:|
| 1–2 kg | tối thiểu 600.000 |
| 3–10 kg | 125.000 /kg |
| 11–20 kg | 110.000 /kg |
| 21–100 kg | 94.000 /kg |
| Trên 100 kg | Liên hệ |
| Trên 300 kg | Liên hệ |

- **Thời gian:** nhận hàng sau 1–2 ngày làm việc kể từ ngày bay.
- **Lịch bay:** Thứ 3, 5, 7 hàng tuần.
- **Phụ thu theo mặt hàng (bảng trong tab):**

| Mặt hàng | Phụ thu |
|---|---:|
| Đông lạnh | 10.000 /kg |
| Thuốc / quần áo thương hiệu / mỹ phẩm / tóc / mi giả / sữa / cây | 50.000 /kg |
| Yến | 300.000 /lạng |
| Túi, giày có thương hiệu | 100.000 /cái |
| Hàng pin / cồn / nước hoa / khí nén | 500.000 /kiện |
| Chất lỏng | 300.000 /kiện |
| Laptop / điện thoại | Liên hệ |
| Cây cảnh, tranh, gỗ quý và mặt hàng đặc biệt khác | Liên hệ |

- Tab này còn kèm ảnh **bảng phụ thu hải quan Singapore** (xem C1).

#### A1.2 Hà Nội, Đà Nẵng → Singapore (AIR), tab `HN - SINGAPORE`

| Cân nặng | Đơn giá |
|---|---:|
| 1–2 kg | tối thiểu 600.000 |
| 3–10 kg | 155.000 /kg |
| 11–20 kg | 135.000 /kg |
| Trên 21 kg | 125.000 /kg |

- **Thời gian:** 1–2 ngày làm việc kể từ ngày bay.
- **Lịch bay:** cả tuần, Thứ 2 → Thứ 7.
- **Phụ thu:**

| Mặt hàng | Phụ thu |
|---|---:|
| Đông lạnh | 10.000 /kg |
| Thuốc / quần áo thương hiệu / mỹ phẩm / tóc / mi giả / sữa / cây | 50.000 /kg |
| Yến (tính cả hộp) | 300.000 /lạng |
| Túi, giày có thương hiệu | 100.000 /cái |
| Hàng pin | 600.000 /kiện |
| Sơn móng tay / cồn / nước hoa | 500.000 /kiện |
| Chất lỏng | 300.000 /kiện |

- **Không nhận:** hàng cấm, xịt khí nén kim loại.
- Có kèm ảnh bảng phụ thu hải quan Singapore (C1).

#### Chính sách chung của A1.1 và A1.2

- **Dịch vụ:** trọn gói kiểm tra, đóng gói lại, thông quan, giao nội địa; có mã tracking.
- **Giao nội địa Singapore:** từ 10,5 kg trở xuống thu 300.000 đ/tổng hàng; từ 11 kg miễn phí (tab HN ghi "> 10,5 kg").
- Mặt hàng bị phụ thu, nếu gửi nhiều, có thể thương lượng giá.
- **Trọng lượng quy đổi:** D × R × C / 5000. **Làm tròn** 0,5 kg (ví dụ ghi trong file: 10,6 kg → 11 kg).
- **Bảo hiểm:**
  - Không mua bảo hiểm: đền 50% giá trị hàng, tối đa gấp 2 lần cước.
  - Có mua bảo hiểm (phí = 10% giá trị hàng): đền 100% giá trị hàng và hoàn cước của kiện thất lạc.
  - Không bảo hiểm hàng dễ vỡ, dập nát, rò rỉ nước; hàng dễ hư hỏng, hạn sử dụng ngắn.
- **Điều kiện khiếu nại:** quay video và chụp ảnh khi khui hàng; khiếu nại trong vòng 2 ngày kể từ khi nhận.

#### A1.3 Việt Nam → Singapore (SEA), tab `VN - SINGAPORE (SEA)`, giá tính bằng **SGD**

| Cân nặng | Cước (SGD/kg) | Phí phát hàng (SGD/đơn) |
|---|---:|---:|
| 21–50 kg | 2,5 | 10 |
| 51–100 kg | 2,3 | 10 |
| 101–200 kg | 2,0 | — |
| 201–500 kg | 1,8 | — |
| 501–1000 kg | 1,5 | — |
| 1001–3000 kg | 1,1 | — |
| 3001–5000 kg | 0,9 | — |

| Hàng quá khổ (tính theo CBM) | Giá |
|---|---:|
| Dưới 5 CBM | 5.000.000 đ/khối |
| Trên 5 CBM | 4.800.000 đ/khối |

- Giá đã bao gồm giao tận nơi ở Singapore. Tỷ giá theo thị trường tại thời điểm thanh toán.
- Dòng thời gian ghi "Nhận hàng sau 2–4 ngày làm việc kể từ ngày bay" và "Bay mỗi ngày trong tuần" **[sic, có vẻ chép từ tab AIR]**.
- Làm tròn lên 0,5 kg (ví dụ 20,3 → 20,5 kg); trọng lượng tính cước lấy số lớn hơn giữa cân thực và D × R × C / 5000.
- **Bảo hiểm:**
  - Không khai giá trị, hoặc khai nhưng không mua bảo hiểm: thất lạc đền 2 lần cước.
  - Bảo hiểm tự chọn 12% giá trị khai báo: đền 100% giá trị.
  - Hải quan hủy hàng: hoàn cước, không đền hàng.
  - Điều kiện: video và ảnh khi khui; khiếu nại trong 2 ngày.

### A2. Malaysia

#### A2.1 Hà Nội, Đà Nẵng → Malaysia (AIR), tab `HN, ĐN-MALAY`

| Cân nặng | Đơn giá |
|---|---:|
| 1 kg | tối thiểu 450.000 |
| 2–6 kg | 163.000 /kg |
| 6–10 kg | 123.000 /kg |
| 11–100 kg | 116.000 /kg |
| Trên 100 kg | Liên hệ |
| Trên 300 kg | Liên hệ |

| Mặt hàng | Phụ thu |
|---|---:|
| Thực phẩm khô | 10.000 /kg |
| TP đông lạnh, trái cây tươi | 20.000 /kg |
| Mỹ phẩm nước ngoài | 50.000 /kg |
| Mỹ phẩm trong nước | 20.000 /kg |
| Thuốc, hàng fake | 50.000 /kg |
| Hàng có pin | 800.000 /kiện |
| Chất lỏng (số lượng lớn: liên hệ) | 400.000 /kiện |
| Cây cảnh, máy móc thiết bị (không pin), mặt hàng đặc biệt khác | Liên hệ |

- **Thời gian:** 2–4 ngày làm việc kể từ ngày bay. **Lịch bay:** Thứ 5, 7.

#### A2.2 HCM → Malaysia (AIR), tab `HCM-MALAY (C)` (tab có cả ảnh, nội dung khớp với ô)

| Cân nặng | Đơn giá |
|---|---:|
| 1 kg | tối thiểu 400.000 |
| "Dưới 2–6 kg" **[sic]** | 130.000 /kg |
| 6–10 kg | 95.000 /kg |
| 11–100 kg | 88.000 /kg |
| Trên 100 kg | Liên hệ |
| Trên 300 kg | Liên hệ |

| Mặt hàng | Phụ thu |
|---|---:|
| TP khô / TP đông lạnh | 10.000 /kg |
| Mỹ phẩm nước ngoài | 50.000 /kg |
| Mỹ phẩm trong nước | 20.000 /kg |
| Thuốc, hàng fake | 50.000 /kg |
| Hàng có pin | 600.000 /kiện |
| Nước hoa | Liên hệ |
| Chất lỏng | 200.000–400.000 /kiện |
| Cây cảnh, máy móc thiết bị (không pin), mặt hàng đặc biệt khác | Liên hệ |

- **Thời gian:** 2–4 ngày làm việc. **Lịch bay:** Thứ 5, 7; cut-off 9h Thứ 2, 4, 6.

#### Chính sách chung của A2.1 và A2.2

- **Giao nội địa Malaysia:** dưới 11 kg thu 200.000 đ/tổng hàng; từ 11 kg miễn phí.
- **Vùng sâu vùng xa** (Sarawak, Sabah): +80.000 đ/kg.
- Hàng bị phụ thu gửi nhiều có thể thương lượng. Quy đổi D × R × C / 5000; làm tròn 0,5 kg.
- **Bảo hiểm:**
  - Hàng dễ hư hỏng (trái cây, thực phẩm): chỉ đền khi giao trễ quá thời gian cam kết.
  - Mất hàng: đền 100% giá trị khi khách mua bảo hiểm 10–20% giá trị hàng.
  - Trường hợp khác: đền khi có hóa đơn mua hàng, tối đa 200 USD.
  - Điều kiện: video và ảnh khi khui; khiếu nại trong 2 ngày.

#### A2.3 HCM → Malaysia (SEA), tab `VN - MALAY (SEA)`

| Cân nặng | Quần áo, thực phẩm | Mỹ phẩm |
|---|---:|---:|
| Dưới 50 kg | tối thiểu 50 kg | — |
| 50–100 kg | 42.000 /kg | 47.000 /kg |
| 101–300 kg | 38.000 /kg | 43.000 /kg |
| 301–500 kg | 35.000 /kg | 40.000 /kg |
| 501–1000 kg | 30.000 /kg | 35.000 /kg |
| Trên 1000 kg | 26.000 /kg | 31.000 /kg |

| Hàng quá khổ (CBM) | Giá |
|---|---:|
| Dưới 5 CBM | 240 USD/CBM |
| Trên 5 CBM | 230 USD/CBM |
| Hàng thực phẩm, mỹ phẩm | +10 USD/CBM |

- **Thời gian:** 6–10 ngày làm việc kể từ ngày tàu chạy. Tab còn ghi "2–4 ngày kể từ ngày bay; bay mỗi ngày" **[sic, mâu thuẫn]**.
- Vùng sâu vùng xa (Sarawak, Sabah): +80.000 đ/kg.
- **Bảo hiểm:** thất lạc đền tối đa 5 lần cước tùy trường hợp (đã gồm cước). Hàng giá trị cao nên khai báo và cân nhắc mua bảo hiểm.
- Làm tròn 0,5 kg; quy đổi / 5000; khiếu nại trong 2 ngày, cần video khi khui.

### A3. Hàn Quốc

#### A3.1 Hàng khô VN → Hàn Quốc (AIR), tab `VN- HÀN (khô)`, giá chưa VAT

| Điểm gửi | Cân nặng | Cước |
|---|---|---:|
| Hà Nội (chậm) | ≥ 3 kg | 85.000 /kg |
| Hà Nội (nhanh) | ≥ 3 kg | 100.000 /kg |
| Hồ Chí Minh | ≥ 3 kg | 95.000 /kg |
| Đà Nẵng, Quảng Trị, Huế, Quảng Bình | ≥ 3 kg | 79.000 /kg |
| ″ | trên 50 kg | 76.000 /kg |
| ″ | trên 100 kg | 72.000 /kg |

- **Thời gian:** 2–5 ngày làm việc kể từ ngày bay. **Lịch bay:** mỗi ngày.
- **Bảo hiểm:** thất lạc, mất mát tối đa 150 USD (đã gồm cước); cần video khi mở hàng, khiếu nại trong 24 giờ.

#### A3.2 Hàng đông lạnh VN → Hàn Quốc (AIR), tab `VN- HÀN (ĐÔNG LẠNH)`

| Điểm gửi | Cân nặng | Cước |
|---|---|---:|
| Hà Nội | ≥ 3 kg | 100.000 /kg |
| Hồ Chí Minh | ≥ 3 kg | 103.000 /kg |
| Đà Nẵng, Huế, Quảng Bình, Quảng Trị | ≥ 3 kg | 87.000 /kg |
| ″ | ≥ 50 kg | 83.000 /kg |
| ″ | ≥ 100 kg | 81.000 /kg |

- **Thời gian:** 2–5 ngày làm việc. **Lịch bay:** chỉ Thứ 2, Thứ 3.
- **Dịch vụ cấp đông:** 130.000 đ/kiện.
- *Cột E (ưu đãi sản lượng Đà Nẵng 75.000 / 70.000 / 67.000 đ/kg) bị **ẩn** trong file, nên không thuộc bảng giá lẻ và không đưa lên web.*
- **Bảo hiểm:**
  - Hàng có bao bì, nhãn mác mới được bảo hiểm; công ty hỗ trợ dán nhãn.
  - Thất lạc tối đa 150 USD.
  - Hàng đông lạnh đi kèm đá gel: từ ngày 2 đến 5 sau ngày bay, nếu hàng có vấn đề thì không đền; từ ngày thứ 6 đền theo giá trị, tối đa 150 USD.
  - Video khi mở hàng; khiếu nại trong 24 giờ.

#### Chính sách chung của A3

- Giao nội địa Hàn Quốc: dưới 3 kg thu 200.000 đ/tổng hàng; từ 3 kg miễn phí.
- Làm tròn 0,5 kg; quy đổi D × R × C / 5000.

### A4. Đài Loan

#### A4.1 Hàng khô VN → Đài Loan (AIR), tab `VN- ĐÀI (khô)`, gồm hải sản khô và nước mắm; giá chưa VAT

| Điểm gửi | Cước |
|---|---:|
| Đà Nẵng, Quảng Bình, Quảng Trị, Huế | 93.000 /kg |
| Hồ Chí Minh (hỏi trước với hàng mắm, hải sản) | 100.000 /kg |
| Hà Nội | 110.000 /kg |

*Ô lưu 93 / 100 / 110 nhưng format `#,##0.000` hiển thị thành 93.000 / 100.000 / 110.000. Cột "Cân nặng" (1–300 kg) và các dòng 6–9 ("Trên 100 kg", "Trên 300 kg") bị **ẩn**, nên mỗi điểm gửi chỉ có một đơn giá, không chia khung cân.*

- **Thời gian:** 3–5 ngày làm việc kể từ ngày bay.
- **Giao nội địa Đài Loan:** dưới 3 kg thu 200.000 đ/tổng hàng; từ 3 kg miễn phí.
- **Quy định:**
  - Gửi về cửa hàng tiện lợi: tối đa 5 kg/kiện, phụ thu 100.000 đ/kiện.
  - Sai địa chỉ hoặc số điện thoại: 100.000 đ cho mỗi lần sửa.
  - Làm tròn 0,5 kg; hàng cồng kềnh quy đổi / 5000.
- **Bảo hiểm:**
  - Hàng thường (quần áo, bánh kẹo, mỹ phẩm, TPCN, phụ kiện): bảo hiểm 100% nếu mất hoặc vỡ.
  - Hàng giá trị cao (trầm hương, tổ yến, đồng hồ, tai nghe, nước hoa…; phải hỏi trước): phụ phí 15% giá trị.
  - Không bảo hiểm chất lỏng dễ lên men (mật ong, đồ chua, sữa tươi), hồ sơ và giấy tờ tùy thân.
  - Hàng cồng kềnh hoặc dễ vỡ không bảo hiểm được thì công ty báo trước khi bay.
- **Khiếu nại:**
  - Cần cả video lẫn hình khi khui hàng (chỉ có hình thì không nhận).
  - Trong 15 ngày kể từ ngày công ty nhận hàng: hàng ẩm, mốc, chua, lên men thì không đền; sau 15 ngày, công ty chịu trách nhiệm.
  - Chỉ nhận khiếu nại trong 3 ngày kể từ khi nhận hàng.

#### A4.2 Hàng đông lạnh VN → Đài Loan (AIR), tab `VN- ĐÀI (ĐÔNG LẠNH)`

| Điểm gửi | Cước | Phụ thu cấp đông | Chính sách riêng |
|---|---:|---:|---|
| Đà Nẵng, Huế, Quảng Bình, Quảng Trị | 105.000 /kg | 50.000 /kiện | Không nhận hải sản, thịt. Nhận bánh gai, bánh lọc nhân chay, chè lam… Bảo hiểm 100% khi có video khui trong 5 giờ sau khi nhận. Giao 4–6 ngày (trừ T7, CN). Làm tròn 0,5 kg. |
| Hà Nội | 120.000 /kg | 50.000 /kiện | Không nhận hải sản, thịt. Bảo hiểm 100% nếu mua bảo hiểm 10% giá trị; không mua thì đền 80% giá trị (không gồm cước). |
| Hồ Chí Minh | 110.000 /kg | 50.000 /kiện | Bắt buộc kiểm tra hàng khi nhận cùng nhân viên giao; hàng hỏng thì từ chối nhận để công ty xử lý đền bù. |

- Giao nội địa Đài Loan: dưới 3 kg thu 200.000 đ; từ 3 kg miễn phí.

### A5. Nhật Bản, tab `VN-Nhật Bản`, giá chưa VAT

| Cân nặng | Đơn giá |
|---|---:|
| 0,5 kg | 886.500 /đơn |
| 1 kg | 975.000 /đơn |
| Trên 1 kg – 5 kg | 1.176.000 /đơn |
| Trên 5 kg – 10 kg | 157.000 /kg |
| Trên 10 kg | 147.000 /kg |

- **Thời gian:** 4–7 ngày làm việc kể từ ngày bay. *Dòng "Lịch bay: Thứ 2, 4, 6" bị **ẩn** trong file, nên không hiển thị.*
- **Nhận vận chuyển:** cá, mực, hải sản khô, các loại mắm, quần áo, giày dép cũ và mới, đồ gia dụng, gia vị, đặc sản, chất lỏng, mỹ phẩm, hồ sơ giấy tờ, trang sức, thuốc tây/nam/bắc…
- **Cách tính:** tính cước theo **từng kiện**; **làm tròn lên 1 kg** (1,05 kg → 2 kg); quy đổi / 5000.
- **Bảo hiểm:** đơn tài liệu 200.000 đ/đơn; hàng cá nhân tối đa 4,3 triệu/đơn (đã gồm cước). Khách khai giá trị trước khi gửi, quay video khi mở; khiếu nại trong 24 giờ.

### A6. Philippines (Hà Nội, HCM → Philippines), tab `VN-PHILIP`

| Cân nặng | Đơn giá |
|---|---:|
| Dưới 5 kg | 300.000 /kg |
| 6–10 kg | 280.000 /kg |
| 11–30 kg | 270.000 /kg |
| Trên 30 kg | 235.000 /kg |

- Chưa gồm phí giao nội địa Philippines. Mặt hàng đặc biệt có phụ thu riêng (không có bảng).
- Dịch vụ: kiểm tra, đóng gói lại, thông quan, tracking (không có giao nội địa).
- **Bảo hiểm:** thất lạc tối đa 2 lần cước (đã gồm cước); cần video trước khi mở. Hỏi CSKH để biết chi tiết.
- Làm tròn 0,5 kg; trọng lượng tính cước lấy số lớn hơn giữa cân thực và quy đổi / 5000.
- *Không có thời gian giao, không có lịch bay.*

### A7. Thái Lan (HCM → Thái Lan, đường **xe**), tab `XE HCM - THÁI` 🖼

| Cân nặng | Đơn giá |
|---|---:|
| Tối thiểu | 50 kg |
| 50–99 kg | 65.000 /kg |
| Trên 100 kg | 60.000 /kg |
| Trên 1 tấn | 55.000 /kg |

- Áp dụng cho **hàng tạp**. Nếu toàn quần áo trẻ em không thương hiệu, hỏi lại để có giá tốt hơn.
- **Giao hàng:** 9–12 ngày làm việc (trừ T7, CN). Hàng thường chốt Thứ 3, 5, 7.
- **Phí giao:** cước đã gồm giao tại Bangkok; các tỉnh khác thu thêm 15% tổng cước. Quy đổi / 5000.
- **Bảo hiểm:**
  - Mua bảo hiểm 10% giá trị khai báo: đền 100% giá trị.
  - Không mua: đền gấp đôi cước khi thất lạc, mất mát hoặc bị hải quan nước sở tại tịch thu, tối đa 100 USD.
  - Phải quay video khui hàng.

### A8. Mỹ

#### A8.1 Bay nhanh, tab `VN - USA BAY NHANH` 🖼. Line 5–7 ngày, **chưa gồm thuế nhập khẩu**

| Kg | Tổng cước | Kg | Tổng cước |
|---:|---:|---:|---:|
| 1 | 1.680.102 | 11 | 5.173.296 |
| 2 | 2.154.749 | 12 | 5.356.500 |
| 3 | 2.626.859 | 13 | 5.504.967 |
| 4 | 3.086.300 | 14 | 5.621.048 |
| 5 | 3.547.767 | 15 | 5.734.784 |
| 6 | 3.802.652 | 16 | 5.849.454 |
| 7 | 4.189.912 | 17 | 5.965.536 |
| 8 | 4.563.504 | 18 | 6.082.086 |
| 9 | 4.866.312 | 19 | 6.198.167 |
| 10 | 5.127.138 | 20 | 6.313.309 |
| | | Trên 21 kg | 301.000 /kg |

- Làm tròn **1 kg**; DIM / 5000.
- **Thuế nhập khẩu** (khách trả khi nhận, hoặc trả trước tại VN): dưới 10 kg 40 USD; 10–20 kg 60 USD; trên 21 kg 80 USD.

#### A8.2 Bay chậm, tab `VN - USA BAY CHẬM` 🖼. Ảnh có tiêu đề **"Bảng giá gửi hàng Huế - USA (CT - đi chậm)"**

| Kg | California | Ngoài California | | Kg | California | Ngoài California |
|---:|---:|---:|---|---:|---:|---:|
| 0,5 | 968.260 | 989.778 | | 11,0 | 4.117.819 | 4.163.399 |
| 1,0 | 1.007.298 | 1.029.891 | | 11,5 | 4.271.632 | 4.322.150 |
| 1,5 | 1.156.420 | 1.199.961 | | 12,0 | 4.425.446 | 4.480.900 |
| 2,0 | 1.305.541 | 1.370.031 | | 12,5 | 4.579.102 | 4.640.948 |
| 2,5 | 1.454.970 | 1.535.208 | | 13,0 | 4.732.757 | 4.800.995 |
| 3,0 | 1.604.398 | 1.700.384 | | 13,5 | 4.888.640 | 4.967.293 |
| 3,5 | 1.754.361 | 1.863.556 | | 14,0 | 5.044.521 | 5.133.589 |
| 4,0 | 1.904.325 | 2.026.728 | | 14,5 | 5.199.290 | 5.294.285 |
| 4,5 | 2.055.514 | 2.188.721 | | 15,0 | 5.354.059 | 5.454.981 |
| 5,0 | 2.206.703 | 2.444.742 | | 15,5 | 5.510.658 | 5.617.329 |
| 5,5 | 2.438.201 | 2.474.329 | | 16,0 | 5.667.258 | 5.779.675 |
| 6,0 | 2.581.430 | 2.597.943 | | 16,5 | 5.822.903 | 5.938.368 |
| 6,5 | 2.736.040 | 2.753.805 | | 17,0 | 5.978.547 | 6.097.059 |
| 7,0 | 2.890.650 | 2.909.666 | | 17,5 | 6.134.032 | 6.263.355 |
| 7,5 | 3.045.578 | 3.068.476 | | 18,0 | 6.289.517 | 6.429.651 |
| 8,0 | 3.200.505 | 3.227.285 | | 18,5 | 6.449.777 | 6.590.938 |
| 8,5 | 3.353.763 | 3.384.975 | | 19,0 | 6.610.036 | 6.752.223 |
| 9,0 | 3.507.020 | 3.542.664 | | 19,5 | 6.763.294 | 6.914.098 |
| 9,5 | 3.661.471 | 3.702.121 | | 20,0 | 6.916.551 | 7.075.973 |
| 10,0 | 3.815.920 | 3.861.579 | | 20,5 | 7.050.982 | 7.213.742 |
| 10,5 | 3.966.869 | 4.012.489 | | | | |

| Từ 21 kg (giá /kg) | California | Ngoài California |
|---|---:|---:|
| 21–44 kg | 305.000 | 320.000 |
| 45–70 kg | 300.000 | 315.000 |
| 71–99 kg | 300.000 | 315.000 |
| 100–299 kg | 300.000 | 315.000 |

- *Ảnh không ghi thời gian giao, làm tròn, thuế hay bảo hiểm.*

### A9. Canada, tab `AIR VN - CANADA` 🖼. **Áp dụng từ 24/4/2026; đã gồm thuế nhập khẩu vào Canada**

Hai bảng con (bang BC, AB, SK, NT, YT và bang ON, QC, MB, NS, NB, NL) có **giá giống hệt nhau**:

| Kg | Tổng cước | Kg | Giá /kg |
|---:|---:|---|---:|
| 1,0 | 1.392.000 | 5,5–10 kg | 441.000 |
| 1,5 | 1.780.600 | 10,5–15 kg | 421.000 |
| 2,0 | 2.117.000 | 15,5–19,5 kg | 405.000 |
| 2,5 | 2.356.250 | 20–44 kg | 340.000 |
| 3,0 | 2.639.000 | Trên 45 kg | 327.000 |
| 3,5 | 2.878.250 | Trên 100 kg | 325.000 |
| 4,0 | 3.190.000 | | |
| 4,5 | 3.454.625 | | |
| 5,0 | 3.770.000 | | |

- **Lịch bay:** Thứ 6 hằng tuần, cắt hàng Thứ 5. Kiện đóng tối đa 22 kg.
- Hàng nhẹ quy đổi / 5000; làm tròn 0,5 kg mỗi kiện. **Đền 100% cước** nếu mất hoặc hủy hàng.
- Thùng carton trơn, không chữ; nếu có chữ phải dán băng keo vàng che lại (ghi chú nằm trong tab EU).

### A10. Anh (HCM → UK), tab `AIR HCM - UK` 🖼

| Kg | Tổng cước | Kg | Tổng cước |
|---:|---:|---:|---:|
| 0,5 | 1.110.340 | 10,5 | 3.733.119 **[sic: rẻ hơn 10,0 kg]** |
| 1,0 | 1.272.883 | 11,0 | 3.882.161 |
| 1,5 | 1.420.926 | 11,5 | 4.002.521 |
| 2,0 | 1.559.297 | 12,0 | 4.137.222 |
| 2,5 | 1.698.001 | 12,5 | 4.285.422 |
| 3,0 | 1.865.706 | 13,0 | 4.418.774 |
| 3,5 | 2.004.410 | 13,5 | 4.554.824 |
| 4,0 | 2.151.815 | 14,0 | 4.689.526 |
| 4,5 | 2.274.570 | 14,5 | 4.822.876 |
| 5,0 | 2.443.724 | 15,0 | 4.959.152 |
| 5,5 | 2.489.879 | 15,5 | 4.713.840 **[sic: rẻ hơn 15,0 kg]** |
| 6,0 | 2.634.302 | 16,0 | 4.835.874 |
| 6,5 | 2.769.623 | 16,5 | 4.957.907 |
| 7,0 | 2.895.144 | 17,0 | 5.079.940 |
| 7,5 | 3.039.898 | 17,5 | 5.201.974 |
| 8,0 | 3.188.296 | 18,0 | 5.324.007 |
| 8,5 | 3.322.694 | 18,5 | 5.446.040 |
| 9,0 | 3.457.092 | 19,0 | 5.568.074 |
| 9,5 | 3.605.490 | 19,5 | 5.690.107 |
| 10,0 | 3.753.888 | 20,0 | 5.839.640 |

| Từ 21 kg | Giá /kg |
|---|---:|
| 21–99 kg | 291.000 |
| 100–299 kg | 276.000 |

- *Ảnh có thể bị cắt ở cuối; không có dòng ≥ 300 kg, thời gian giao, lịch bay hay bảo hiểm.*

### A11. Úc (HCM → Úc), tab `AIR HCM - ÚC` 🖼

| | Dưới 11 kg | Trên 11 kg |
|---|---:|---:|
| Đơn giá | 230.000 /kg | 175.000 /kg |
| Phí giao hàng | 300.000 /đơn | Miễn phí |

- Làm tròn 0,5 kg (2,3 → 2,5 kg). Hàng nhẹ, cồng kềnh quy đổi / 5000.
- **Lịch bay:** Thứ 2 → Thứ 6 (chốt hàng trước 1 ngày). **Thời gian:** dự kiến 10–15 ngày tùy khu vực.
- **Đền bù:** 100% **tiền cước** nếu mất, thất lạc.

### A12. Châu Âu (EU), tab `VN - EU`, "chuyên tuyến EU, phát bằng DHL, 7–14 ngày làm việc, AIR-EU-PRIORITY"

**Vùng (zone):**

| Zone | Quốc gia |
|---|---|
| 1 | Germany |
| 2 | Netherlands, Poland |
| 3 | Austria, Belgium, Denmark, France, Hungary, Italy, Luxembourg, Monaco, Slovakia, Slovenia, Spain |
| 4 | Bulgaria, Czech Republic, Estonia, Latvia, Lithuania, Portugal, Romania |
| 5 | Sweden, Finland |
| 6 | Croatia, Great Britain, Greece, Ireland |
| 7 | Republic of Cyprus, Malta |

Line EUT miễn thuế cho kiện dưới 150 EUR. Mỗi địa chỉ EU đi tối đa 100 kg; sản lượng nhiều thì công ty hỗ trợ tách chuyến.

**Tổng cước (VND) theo cân nặng; dòng "21+" là giá /kg:**

| Kg | Zone 1 | Zone 2 | Zone 3 | Zone 4 | Zone 5 | Zone 6 | Zone 7 |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0,5 | 495.428 | 613.139 | 753.591 | 796.800 | 944.248 | 730.188 | 4.811.104 |
| 1,0 | 638.803 | 765.580 | 961.220 | 942.889 | 1.095.833 | 910.158 | — |
| 1,5 | 791.119 | 918.023 | 1.115.549 | 1.101.778 | 1.247.418 | 1.090.127 | — |
| 2,0 | 935.493 | 1.070.465 | 1.269.880 | 1.260.666 | 1.398.003 | 1.270.096 | — |
| 2,5 | 1.094.524 | 1.222.908 | 1.423.208 | 1.419.556 | 1.549.589 | 1.450.066 | — |
| 3,0 | 1.238.899 | 1.376.350 | 1.577.538 | 1.578.445 | 1.701.173 | 1.630.034 | — |
| 3,5 | 1.400.833 | 1.528.792 | 1.718.869 | 1.737.334 | 1.852.760 | 1.811.004 | — |
| 4,0 | 1.545.208 | 1.603.234 | 1.820.198 | 1.896.222 | 2.004.345 | 1.990.973 | — |
| 4,5 | 1.689.583 | 1.713.808 | 1.858.827 | 2.055.112 | 2.154.930 | 2.070.056 | — |
| 5,0 | 1.704.991 | 1.825.399 | 2.007.780 | 2.029.885 | 2.116.842 | 2.225.685 | — |
| 5,5 | 1.802.052 | 1.894.947 | 2.072.834 | 2.100.973 | 2.178.125 | 2.211.368 | — |
| 6,0 | 1.930.514 | 2.028.642 | 2.206.317 | 2.240.623 | 2.310.809 | 2.368.948 | — |
| 6,5 | 2.057.977 | 2.162.338 | 2.340.802 | 2.380.272 | 2.444.491 | 2.525.530 | — |
| 7,0 | 2.186.440 | 2.296.033 | 2.475.288 | 2.519.922 | 2.578.174 | 2.682.111 | — |
| 7,5 | 2.314.903 | 2.430.729 | 2.608.773 | 2.659.572 | 2.711.856 | 2.839.692 | — |
| 8,0 | 2.443.366 | 2.564.426 | 2.743.258 | 2.799.222 | 2.844.538 | 2.996.274 | — |
| 8,5 | 2.570.828 | 2.698.120 | 2.827.743 | 2.938.872 | 2.978.220 | 3.127.855 | — |
| 9,0 | 2.699.291 | 2.769.316 | 2.937.229 | 3.053.522 | 3.111.904 | 3.236.329 | — |
| 9,5 | 2.827.755 | 2.832.598 | 3.050.222 | 3.130.672 | 3.244.586 | 3.292.018 | — |
| 10,0 | 2.804.775 | 2.981.104 | 3.252.527 | 3.321.867 | 3.295.625 | 3.360.711 | — |
| 10,5 | 2.844.339 | 2.995.149 | 3.199.882 | 3.293.824 | 3.300.191 | 3.285.533 | 4.694.242 |
| 11,0 | 2.960.206 | 3.118.497 | 3.325.509 | 3.374.598 | 3.424.416 | 3.421.752 | 4.880.531 |
| 11,5 | 3.077.073 | 3.242.845 | 3.450.136 | 3.502.374 | 3.549.642 | 3.557.972 | 5.066.819 |
| 12,0 | 3.193.939 | 3.366.192 | 3.575.762 | 3.631.147 | 3.674.867 | 3.694.190 | 5.253.108 |
| 12,5 | 3.310.807 | 3.489.540 | 3.701.390 | 3.759.921 | 3.800.093 | 3.829.410 | 5.438.396 |
| 13,0 | 3.426.674 | 3.612.888 | 3.826.016 | 3.888.696 | 3.924.319 | 3.965.628 | 5.624.685 |
| 13,5 | 3.543.541 | 3.736.236 | 3.951.644 | 4.017.469 | 4.049.544 | 4.101.848 | 5.810.973 |
| 14,0 | 3.660.409 | 3.860.583 | 4.077.270 | 4.146.244 | 4.174.770 | 4.237.067 | 5.997.262 |
| 14,5 | 3.777.275 | 3.983.931 | 4.202.897 | 4.275.018 | 4.298.996 | 4.373.285 | 6.183.550 |
| 15,0 | 3.894.142 | 4.107.279 | 4.327.524 | 4.403.792 | 4.424.221 | 4.509.505 | 6.368.838 |
| 15,5 | 4.041.998 | 4.230.627 | 4.453.151 | 4.532.567 | 4.549.447 | 4.644.724 | 6.555.127 |
| 16,0 | 4.158.866 | 4.354.974 | 4.578.778 | 4.661.341 | 4.673.672 | 4.780.943 | 6.741.415 |
| 16,5 | 4.275.732 | 4.478.322 | 4.703.405 | 4.790.116 | 4.798.898 | 4.917.161 | 6.927.704 |
| 17,0 | 4.392.599 | 4.601.670 | 4.829.031 | 4.918.889 | 4.924.124 | 5.053.382 | 7.113.992 |
| 17,5 | 4.508.465 | 4.725.018 | 4.954.658 | 5.047.664 | 5.048.349 | 5.188.600 | 7.299.281 |
| 18,0 | 4.625.334 | 4.848.365 | 5.080.286 | 5.176.438 | 5.173.575 | 5.324.818 | 7.485.569 |
| 18,5 | 4.742.200 | 4.972.713 | 5.204.912 | 5.305.212 | 5.298.801 | 5.461.039 | 7.671.858 |
| 19,0 | 4.859.067 | 5.096.061 | 5.330.538 | 5.433.987 | 5.424.026 | 5.596.257 | 7.858.146 |
| 19,5 | 4.974.934 | 5.219.409 | 5.456.166 | 5.561.761 | 5.548.252 | 5.732.476 | 8.044.435 |
| 20,0 | 5.091.801 | 5.342.756 | 5.580.793 | 5.690.535 | 5.673.477 | 5.868.695 | 8.229.723 |
| 20,5 | 5.235.674 | 5.467.104 | 5.706.421 | 5.819.309 | 5.798.703 | 6.004.915 | 8.416.012 |
| 21+ | 243.000 | 255.000 | 265.000 | 270.000 | 278.000 | 293.000 | 343.000 |

- Zone 7 chỉ có giá 0,5 kg và từ 10,5 kg trở lên; **1,0–10,0 kg để trống**. Zone 1: 10,0 kg (2.804.775) **rẻ hơn** 9,5 kg (2.827.755).

**Giới hạn trọng lượng và kích thước:**

- Tối đa 50 kg/địa chỉ với line EUT; 100 kg/địa chỉ với line EUBH. Tối đa **23 kg/kiện**; nặng hơn phải tách.
- Đơn từ 2 thùng trở lên: mỗi thùng phải trên 12 kg, nếu không thì tính giá lẻ dưới 12 kg.
- Kích thước tối đa 100 × 60 × 60 cm; tối thiểu 15 × 15 × 10 cm.
- Phụ thu quá khổ:
  - Cạnh dài quá 120 cm: 350.000 đ/kiện.
  - Rộng và cao đều trên 60 cm: 22 EUR.
  - Cân thực hoặc DIM (D × R × C / **6000**) trên 23 kg: 300.000 đ/kiện.
  - Kiện hình trụ, tròn, méo: 300.000 đ/kiện.
  - Kiện đóng gỗ, kim loại, xốp: 350.000 đ/kiện.
- Malta, Cyprus, Greece: phụ thu 600.000 đ/kiện; kiện nhỏ nhất tính 10 kg.
- Chưa nhận hàng quá khổ. Không có phụ phí vùng sâu vùng xa. Bảng giá **chưa gồm phụ thu hải quan** (xem C2, C3).
- Máy móc, motor, hàng giá trị cao, hàng ít khi đi: hỏi trước.

**Chính sách đền bù** (văn bản gốc viết cho "quý đối tác", tóm tắt):

- Kiện hàng thường bị hải quan giữ 1–3 tháng: không đền trong thời gian này.
- Lỗi của 43 Logistics làm hàng không giao được: hỗ trợ 160.000 đ/kg (gồm cước và hàng), không đền theo giá trị.
- Hải quan EU giữ hàng:
  - Đã cung cấp giấy tờ mà kiện vẫn bị hủy: 120.000 đ/kg, tối đa 110 USD/bill.
  - Không cung cấp được giấy tờ: 130.000 đ/kg, tối đa 110 USD/bill, không hoàn cước.
- Thông quan lần 2 không được chấp nhận: hàng về kho thì phát lại có thu phí; hủy hoặc thất lạc thì không đền.
- Không đền (không hoàn cước, không đền hàng) với: thịt, trứng, sữa, hàng giả, cá khô, thực phẩm lỏng (nước tương, nước mắm, sốt), thuốc, TPCN, yến, bột, thực phẩm mùi nặng bị tịch thu. Kiện có lẫn các mặt hàng này cũng không đền, kể cả phần hàng thường.
- Che giấu yến bị tịch thu: không hỗ trợ.
- Hàng hỏng do đi lâu: giảm 15–20% cước. Không áp dụng khi hải quan giữ, gặp bất khả kháng hay backlog cuối năm.
- Hàng bị bể, móp do va đập: không đền. Hàng dễ vỡ cần công văn cam kết.
- Mất toàn bộ hoặc thất lạc khi mã chưa chạy: giải quyết trong 30 ngày; hoàn 100% cước + 140.000 đ/kg, tối đa 100 USD/bill, chỉ đền kiện bị mất.
- Kiện quay đầu (không ai nhận…) quá 45 ngày hoặc thất lạc: hỗ trợ 50.000 đ/kg.
- DPD/DHL làm thất lạc: 140.000 đ/kg, tối đa 120 USD/bill, không hoàn cước. Khiếu nại kiện báo "đã giao" trong 3 ngày.
- Thực phẩm hết hạn, mốc, ẩm: không đền. Bất khả kháng (chiến tranh, thiên tai…): miễn trách nhiệm.
- Thời gian vận chuyển chỉ để tham khảo, không cam kết. Phải khai đúng kg hàng phụ thu trong invoice.
- Hải quan có thể phụ thu trực tiếp hàng giá trị cao. Nếu khách không đồng ý và yêu cầu trả hàng, phải trả cước bay và phí rút hàng.
- Sai địa chỉ: hoàn về có thu phí, không đền.

### A13. Indonesia (HCM → Indonesia, AIR), tab `VN- INDO`, **tab đánh dấu "CHƯA DÙNG"**

| Cân nặng | Batam (3–5 ngày) | Jakarta / Bandung (5–8) | Medan (5–8) | Surabaya (5–8) | Bali (8–10) |
|---|---:|---:|---:|---:|---:|
| 5–10 kg | 300.000 | 335.000 | 310.000 | 340.000 | 350.000 |
| 11–25 kg | 295.000 | 330.000 | 305.000 | 335.000 | 345.000 |
| 26–50 kg | 285.000 | 320.000 | 295.000 | 325.000 | 335.000 |
| 51–100 kg | 255.000 | 290.000 | 265.000 | 295.000 | 305.000 |
| 101–299 kg | 240.000 | 275.000 | 250.000 | 280.000 | 290.000 |
| 300–499 kg | 225.000 | 260.000 | 235.000 | 265.000 | 275.000 |
| 500 kg trở lên | 210.000 | 245.000 | 220.000 | 250.000 | 260.000 |

- **Phụ thu:**
  - Hàng fake: 30.000/kg
  - Thuốc tây, TPCN: 50.000/kg
  - Mỹ phẩm: 20.000/kg
  - Chất lỏng: 300.000/lít
  - Cây: 50.000/cây
  - Máy có pin: 300.000/cái
  - Yến: 200.000/lạng
- **Không nhận:** điện thoại, máy thu phát sóng, thuốc lá, rượu bia, sex toys.
- Bảo hiểm tối đa 2 lần cước; hàng đông lạnh có quy định riêng. (Cột H "ưu đãi Đà Nẵng" bị ẩn.)

---

## B. Tuyến về (nước ngoài → VN)

### B1. Singapore → Việt Nam

#### B1.1 AIR, tab `AIR SING - VN` 🖼, giá **USD**

| Mặt hàng | Đơn giá |
|---|---:|
| Hàng thường | 12,00 USD/kg |
| Mỹ phẩm, TPCN | 13,00 USD/kg |
| Nước hoa giá rẻ | 14,00 USD/kg |
| Hàng giá trị cao | Liên hệ |

- Dưới 3 kg làm tròn lên 3 kg; trên 3 kg làm tròn 0,5 kg; quy đổi / 5000.
- Hàng về kho VN trong 1–3 ngày, sau đó giao nội địa.
- **Bảo hiểm:** mua bảo hiểm 5% giá trị thì đền 100% theo hóa đơn; không mua thì đền tối đa 3 lần cước.

#### B1.2 Đường tàu, hàng thường, tab `SEA SING - VN (HÀNG THƯỜNG)` 🖼, giá USD

| Cân nặng | Đơn giá |
|---|---:|
| 1–100 kg | 8 USD/kg |
| 101–250 kg | 7,8 USD/kg |
| 251–500 kg | 7,5 USD/kg |
| Trên 500 kg | 7 USD/kg |

- Đã gồm giao tận nơi trong TP.HCM; tỉnh xa được hỗ trợ một phần.
- Hàng luxury, điện tử (điện thoại, laptop, đồng hồ): tính kg cộng phụ thu theo %.
- **Bảo hiểm:** bảo hiểm 100% khi mất, thất lạc. Không khai giá trị hoặc khai sai thì không đền theo giá trị. Không bảo hiểm hàng dễ hỏng, vỡ, móp.
- Quy đổi / 5000. Nhận hàng Thứ 2 → Thứ 6, giờ hành chính.
- Ảnh có **địa chỉ kho nhận tại Singapore của đối tác và tên một người liên hệ**. Không chép vào đây và không đưa lên web nếu chưa có đồng ý (rule 14).

#### B1.3 Đường tàu, hàng tạp, tab `SEA SING - VN (HÀNG TẠP)` 🖼, giá USD

| Cân nặng | Sing → HCM | Sing → HN |
|---|---:|---:|
| Dưới 20 kg | tối thiểu 20 kg (đơn giá mốc 20–100) | ″ |
| 20–100 kg | 9 USD/kg | 10 USD/kg |
| 101–300 kg | 8,8 USD/kg | 9,8 USD/kg |
| 301–500 kg | 8,6 USD/kg | 9,6 USD/kg |
| Trên 500 kg | 8,4 USD/kg | 9,4 USD/kg |

- Giá từ kho Singapore đến kho Việt Nam. Làm tròn 0,5 kg; quy đổi / 5000.
- Quy ước của file: tên tab quyết định phương thức (SEA = tàu, AIR = bay) và loại hàng (owner xác nhận 2026-10-25).

### B2. Đài Loan → Việt Nam (AIR), tab `AIR ĐÀI - VN` 🖼

| Cân nặng | Đơn giá |
|---|---:|
| 3–30 kg | 200.000 /kg |
| Trên 30 kg | 190.000 /kg |

- Dưới 5 kg thu thêm phí ship tại VN 200.000 đ. Phí lấy hàng tại Đài Loan (đơn từ 5 kg): 150.000 đ/kiện.
- Quy đổi / 5000; làm tròn 0,5 kg.
- **Bảo hiểm:**
  - Kiện thu cước thông thường gặp thất lạc hoặc không thông quan (trừ hàng hạn ngắn): hoàn 1–3 lần cước, tối đa 4.000.000 đ/kiện.
  - Kiện giá trị cao, có khai giá và đóng phí 15%: hoàn 100% giá trị.

### B3. Hàn Quốc → Việt Nam

#### B3.1 Bay và tàu, tab `AIR + SEA HÀN - VN` 🖼, giá **KRW (won)**

| Bay: cân nặng | Miền Bắc | Miền Nam |
|---|---:|---:|
| 1–50 kg | 11.200 W/kg | 12.200 W/kg |
| Trên 50 kg | 10.700 W/kg | 11.700 W/kg |
| Trên 100 kg | 10.600 W/kg | 11.600 W/kg |
| Trên 300 kg | 10.500 W/kg | 11.500 W/kg |
| Trên 500 kg | Liên hệ | Liên hệ |

Thời gian: 2–4 ngày (trừ T7, CN).

| Tàu: cân nặng | Đồng giá Bắc và Nam |
|---|---:|
| 1–100 kg | 5.300 W/kg |
| Trên 100 kg | 5.200 W/kg |
| Trên 300 kg | 5.100 W/kg |
| Trên 500 kg | 4.500 W/kg |
| Trên 1000 kg | Liên hệ |

Thời gian: 2–3 tuần (trừ T7, CN).

- Hàng bay nhận tối thiểu 3 kg; hàng tàu tối thiểu 20 kg. Hỗ trợ đặt thecbe (dịch vụ giao nội địa Hàn) tới kho công ty.
- Làm tròn 0,5 kg. Quy đổi **D × R × C / 4500**.
- **Bảo hiểm:** hàng bay đền 100% khi mất, thất lạc, không bảo hiểm rơi vỡ hay hư hỏng. Hàng tàu không có bảo hiểm; mất hàng đền tối đa 3 lần phí vận chuyển.

#### B3.2 Xách tay Hàn Quốc → Việt Nam, tab `HÀN - VN XÁCH TAY` 🖼

| Mặt hàng | Đơn giá |
|---|---|
| Hàng thường (thực phẩm khô, đông lạnh, trái cây, quần áo, mỹ phẩm, thuốc, giày dép…) | 165.000 /kg |
| Hàng sữa, TPCN | 170.000 /kg |
| Thiết bị điện tử | 200.000 /kg |
| Gậy golf | 290.000 /kg |
| Hồ sơ, giấy tờ | 600.000 /bộ |
| Máy ảnh | Check giá trị; tối thiểu 600k/sp + cân cước |
| Laptop | Check giá trị; tối thiểu 500k/sp + cân cước |
| iPad | 800k/sp |
| Điện thoại | Check giá trị hàng |
| Vàng | Check giá trị; tối thiểu 600k (hàng trên 5 triệu phụ thu 15% giá trị) |
| Bạc | Check giá trị; tối thiểu 500k |
| Đồng hồ | Check giá trị; tối thiểu 600k (hàng trên 7 triệu phụ thu 10% giá trị) |

- Đơn dưới 5 kg: chưa gồm ship nội địa VN. Đơn trên 5 kg: phí nội địa VN 100.000 đ/kiện.
- Bảo hiểm thất lạc 100%. Không bảo hiểm hàng fake. Khách phải khai giá trị cụ thể.

### B4. Nhật Bản → Việt Nam (xách tay), tab `NHẬT - VN xách tay`

| Mặt hàng | Đơn giá |
|---|---:|
| Hàng thường, TPCN | 210.000 /kg |
| Hàng fake | 220.000 /kg |
| Hàng điện tử | 215.000 /kg |

- Phí mua hộ: 5–10% giá trị sản phẩm. Giá áp dụng từ kho Nhật đến **kho Hà Nội**.
- Bảo hiểm 100% khi mất hoặc thất lạc; không bảo hiểm hàng dễ hỏng, móp, vỡ.
- **Lịch bay** không cố định, trung bình 2–3 chuyến/tuần. Hàng về VN sau 2–3 ngày kể từ ngày bay.

---

## C. Bảng phụ thu dùng chung

### C1. Phụ thu hải quan hàng đi Singapore 🖼 (ảnh nằm trong cả hai tab Singapore AIR)

| Mặt hàng | Phụ thu |
|---|---|
| Các món có thương hiệu/fake (giày, túi, kính…) | 100K/món |
| Quần áo thương hiệu/fake | 50K/kg |
| Thực phẩm đông lạnh | 10K/kg |
| Thuốc tây/bắc/nam (lá khô), TPCN, mỹ phẩm, BCS | 50K/kg |
| Sách, bài tây, thẻ bài, tem, nhãn, card | 30K/kg |
| Trang sức, mỹ ký | 200K/kg |
| Phụ tùng xe | 50K/kg |
| Sữa bột | 50K/kg |
| Các phụ kiện có trầm và đá | 100K/món |
| Filler | 150K/kg |
| Nước hoa | 120K/chai + 500K an ninh |
| Tổ yến (tính cả hộp) | 500K/kg |
| Cây, hoa, đất (tính cả thùng) | 30K/kg |
| Sen đá | 500K/kiện |
| Tóc giả, mi giả | 50K/kg |
| Trầm hương | 400K/kg |
| Rượu (tùy loại và giá trị) | 120K–350K/chai + 500K an ninh |
| Tranh (tùy loại, gửi thông tin để check) | 300K–700K/bức |
| Thuốc tăng cường sinh lý | 150K/kg |
| Hàng dễ cháy nổ (chất lỏng, hóa chất, sơn gel, pin, nam châm) | 500K/kiện |
| Hàng giá trị cao, điện tử (đồng hồ, điện thoại, máy ảnh, laptop, loa, máy spa…) | Gửi thông tin để check |

- Phụ thu làm tròn 1 kg. Hàng gửi từ HN thuộc nhóm dễ cháy nổ phụ thu **700K/kiện**.
- ⚠ Bảng này khác bảng phụ thu trong A1.1 và A1.2 (ví dụ yến: 300.000/lạng so với 500K/kg; pin: 500K hoặc 600K so với 500K/700K). Cần chốt bảng nào là chuẩn.

### C2. Phụ thu đầu Hà Nội 🖼 (tab `VN - EU`)

| # | Mặt hàng | Phụ thu | Ghi chú |
|---:|---|---|---|
| 1 | Sơn móng tay | 600K/kiện | Bị bắt hủy (chỉ có thông báo, không có giấy tờ) đầu VN hoặc nước ngoài: không đền |
| 2 | Pin kèm thiết bị | 400.000/kiện | Không nhận pin to |
| 3 | Nước hoa | 70.000/chai (fake, hiệu) + 600K/kiện | Như #1 |
| 4 | Hàng chất lỏng | 400.000/kiện | Như #1 |
| 5 | Hàng yến | 450.000/kg (tính cả thùng) | Tối thiểu 0,5 kg |

### C3. Phụ thu đầu SGN 🖼 (tab `VN - EU`)

| # | Mặt hàng | Phụ thu | Ghi chú |
|---:|---|---|---|
| 1 | Sơn móng tay | 600.000/kiện (số lượng ít thì check lại) | Bị bắt hủy: không đền |
| 2 | Pin kèm thiết bị | 400.000/kiện | Không nhận pin to |
| 3 | Loa bình thường | 600.000/kiện | |
| 4 | Loa kẹo kéo | 1.200.000/kiện | |
| 5 | Loa nhỏ cỡ lòng bàn tay | 400.000/kiện | |
| 6 | Nước hoa | 1.200.000/kiện + 50.000/chai (fake, hiệu) | Bị bắt hủy: không đền |
| 7 | Hàng khí nén xịt | 400.000/kiện | Không nhận bình gas, máy có bình gas |
| 8 | Hàng chất lỏng | ít: 300.000/kiện; nhiều: 600.000/kiện | Bị bắt hủy: không đền |
| 9 | Fake thương hiệu (quần áo) | 50.000/kg | |
| 10 | Fake túi, mắt kính, thắt lưng (phụ kiện) thương hiệu | 100.000/cái | |
| 11 | Fake giày, dép thương hiệu (check trước) | 100.000/cái | |
| 12 | Túi, ví, giày da cá sấu | 150.000/cái | |
| 13 | Đồng hồ thường | 70.000/cái | |
| 14 | Đồng hồ fake, cơ, nhãn hiệu, điện tử thông minh | 200.000/cái | |
| 15 | Hộp đồng hồ fake, hộp thương hiệu (hiện hạn chế) | 70.000/hộp | |
| 16 | Nhang trầm, bột trầm, sản phẩm trầm (không nhận trầm thịt) | 150.000/kg | |
| 17 | Sách, báo, tạp chí, lịch, thiệp có nội dung | 20.000/kg | |
| 18 | Hàng yến | 500.000/kg (tính cả thùng) | Tối thiểu 0,5 kg |
| 19 | Hàng saffron | hộp 1 g: 20k; 3 g: 50k; 5 g: 100k | |
| 20 | Hàng yến hũ | 50.000/kg; có đông trùng 100.000/kg | |
| 21 | Thuốc sinh lý… | 150.000/hộp | |
| 22 | Hàng mỹ ký (trang sức giả) | 400.000/kg | |
| 23 | Hàng trang sức thương hiệu | 100.000/cái | |
| 24 | Labubu, các loại gấu bông tương tự | 100.000/con | |
| 25 | Thuốc nhuộm, mực xăm | 400.000/kiện | |
| 26 | Thuốc Elasten | 100.000/hộp | |
| 27 | Thuốc, TPCN An cung | 70.000/hộp | |
| 28 | Máy xay (có mô tơ), máy ép nước mía | 800.000–1.200.000/máy | |
| 29 | Đông y, thuốc tây, thuốc nam, thuốc bắc | 50.000/kg | |
| 30 | Máy có mô tơ | 700.000–1.200.000/máy | |
| 31 | Máy y tế, máy triệt lông (tùy trị giá) | 1.500.000–2.500.000/máy | |
| 32 | Máy ảnh | 200.000/máy | |
| 33 | Lông mi giả, tóc giả | 50.000/kg | |
| 34 | Vỏ hộp (có nhãn hiệu) | 50.000/kg | |
| 35 | Vòng đá, vòng trầm, vòng cẩm thạch… | 70.000/cái | |
| 36 | Rượu (tùy trị giá) | 500.000/kiện | |
| 37 | Cao dán (liên quan tới thuốc), dầu gió | 50.000/kg | |
| 38 | Đá (trang sức giả) | 300.000/kg | |
| 39 | Sữa lon pha sẵn | 20.000/kg | |
| 40 | Mỹ phẩm, TPCN có xuất xứ nước ngoài | 50.000/kg | |
| 41 | Sữa bột | 50.000/kg | |
| 42 | Hạt giống (tối đa 1 kg/kiện) | 100.000/kg | |
| 43 | Hàng thuốc full thùng trên 15 kg | 70.000/kg | |
| 44 | Hàng filler | 100.000/kg | |
| 45 | Hàng phân bón | 50.000/kg | |
| 46 | Tượng dưới 20 cm | 300.000/tượng | |
| 47 | Tượng trên 20 cm | 400.000/tượng | Tượng cao quá 1 m hoặc nặng quá 20 kg: báo check giá trước |
| 48 | Hàng có nam châm, ắc quy nhỏ | 400.000/kiện | |
| 49 | Hàng ắc quy đi riêng lẻ | 700.000/kiện | Hạn chế nhận |
| 50 | Hàng namecard | 50.000/kg | |
| 51 | Hàng đông trùng | 400.000/kg | |

Áp dụng cho cả C2 và C3:

- Hàng máy móc, motor, hàng giá trị cao: check riêng trước khi xuất.
- Mặt hàng ít khi đi: check lại.
- Hàng đóng kiện gỗ: phụ thu an ninh 300K/kiện để không bị khui mở; phải đóng chân đế.

*Hai bảng này nằm trong tab EU. Chưa rõ chúng áp dụng riêng cho EU hay cho mọi tuyến đi xa (Mỹ, Canada, Anh, Úc).*

---

## D. Quy tắc chung rút ra từ toàn bộ file

| Quy tắc | Giá trị phổ biến | Ngoại lệ |
|---|---|---|
| Trọng lượng tính cước | max(cân thực, D × R × C / 5000) | Hàn → VN: / 4500. EU: DIM / 6000 để xét quá khổ |
| Làm tròn | lên 0,5 kg | Nhật Bản và Mỹ bay nhanh: 1 kg. Singapore → VN AIR: dưới 3 kg tính 3 kg. Phụ thu SG: 1 kg |
| Giá theo điểm gửi | HN / HCM / ĐN (+ Huế, Quảng Bình, Quảng Trị) giá khác nhau | SG, MY, KR, TW, SG → VN, KR → VN |
| Giá theo loại hàng | khô / đông lạnh; quần áo / mỹ phẩm; hàng thường / mỹ phẩm / nước hoa | KR, TW, MY sea, SG → VN, xách tay |
| Giá theo vùng đích | — | EU (7 zone), Mỹ chậm (CA / ngoài CA), Indonesia (5 thành phố), Canada (2 nhóm bang, cùng giá) |
| Tiền tệ | VND | SGD (SG sea), USD (SG → VN, MY sea CBM), KRW (KR → VN) |
| Phương thức | air, sea | **xe** (HCM → Thái), **xách tay** (JP → VN, KR → VN) |
| Giá tối thiểu | "MIN" theo khung đầu (SG, MY) | Thái, MY sea: tối thiểu 50 kg. SG sea: từ 21 kg. KR → VN: bay 3 kg, tàu 20 kg |
| Giao nội địa nước đến | ship theo ngưỡng (SG 10,5 kg, MY 11 kg, KR/TW 3 kg, Úc 11 kg) | |
| Điều kiện khiếu nại | video + ảnh khi khui hàng | thời hạn 24 giờ / 2 ngày / 3 ngày / 5 giờ tùy tuyến |

---

## E. Phân tích

### E1. Checklist dữ liệu mơ hồ (cần kiểm tra tay với sale)

Đánh dấu `[x]` khi đã check và ghi câu trả lời ngay sau `→`. Ô Excel ghi theo dạng `tab!ô`; 🖼 là bảng trong ảnh.

**Lỗi rõ (gần như chắc phải sửa)**

- [x] **E1-01 Đài Loan khô: đơn vị giá.** `VN- ĐÀI (khô)!C3:C5`. → Format ô `#,##0.000` hiển thị 93.000 / 100.000 / 110.000, tức là đ/kg.
- [x] **E1-02 Đài Loan khô: dòng giá trống.** → Cột B và các dòng 6–9 bị ẩn: không có khung cân, mỗi điểm gửi một đơn giá.
- [ ] **E1-03 EU zone 7 (Cyprus, Malta).** `VN - EU!H7` = 4.811.104 cho 0,5 kg, đắt hơn cả 10,5 kg (4.694.242); `H8:H26` (1,0–10,0 kg) để trống. →
- [x] **E1-04 Singapore → VN: hai tab "SEA".** Tab thứ 17 `SEA SING - VN (HÀNG THƯỜNG)` và tab thứ 18 `SEA SING - VN (HÀNG TẠP)`. → Owner 2026-10-25: tên tab là chuẩn. Cả hai đều đi tàu: hàng thường 8–7 USD/kg (đã gồm giao nội thành HCM), hàng tạp Sing → HCM 9–8,4 USD/kg và Sing → HN 10–9,4 USD/kg. AIR (tab 20) là đi bay.
- [ ] **E1-05 Câu chép nhầm giữa các tab.** `VN - MALAY (SEA)!A11:A12` và `VN - SINGAPORE (SEA)!A15:A16` ghi "nhận hàng sau 2–4 ngày kể từ ngày bay / bay mỗi ngày" trong tab đường biển. Lịch tàu và thời gian thực của SG sea là gì? →
- [ ] **E1-06 Mỹ bay chậm: tiêu đề ảnh "Huế – USA".** 🖼 Chỉ áp dụng gửi từ Huế, hay mọi điểm gửi? →

**Khung cân nặng hở, chồng hoặc khó hiểu**

- [ ] **E1-07 Singapore 1–2 kg "MIN 600.000".** (HCM `B3`, HN `B3`) Là trọn gói 600.000 cho cả 1–2 kg, hay mức tối thiểu? Dưới 1 kg (ví dụ 0,5 kg) tính thế nào? →
- [ ] **E1-08 Singapore HCM: hai dòng "Liên hệ".** `A7` "Trên 100kg" và `A8` "Trên 300kg" đều Liên hệ. Mục đích của dòng 300 kg? Riêng tuyến HN, ĐN thì "Trên 21 kg" 125.000 có áp dụng không giới hạn cân không? →
- [ ] **E1-09 Malaysia: khung cân.**
  - HN, ĐN có "2–6 kg" và "6–10 kg" chồng nhau ở 6 kg.
  - HCM ghi "Dưới 2–6 kg".
  - Từ 1,5 kg tính theo dòng 1 kg (MIN) hay dòng 2–6? Đúng 10,5 kg thì sao?
  →
- [ ] **E1-10 Philippines: khoảng hở.** "Dưới 5 kg" rồi "6–10 kg": 5,5 kg tính dòng nào? Có gửi từ Đà Nẵng không (tab chỉ ghi HN, HCM)? →
- [ ] **E1-11 Thái Lan.** "50–99 kg" rồi "Trên 100 kg": 99,5 kg tính dòng nào? "Trên 1 tấn" là > 1000 kg hay ≥ 1000 kg? Tuyến Thái giờ chỉ còn đi xe (web cũ ghi bay nhanh, bay chậm)? →
- [ ] **E1-12 Úc.** "Dưới 11 kg" và "Trên 11 kg": đúng 11 kg tính dòng nào? Chỉ gửi từ HCM? →
- [ ] **E1-13 Nhật Bản.**
  - (Lịch bay Thứ 2, 4, 6 nằm ở dòng 9, bị ẩn, nên không hiển thị lịch bay cho Nhật.)
  - Có giá riêng cho 0,5 kg (886.500) nhưng quy định ghi "làm tròn lên 1 kg". 0,5 kg có còn áp dụng không?
  - "Trên 1 kg – 5 kg" 1.176.000 là trọn gói cho cả 1,01–5 kg?
  - Tính theo từng kiện, nghĩa là 2 kiện 3 kg thành 2 × 1.176.000?
  →
- [ ] **E1-14 Hàn Quốc hàng khô.**
  - Khung "trên 50 kg / trên 100 kg" chỉ có cho nhóm ĐN; HN, HCM không giảm theo cân?
  - Dưới 3 kg nhận không, giá bao nhiêu? (Có ghi "< 3 kg ship nội địa 200.000" nên có vẻ có nhận.)
  - HN chậm và HN nhanh khác nhau mấy ngày?
  →
- [ ] **E1-15 Hàn Quốc đông lạnh.** Câu hỏi tương tự E1-14 (khung giảm giá chỉ cho ĐN; dưới 3 kg). →

**Giá không tăng theo cân nặng (có thể do bảng hãng, cần xác nhận là đúng)**

- [ ] **E1-16 Anh (HCM → UK)** 🖼 10,5 kg (3.733.119) rẻ hơn 10,0 kg (3.753.888); 15,5 kg (4.713.840) rẻ hơn 15,0 kg (4.959.152). →
- [ ] **E1-17 EU: các mốc rẻ hơn mốc trước.** →
  - Zone 1: 10,0 < 9,5 kg.
  - Zone 3: 10,5 < 10,0 kg.
  - Zone 4: 5,0 < 4,5 kg và 10,5 < 10,0 kg.
  - Zone 5: 5,0 < 4,5 kg.
  - Zone 6: 5,5 < 5,0 kg và 10,5 < 10,0 kg.
- [ ] **E1-18 Bước nhảy ở 21 kg rẻ hơn 20,5 kg.** →
  - EU mọi zone: ví dụ zone 1 có 21 kg × 243.000 = 5.103.000, nhưng 20,5 kg = 5.235.674.
  - Mỹ bay chậm: 21 kg × 305.000 = 6.405.000, nhưng 20,5 kg = 7.050.982.
  - Khách gửi 20,5 kg có được tính theo giá 21 kg (rẻ hơn) không?

**Phụ thu và chính sách mâu thuẫn**

- [ ] **E1-19 Hai bảng phụ thu Singapore khác nhau.** Bảng trong ô (A1) và ảnh "phụ thu hải quan" (C1):
  - Yến: 300.000/lạng so với 500K/kg.
  - Pin: HCM 500K, HN 600K so với 500K/kiện (HN 700K).
  - Chất lỏng: 300K/kiện so với 500K/kiện.
  - Thuốc, mỹ phẩm 50K, quần áo thương hiệu 50K/kg: khớp.

  Web dùng bảng nào? →
- [x] **E1-20 Hàn Quốc đông lạnh: ưu đãi Đà Nẵng.** → Cột E bị ẩn: không thuộc giá lẻ, không đưa lên web.
- [ ] **E1-21 Phụ thu đầu HN, đầu SGN (C2, C3).** 🖼 Hai bảng nằm trong tab EU. Chỉ áp dụng EU, hay cả Mỹ, Canada, Anh, Úc? →
- [ ] **E1-22 EU và Anh.** "Great Britain" nằm trong zone 6 của EU, nhưng có bảng HCM → UK riêng. Khách gửi đi Anh dùng bảng nào? Giá EU có giống nhau cho HN và HCM không? Bảng EU là line EUT hay EUBH? →
- [ ] **E1-23 Đài Loan đông lạnh.** Mỗi điểm gửi một chính sách khác nhau (`D3`, `D5`, `D6`), có cố ý không? Thời gian "4–6 ngày" chỉ ghi ở dòng ĐN; HN, HCM bao lâu? →
- [ ] **E1-24 Đài Loan → VN.** "Hoàn đền 1x3 cước" là 1 đến 3 lần cước, hay đúng 3 lần? Dưới 3 kg nhận không? →
- [ ] **E1-25 Hàn → VN.** Quy đổi D × R × C / 4500 (khác các tuyến khác, /5000): đúng chứ? "Miền Bắc / Miền Nam" là nơi nhận ở VN? →
- [ ] **E1-26 Xách tay Hàn → VN.** "Check giá trị hàng bill min 600k/sp + cân cước" nghĩa là phí tối thiểu 600k mỗi sản phẩm cộng cước theo kg? →
- [ ] **E1-27 Xách tay Nhật → VN.** Giá đến kho Hà Nội; khách ở HCM trả thêm bao nhiêu? Phí mua hộ 5–10% là tùy chọn? →

**Thiếu thông tin để hiển thị đầy đủ**

- [ ] **E1-28 Thời gian giao, lịch bay.** →
  - Philippines: thiếu cả hai.
  - Anh: thiếu cả hai.
  - Canada: thiếu thời gian.
  - Mỹ bay chậm: thiếu thời gian.
  - SG sea: thiếu thời gian (E1-05).
  - Singapore → VN và Đài Loan → VN: thiếu lịch.
- [ ] **E1-29 Bảo hiểm, khiếu nại.** Thiếu ở: Mỹ (cả hai line), Anh, Philippines (chỉ ghi "hỏi CSKH"), Canada (chỉ "đền 100% cước"). →
- [ ] **E1-30 Anh: thiếu giá từ 300 kg.** 🖼 Ảnh có thể bị cắt. →
- [ ] **E1-31 VAT.** Có tab ghi "chưa VAT" (SG HCM, Hàn khô, Đài khô, Nhật), có tab không ghi. Mọi giá đều chưa VAT? →
- [ ] **E1-32 Ngày hiệu lực.** Chỉ Canada ghi "áp dụng từ 24/4/2026". Các bảng khác áp dụng từ ngày nào? Có hạn không? →
- [ ] **E1-33 Thuế nhập khẩu Mỹ bay nhanh.** 40 / 60 / 80 USD là thuế cố định theo cân? Khung "10–20 kg" và "trên 21 kg" hở ở 20–21 kg. →

**Không đưa lên web (trừ khi được đồng ý)**

- [ ] **E1-34 Thông tin đối tác.** Ảnh SG → VN hàng thường có địa chỉ kho đối tác ở Singapore và tên một người liên hệ. Ẩn hay hiển thị (cần đồng ý của đối tác)? →
- [ ] **E1-35 Tên hãng phát.** EU ghi "phát bằng DHL", chính sách nhắc DHL, DPD. Có được ghi tên hãng trên web không (Q-08)? →
- [x] **E1-36 Indonesia.** → Owner 2026-10-25: không hiển thị. Cột H (ưu đãi) bị ẩn.

### E2. So sánh với giá đang hiển thị trên web (DB, owner xác nhận 2026-10-22 từ site cũ)

| Tuyến | Đang hiển thị | Bảng mới |
|---|---|---|
| Singapore | 1–5 kg 150.000; 6–20 kg 88.000; 21–100 kg 68.000; trên 100 kg 57.000 | HCM: 125 / 110 / 94k; HN, ĐN: 155 / 135 / 125k; tối thiểu 600k; có thêm sea |
| Malaysia | 1–50 kg 68.000; 51–100 kg 58.000; trên 100 kg 52.000 | HCM 130 / 95 / 88k; HN, ĐN 163 / 123 / 116k; sea 26–47k |
| Hàn Quốc | 1–100 kg 75.000 | khô 72–100k, đông lạnh 81–103k, theo điểm gửi |
| Đài Loan | 1–100 kg 95.000 | khô 93–110k (?), đông lạnh 105–120k |
| Nhật Bản | 1–100 kg 95.000 | 886.500 đ/0,5 kg … 147.000 /kg |
| Thái Lan | air 5–100 kg, 100–60k | **xe**, tối thiểu 50 kg, 65 / 60 / 55k |
| Mỹ | 8 mốc, từ 21 kg 220.000 | 2 line (nhanh, chậm CA / ngoài CA), đủ từng 0,5 hoặc 1 kg, từ 21 kg 300–320k |
| SG → VN | không công khai giá | có giá USD (air, hàng thường, tàu) |
| **Tuyến mới** | — | Philippines, Canada, Anh, Úc, EU (27 nước), Indonesia (chưa dùng), Đài Loan → VN, Hàn → VN (bay, tàu, xách tay), Nhật → VN xách tay |

→ Giá trên web hiện **lệch hẳn** so với bảng giá lẻ mới. Chỗ thì thấp hơn nhiều (SG 21–100 kg: 68k so với 94k/125k), chỗ thì sai phương thức (Thái Lan).

### E3. Schema hiện tại chưa chứa được (`routes`, `route_rates`)

| Cần | Hiện có | Đề xuất |
|---|---|---|
| Giá theo **điểm gửi** (HN / HCM / ĐN) | không | thêm cột `origin` ở `route_rates` (`all` / `hn` / `hcm` / `dn`) |
| Giá theo **loại hàng** (khô / đông lạnh, mỹ phẩm…) | không | thêm cột `cargo_class` |
| Giá theo **vùng đích** (EU zone, CA / ngoài CA, thành phố Indo) | không | thêm cột `zone`, cùng bảng zone → quốc gia |
| **Tiền tệ** khác VND (SGD, USD, KRW) | chỉ `*_vnd` | thêm cột `currency` + số tiền; máy tính giá chỉ cộng được khi cùng tiền tệ |
| Bảng **tổng cước theo từng 0,5 kg** | có `flat_price_vnd` theo khung | dùng được: mỗi mốc là một khung (0,01–0,5; 0,51–1,0…) |
| **Phụ thu theo mặt hàng** | không có bảng | bảng mới `route_surcharges` (tuyến, điểm gửi, mặt hàng, số tiền, đơn vị kg / cái / kiện / lạng / %, ghi chú) |
| **Chính sách** (bảo hiểm, khiếu nại, giao nội địa, quy định) | `transit_note`, `flight_schedule`, nội dung trang | khối nội dung theo tuyến (route-content / page blocks), sửa trong admin |
| Phương thức **xe**, **xách tay** | enum chỉ có air, air_express, air_economy, sea | thêm `road`, `hand_carry` |
| Quy đổi / 4500 (KR → VN) | `volumetric_divisor` theo tuyến | đã có |
| Làm tròn theo tuyến | `weight_rounding_kg` | đã có (cần quy tắc "dưới 3 kg tính 3 kg" cho SG → VN) |

---

## F. Quyết định đã chốt (đầu vào cho spec A-02b)

| Ngày | Quyết định |
|---|---|
| 2026-10-25 | Công khai giá mọi tuyến trong file, **trừ Indonesia**. |
| 2026-10-25 | Ngoại tệ (SGD, USD, KRW) **giữ nguyên** như sale báo, không quy đổi. Máy tính chỉ tính trong cùng một loại tiền. |
| 2026-10-25 | Hiển thị **đầy đủ** phụ thu theo mặt hàng và chính sách bảo hiểm, khiếu nại theo từng tuyến. Văn bản EU (viết cho đối tác) sẽ viết lại cho khách lẻ. |
| 2026-10-25 | Viết spec trước (`/feature-bug`), rồi mới `/implement`. |
| 2026-10-25 | Tên tab quyết định phương thức (SEA = tàu, AIR = bay) và loại hàng. |
| 2026-10-26 | Ô, dòng, cột bị **ẩn** trong Excel không thuộc bảng giá lẻ. |
| 2026-10-26 | Mỗi quốc gia có **một trang cho mỗi chiều** (đi / về), theo URL hiện tại. Trong trang, giá chia thành nhiều **bảng giá dịch vụ**; mỗi bảng = hình thức × loại dịch vụ (khô, đông lạnh, bay nhanh, bay chậm…) × điểm gửi (ĐN·Huế·QB·QT / HN / HCM) × vùng đích (nếu có). Mỗi bảng có khung giá, tiền tệ, thời gian, lịch, làm tròn, hệ số quy đổi, phí giao nội địa, phụ thu và bảo hiểm riêng. |
| 2026-10-26 | Bố cục: **tab hình thức/dịch vụ + chip điểm gửi**. Bên dưới là bảng giá, thông tin, "Phụ thu theo mặt hàng" ▸, "Bảo hiểm & khiếu nại" ▸ của đúng lựa chọn đó. Mọi bảng đều có trong HTML (SEO); JS chỉ dùng để ẩn/hiện. Máy tính cước: chọn hình thức, điểm gửi, kg, D × R × C. |
| 2026-10-26 | Cân quy đổi = (Dài × Rộng × Cao, cm) / 5000; trọng lượng tính cước lấy số lớn hơn giữa cân thực và cân quy đổi. Hệ số chia đặt theo từng bảng giá (Hàn → VN dùng /4500). Máy tính nhỏ trên trang tuyến cũng có ô nhập kích thước. |
| 2026-10-26 | Roadmap row mới **A-02b**, chia 2 spec: (1) schema, import, trang tuyến, tuyến mới, máy tính; (2) admin sửa bảng giá dịch vụ, phụ thu, chính sách. |
| 2026-10-26 | **Chờ owner kiểm tra xong checklist §E1** rồi mới viết spec. |
