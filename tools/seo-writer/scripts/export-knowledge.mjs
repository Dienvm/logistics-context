// Exports the facts the SEO/GEO writing agent may use, read-only from the shared
// database, into tools/seo-writer/knowledge/generated/*.md. Run from the context root:
//   node tools/seo-writer/scripts/export-knowledge.mjs
// It reads DATABASE_URL_DIRECT from projects/43logistics.vn/.env (never printed) and
// uses that app's node_modules. No transit days are exported (AGENTS.md
// rule 2, owner exception 2026-11-23: 05-bang-gia-theo-tuyen.md is a dated reference
// copy of the published rate cards, and posts always link to the route page too).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");
const appDir = join(root, "projects", "43logistics.vn");
const require = createRequire(join(appDir, "package.json"));
require("dotenv").config({ path: join(appDir, ".env"), quiet: true });
const postgres = require("postgres");

const url = process.env.DATABASE_URL_DIRECT;
if (!url) throw new Error("DATABASE_URL_DIRECT is not set in projects/43logistics.vn/.env");
const sql = postgres(url, { max: 1 });

const SITES = [
  { code: "43l", name: "43 Logistics", origin: "https://43logistics.vn" },
  { code: "av", name: "AV Logistics", origin: "https://avlogistics.vn" },
  { code: "gt", name: "GT Logistics", origin: "https://gtlogistics.vn" },
];
const BLOG = { vi: "kinh-nghiem", en: "guides" };
const pathOf = (locale, slug) => (locale === "vi" ? `/${slug}/` : `/en/${slug}/`);
const postPath = (locale, slug) =>
  locale === "vi" ? `/${BLOG.vi}/${slug}/` : `/en/${BLOG.en}/${slug}/`;
const KIND = { allowed: "Nhận", restricted: "Nhận có điều kiện", prohibited: "Không nhận" };
const METHOD = { air: "đường bay", sea: "đường biển", road: "đường bộ", express: "chuyển phát nhanh" };
const today = new Date().toISOString().slice(0, 10);
const header = (title, note) =>
  `# ${title}\n\n> Xuất tự động từ database ngày ${today} bằng \`tools/seo-writer/scripts/export-knowledge.mjs\`. Đừng sửa tay: chạy lại script rồi tải lại file lên Claude Project.${note ? `\n> ${note}` : ""}\n`;

const routes = await sql`
  select r.id, r.key, r.direction, r.country_code, r.is_active, r.is_verified, r.sort,
    max(case when t.locale = 'vi' then t.name end) as name_vi,
    max(case when t.locale = 'en' then t.name end) as name_en
  from routes r left join route_translations t on t.route_id = r.id
  group by r.id order by r.sort, r.key`;
const methods = await sql`
  select route_id, array_agg(distinct method::text order by method::text) as methods
  from rate_cards where is_active group by route_id`;
const methodsOf = new Map(methods.map((m) => [m.route_id, m.methods]));
const routePages = await sql`
  select p.site, p.route_id, pt.locale, pt.slug, pt.h1
  from pages p join page_translations pt on pt.page_id = p.id
  where p.type in ('route_outbound', 'route_inbound') and p.status = 'published'
    and pt.status = 'published' and p.route_id is not null`;
const fixedPages = await sql`
  select p.site, p.key, pt.locale, pt.slug from pages p
  join page_translations pt on pt.page_id = p.id
  where p.key in ('calculator', 'goods') and p.status = 'published' and pt.status = 'published'`;

