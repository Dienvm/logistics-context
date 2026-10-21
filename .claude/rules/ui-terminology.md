---
paths:
  - "43logistics.vn/messages/**/*.json"
  - "43logistics.vn/**/*.tsx"
  - "docs/context/legacy-copy/**/*.md"
---

# UI terminology and copy

The canonical VI ↔ EN term list is `docs/context/12-glossary.md` (one place for terms). Read it before adding or changing any UI string. This file covers how to use it.

## Terms

- Use the **exact** VI/EN pair from `docs/context/12-glossary.md`. Examples:
  - Bảng giá → Rate table / Price list;
  - Cân nặng tính cước → Chargeable weight;
  - Tính cước → Shipping calculator;
  - Chat Zalo → Chat on Zalo;
  - Kinh nghiệm → Shipping guides.
- If a term you need isn't there, add it to the glossary first (context repo), then use it. Never invent a synonym in code or messages.

## Copy rules

- **Brand:** "43 Logistics" (with a space). Never another company's name, slogans or numbers (quynam.vn is a structure reference only).
- **Voice** (`01-business.md`): VI marketing copy addresses the reader as "bạn"; policies use "quý khách". EN is plain, short and idiom-free.
- **Sentence case** for buttons, menus and headings. No `uppercase`, no ALL CAPS, no exclamation marks in UI chrome.
- **No unproven superlatives:** "tối ưu nhất", "uy tín nhất", "rẻ nhất", "24/7", "hàng nghìn khách hàng" (`AGENTS.md` §10).
- **Numbers come from data:** prices, days and dates are interpolated from DB values via ICU placeholders (`"fromPrice": "từ {price}/kg"`), never typed into messages.
- **Units:** "kg", "cm", "ngày làm việc" / "business days"; prices formatted `75.000 đ` (VI) and `75,000 VND` (EN).
- **Errors** say what happened and what to do next: "Số điện thoại chưa đúng. Ví dụ: 09xx xxx xxx". Use pattern placeholders, never a real number in copy.
- Every key exists in both `messages/vi.json` and `messages/en.json` (`pnpm i18n:check`).