// 01: routes and their pages per site.
let out = header(
  "Tuyến vận chuyển và đường dẫn trang tuyến",
  "Giá và thời gian vận chuyển KHÔNG có ở đây (quy tắc 2): trong bài, dẫn người đọc tới trang tuyến và trang Tính cước của đúng công ty.",
);
out += "\n## Trang dùng chung theo công ty\n";
for (const site of SITES) {
  const rows = fixedPages.filter((p) => p.site === site.code);
  out += `\n### ${site.name} (${site.origin})\n\n`;
  out += `- Blog: \`/${BLOG.vi}/\` (VI), \`/en/${BLOG.en}/\` (EN)\n`;
  for (const r of rows)
    out += `- ${r.key === "calculator" ? "Tính cước" : "Hàng gửi được và hàng cấm"} (${r.locale.toUpperCase()}): \`${pathOf(r.locale, r.slug)}\`\n`;
}
out += "\n## Các tuyến\n";
for (const r of routes) {
  const status = [r.is_active ? "đang chạy" : "đang ẩn (không viết bài)", r.is_verified ? "đã xác nhận" : "chưa xác nhận"].join(", ");
  out += `\n### ${r.name_vi ?? r.key} · \`${r.key}\`\n\n`;
  out += `- EN: ${r.name_en ?? "—"} · chiều: ${r.direction === "outbound" ? "gửi đi (VN → nước ngoài)" : "nhận về (nước ngoài → VN)"} · nước: ${r.country_code} · ${status}\n`;
  const m = methodsOf.get(r.id);
  out += `- Hình thức có bảng giá đang dùng: ${m ? m.map((x) => METHOD[x] ?? x).join(", ") : "—"}\n`;
  for (const site of SITES) {
    const pages = routePages.filter((p) => p.site === site.code && p.route_id === r.id);
    const vi = pages.find((p) => p.locale === "vi");
    const en = pages.find((p) => p.locale === "en");
    out += `- ${site.name}: ${vi ? `\`${pathOf("vi", vi.slug)}\`` : "chưa có trang VI"} · ${en ? `\`${pathOf("en", en.slug)}\`` : "chưa có trang EN"}${vi?.h1 ? ` · H1: "${vi.h1}"` : ""}\n`;
  }
}
const files = { "01-tuyen-va-duong-dan.md": out };

// 02: approved goods rules (operations-approved only, AGENTS.md §10).
const goods = await sql`
  select g.route_id, g.kind::text as kind, g.sort,
    max(case when t.locale = 'vi' then t.name end) as name_vi,
    max(case when t.locale = 'vi' then t.description end) as desc_vi,
    max(case when t.locale = 'en' then t.name end) as name_en
  from goods_rules g left join goods_rule_translations t on t.rule_id = g.id
  where g.approved_at is not null
  group by g.id order by g.route_id nulls first, g.kind, g.sort`;
out = header(
  "Quy định hàng hoá đã được vận hành duyệt",
  "Chỉ những quy định ở đây mới được viết là \"nhận\" hay \"không nhận\". Mặt hàng không có ở đây: viết \"hãy hỏi trước qua Zalo\", không khẳng định.",
);
const routeName = new Map(routes.map((r) => [r.id, `${r.name_vi ?? r.key} (\`${r.key}\`)`]));
let current;
for (const g of goods) {
  const group = g.route_id ? routeName.get(g.route_id) : "Áp dụng cho mọi tuyến";
  if (group !== current) {
    out += `\n## ${group}\n\n`;
    current = group;
  }
  out += `- **${KIND[g.kind] ?? g.kind}:** ${g.name_vi ?? g.name_en}${g.desc_vi ? ` — ${g.desc_vi}` : ""}${g.name_en ? ` (EN: ${g.name_en})` : ""}\n`;
}
files["02-quy-dinh-hang-hoa.md"] = out;

// 03: posts and categories per site (internal links, no duplicate topics or slugs).
const posts = await sql`
  select p.site, p.status::text as status, p.source_post_id is not null as is_copy, r.key as route_key,
    pt.locale, pt.slug, pt.title, pt.status::text as tr_status
  from posts p join post_translations pt on pt.post_id = p.id
  left join routes r on r.id = p.route_id
  order by p.site, p.published_at desc nulls first, pt.locale`;
const cats = await sql`
  select c.site, c.sort,
    max(case when t.locale = 'vi' then t.name end) as name_vi,
    max(case when t.locale = 'vi' then t.slug end) as slug_vi
  from categories c left join category_translations t on t.category_id = c.id
  group by c.id order by c.site, c.sort`;
out = header(
  "Bài viết và chuyên mục đã có trên từng site",
  "Dùng để: tránh trùng chủ đề và trùng đường dẫn (slug phải khác mọi bài của cùng công ty), chọn chuyên mục có sẵn, và đặt link nội bộ tới bài đã xuất bản.",
);
for (const site of SITES) {
  out += `\n## ${site.name}\n\n### Chuyên mục\n\n`;
  const sc = cats.filter((c) => c.site === site.code);
  out += sc.length ? sc.map((c) => `- ${c.name_vi} (\`${c.slug_vi}\`)`).join("\n") + "\n" : "- Chưa có chuyên mục.\n";
  out += "\n### Bài viết\n\n";
  const sp = posts.filter((p) => p.site === site.code);
  out += sp.length
    ? sp
        .map((p) => {
          const live = p.status === "published" && p.tr_status === "published";
          return `- [${p.locale.toUpperCase()}] ${p.title} · \`${postPath(p.locale, p.slug)}\` · ${live ? "đang hiển thị" : "nháp/ẩn (không link tới)"}${p.route_key ? ` · tuyến \`${p.route_key}\`` : ""}${p.is_copy ? " · bản sao của bài 43" : ""}`;
        })
        .join("\n") + "\n"
    : "- Chưa có bài.\n";
}
files["03-bai-viet-va-chuyen-muc.md"] = out;

// 05: the published price tables (owner 2026-11-23: route posts quote a dated reference
// copy of the rate cards; an exception to AGENTS.md rule 2, see 05-seo-and-tracking.md).
// Same eligibility as the route page: route verified and prices public, card and column
// active, band valid today. Labels typed by sales win over computed ones.
const cards = await sql`
  select c.id, c.route_id, c.currency::text as currency, c.sort, c.weight_rounding_kg,
    c.min_chargeable_kg, c.min_weight_kg, c.local_delivery_fee_minor, c.local_delivery_free_from_kg,
    max(case when t.locale = 'vi' then t.tab_label end) as tab_vi,
    max(case when t.locale = 'vi' then t.place_label end) as place_vi,
    max(case when t.locale = 'en' then t.tab_label end) as tab_en,
    max(case when t.locale = 'en' then t.place_label end) as place_en
  from rate_cards c join routes r on r.id = c.route_id
  left join rate_card_translations t on t.card_id = c.id
  where c.is_active and r.is_active and r.is_verified and r.prices_public
  group by c.id order by c.route_id, c.sort`;
const columns = await sql`
  select k.id, k.card_id, k.sort, k.quote_mode::text as quote_mode,
    max(case when t.locale = 'vi' then t.label end) as label_vi,
    max(case when t.locale = 'en' then t.label end) as label_en
  from rate_card_columns k left join rate_card_column_translations t on t.column_id = k.id
  where k.is_active group by k.id order by k.card_id, k.sort`;
const bands = await sql`
  select b.rate_card_id as card_id, b.column_id, b.weight_min_kg::float8 as min_kg,
    b.weight_max_kg::float8 as max_kg, b.price_per_kg_minor, b.flat_price_minor, b.contact_for_price,
    max(case when t.locale = 'vi' then t.weight_label end) as w_vi,
    max(case when t.locale = 'vi' then t.price_label end) as p_vi,
    max(case when t.locale = 'en' then t.weight_label end) as w_en,
    max(case when t.locale = 'en' then t.price_label end) as p_en
  from route_rates b left join route_rate_translations t on t.rate_id = b.id
  where (b.valid_from is null or b.valid_from <= current_date)
    and (b.valid_to is null or b.valid_to >= current_date)
  group by b.id order by b.rate_card_id, b.weight_min_kg`;
const surcharges = await sql`
  select l.route_id, l.sort as list_sort, i.sort,
    max(case when lt.locale = 'vi' then lt.title end) as title_vi,
    max(case when lt.locale = 'en' then lt.title end) as title_en,
    max(case when lt.locale = 'vi' then lt.footnote end) as foot_vi,
    max(case when lt.locale = 'en' then lt.footnote end) as foot_en,
    l.id as list_id,
    max(case when it.locale = 'vi' then it.item end) as item_vi,
    max(case when it.locale = 'vi' then it.price end) as price_vi,
    max(case when it.locale = 'vi' then it.note end) as note_vi,
    max(case when it.locale = 'en' then it.item end) as item_en,
    max(case when it.locale = 'en' then it.price end) as price_en,
    max(case when it.locale = 'en' then it.note end) as note_en
  from surcharge_lists l
  left join surcharge_list_translations lt on lt.list_id = l.id
  join surcharge_items i on i.list_id = l.id and i.is_active
  left join surcharge_item_translations it on it.item_id = i.id
  group by l.id, i.id order by l.route_id, l.sort, i.sort`;
const EXP = { VND: 0, KRW: 0, USD: 2, SGD: 2 };
const money = (minor, currency, locale) => {
  if (currency === "VND")
    return locale === "vi"
      ? `${new Intl.NumberFormat("vi-VN").format(minor)} đ`
      : `${new Intl.NumberFormat("en-US").format(minor)} VND`;
  return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
    style: "currency",
    currency,
  }).format(minor / 10 ** (EXP[currency] ?? 0));
};
const kg = (n, locale) =>
  new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", { maximumFractionDigits: 3 }).format(n);
const weightCell = (b, locale) => {
  const label = locale === "vi" ? b.w_vi : b.w_en;
  if (label) return label;
  // Same wording as the route page (routePage.rates.from / exact / range).
  if (b.max_kg === null) return locale === "vi" ? `Từ ${kg(b.min_kg, locale)} kg` : `From ${kg(b.min_kg, locale)} kg`;
  if (b.max_kg === b.min_kg) return `${kg(b.min_kg, locale)} kg`;
  return `${kg(b.min_kg, locale)}–${kg(b.max_kg, locale)} kg`;
};
const priceCell = (b, currency, locale) => {
  const label = locale === "vi" ? b.p_vi : b.p_en;
  if (label) return label;
  const contact = locale === "vi" ? "Liên hệ" : "Contact us";
  if (b.contact_for_price) return contact;
  // Same wording as the route page (routePage.rates.flat / perKg / contact).
  if (b.flat_price_minor !== null && b.price_per_kg_minor === null)
    return `${money(Number(b.flat_price_minor), currency, locale)}${locale === "vi" ? "/đơn" : " total"}`;
  if (b.price_per_kg_minor !== null && b.flat_price_minor === null)
    return `${money(Number(b.price_per_kg_minor), currency, locale)}/kg`;
  return contact;
};
const cell = (text) => String(text).replace(/\|/g, "/").replace(/\n/g, " ");
const tableOf = (card, locale) => {
  const cols = columns.filter((k) => k.card_id === card.id);
  const rows = bands.filter((b) => b.card_id === card.id && (cols.length === 0 || cols.some((k) => k.id === b.column_id)));
  if (rows.length === 0) return null;
  const weights = [...new Map(rows.map((b) => [`${b.min_kg}|${b.max_kg}`, b])).values()];
  const head = locale === "vi" ? "Cân nặng" : "Weight";
  const price = locale === "vi" ? "Giá" : "Price";
  const colLabels =
    cols.length > 1 ? cols.map((k) => (locale === "vi" ? k.label_vi : k.label_en) ?? price) : [price];
  let md = `| ${head} | ${colLabels.map(cell).join(" | ")} |\n|---|${colLabels.map(() => "---:").join("|")}|\n`;
  for (const w of weights) {
    const cells = (cols.length > 1 ? cols : [cols[0] ?? null]).map((k) => {
      if (k?.quote_mode === "contact") return locale === "vi" ? "Liên hệ" : "Contact us";
      const b = rows.find((r) => r.min_kg === w.min_kg && r.max_kg === w.max_kg && (k === null || r.column_id === k.id));
      return b ? priceCell(b, card.currency, locale) : "—";
    });
    md += `| ${cell(weightCell(w, locale))} | ${cells.map(cell).join(" | ")} |\n`;
  }
  return md;
};
const notesOf = (card, locale) => {
  const vi = locale === "vi";
  const notes = [];
  if (card.weight_rounding_kg) notes.push(vi ? `Cân nặng làm tròn lên mỗi ${kg(Number(card.weight_rounding_kg), locale)} kg.` : `Weight is rounded up to the next ${kg(Number(card.weight_rounding_kg), locale)} kg.`);
  if (card.min_chargeable_kg) notes.push(vi ? `Tính cước tối thiểu ${kg(Number(card.min_chargeable_kg), locale)} kg.` : `Minimum chargeable weight ${kg(Number(card.min_chargeable_kg), locale)} kg.`);
  if (card.local_delivery_fee_minor !== null) notes.push(vi ? `Phí giao tại nước đến ${money(Number(card.local_delivery_fee_minor), card.currency, locale)}/lô khi dưới ${kg(Number(card.local_delivery_free_from_kg), locale)} kg.` : `Destination delivery fee ${money(Number(card.local_delivery_fee_minor), card.currency, locale)} per shipment below ${kg(Number(card.local_delivery_free_from_kg), locale)} kg.`);
  return notes;
};
out = header(
  "Bảng giá theo tuyến (bản sao tham khảo để chép vào bài)",
  "Ngoại lệ quy tắc 2 (chủ doanh nghiệp 2026-11-23): bài viết của một tuyến được chép bảng giá dưới đây, ghi \"Giá tham khảo, cập nhật ngày …\" theo ngày xuất ở dòng trên, và luôn kèm link tới bảng giá của trang tuyến. Chép nguyên văn ô giá, không tự tính, không làm tròn. Tuyến không có ở đây: không đưa giá vào bài.",
);
for (const r of routes) {
  const rc = cards.filter((c) => c.route_id === r.id);
  if (rc.length === 0) continue;
  out += `\n## ${r.name_vi ?? r.key} · \`${r.key}\`\n`;
  out += `\nLink bảng giá trên trang tuyến (cùng đường dẫn cho cả ba công ty, nếu công ty có trang tuyến trong \`01-tuyen-va-duong-dan.md\`): VI \`${(routePages.find((p) => p.route_id === r.id && p.locale === "vi") ?? {}).slug ? pathOf("vi", routePages.find((p) => p.route_id === r.id && p.locale === "vi").slug) + "#route-rates" : "—"}\` · EN \`${(routePages.find((p) => p.route_id === r.id && p.locale === "en") ?? {}).slug ? pathOf("en", routePages.find((p) => p.route_id === r.id && p.locale === "en").slug) + "#route-rates" : "—"}\`\n`;
  for (const card of rc) {
    for (const locale of ["vi", "en"]) {
      const table = tableOf(card, locale);
      if (!table) continue;
      const title = locale === "vi" ? `${card.tab_vi ?? ""} · ${card.place_vi ?? ""}` : `${card.tab_en ?? ""} · ${card.place_en ?? ""}`;
      out += `\n### ${locale.toUpperCase()}: ${title.trim()}\n\n${table}`;
      const notes = notesOf(card, locale);
      if (notes.length) out += `\n${notes.map((n) => `- ${n}`).join("\n")}\n`;
    }
  }
  const lists = [...new Set(surcharges.filter((x) => x.route_id === r.id).map((x) => x.list_id))];
  for (const listId of lists) {
    const items = surcharges.filter((x) => x.list_id === listId);
    for (const locale of ["vi", "en"]) {
      const vi = locale === "vi";
      const first = items[0];
      out += `\n### ${locale.toUpperCase()}: ${vi ? "Phụ thu" : "Surcharges"} · ${(vi ? first.title_vi : first.title_en) ?? ""}\n\n`;
      out += `| ${vi ? "Mặt hàng" : "Item"} | ${vi ? "Phụ thu" : "Surcharge"} |\n|---|---:|\n`;
      for (const x of items) {
        const note = vi ? x.note_vi : x.note_en;
        out += `| ${cell((vi ? x.item_vi : x.item_en) ?? "—")}${note ? ` (${cell(note)})` : ""} | ${cell((vi ? x.price_vi : x.price_en) ?? "—")} |\n`;
      }
      const foot = vi ? first.foot_vi : first.foot_en;
      if (foot) out += `\n${foot}\n`;
    }
  }
}
files["05-bang-gia-theo-tuyen.md"] = out;


await sql.end();

// 04: the VI ↔ EN glossary, copied from the context pack (one place for terms).
files["04-thuat-ngu-vi-en.md"] = `${header("Thuật ngữ VI ↔ EN")}\n${readFileSync(join(root, "docs", "context", "12-glossary.md"), "utf8").replace(/^# .*\n/, "")}`;
const dir = join(here, "..", "knowledge", "generated");
mkdirSync(dir, { recursive: true });
for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
console.log(`Wrote ${Object.keys(files).length} files to ${dir}`);
