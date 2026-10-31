import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api";
import "./AdminDashboard.css";

const NAV = [
  ["overview", "نمای کلی", "◫"],
  ["users", "کاربران", "♙"],
  ["purchase_requests", "درخواست خرید", "⇧"],
  ["purchases", "خریدهای ثبت‌شده", "◈"],
  ["withdrawals", "برداشت‌ها", "⇩"],
  ["nft_orders", "سفارش‌های NFT", "◇"],
  ["deposits", "واریزهای TON", "↧"],
  ["wallet_transactions", "تراکنش‌های کیف پول", "⇄"],
  ["ledger", "دفتر کل / سودها", "▤"],
  ["referrals", "شبکه زیرمجموعه", "⌘"],
  ["referral_caps", "سقف پاداش", "◎"],
];

const COLUMNS = {
  users: [["telegram_id","شناسه تلگرام"],["username","نام کاربری"],["wallet_address","کیف پول"],["referral_code","کد دعوت"],["referral_count","تعداد دعوت"],["epl_balance","موجودی EPL"],["ecg_available","ECG آزاد"],["ecg_locked","ECG قفل"],["usdt_available","USDT آزاد"],["usdt_locked","USDT قفل"],["total_investment","سرمایه‌گذاری"],["total_earned","سود کل"],["is_active","فعال"],["last_active","آخرین فعالیت"]],
  purchase_requests: [["id","شناسه"],["username","کاربر"],["telegram_id","تلگرام"],["wallet_address","کیف پول"],["ton_amount","مقدار TON"],["usd_value","ارزش دلاری"],["output_asset","دارایی"],["receipt_hash","هش رسید"],["status","وضعیت"],["created_at","تاریخ"],["reviewed_at","بررسی"]],
  purchases: [["invoice_no","فاکتور"],["username","کاربر"],["ton_amount","TON"],["usd_value","ارزش دلاری"],["output_asset","دارایی"],["output_amount","مقدار دریافتی"],["self_profit_5","سود ۵٪"],["tx_hash","هش تراکنش"],["created_at","تاریخ"]],
  withdrawals: [["id","شناسه"],["username","کاربر"],["telegram_id","تلگرام"],["source_asset","مبدأ"],["asset","دارایی پرداخت"],["requested_amount","مقدار"],["destination_wallet","کیف پول مقصد"],["status","وضعیت"],["tx_hash","هش تراکنش"],["created_at","ثبت"],["completed_at","تکمیل"]],
  nft_orders: [["id","شناسه سفارش"],["username","کاربر"],["product_id","محصول"],["quantity","تعداد"],["usd_total","مبلغ USD"],["ton_due","مبلغ TON"],["status","وضعیت"],["contact","راه ارتباطی"],["payment_tx_hash","هش پرداخت"],["created_at","تاریخ"]],
  deposits: [["username","کاربر"],["amount","مقدار TON"],["sender_address","فرستنده"],["merchant_address","دریافت‌کننده"],["network","شبکه"],["tx_hash","هش تراکنش"],["status","وضعیت"],["created_at","تاریخ"],["confirmed_at","تأیید"]],
  wallet_transactions: [["username","کاربر"],["transaction_type","نوع"],["amount","مقدار"],["asset","ارز"],["received_amount","دریافتی"],["received_asset","ارز دریافتی"],["status","وضعیت"],["tx_hash","هش"],["reference","شناسه مرجع"],["created_at","تاریخ"]],
  ledger: [["id","شناسه"],["username","کاربر"],["type","نوع عملیات"],["amount","مقدار"],["meta","اطلاعات"],["created_at","تاریخ"]],
  referrals: [["username","کاربر"],["telegram_id","تلگرام"],["level_1","سطح ۱"],["level_2","سطح ۲"],["level_3","سطح ۳"],["level_4","سطح ۴"],["level_5","سطح ۵"],["updated_at","به‌روزرسانی"]],
  referral_caps: [["username","کاربر"],["personal_purchase_ton","خرید شخصی TON"],["cap_ton","سقف TON"],["used_ton","مصرف‌شده"],["burned_ton","سوخت‌شده"],["updated_at","به‌روزرسانی"]],
};

const fmt = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "بله" : "خیر";
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "string" && /(^|_)(at|date)$/.test("")) return v;
  if (typeof v === "string" && /^\d{4}-\d\d-\d\dT/.test(v)) {
    const d = new Date(v); return Number.isNaN(d.getTime()) ? v : d.toLocaleString("fa-IR");
  }
  return String(v);
};
const num = (v) => Number(v || 0).toLocaleString("fa-IR", { maximumFractionDigits: 4 });
const short = (v) => { const s = String(v || ""); return s.length > 28 ? `${s.slice(0, 12)}…${s.slice(-9)}` : s || "—"; };
const errorText = (e) => e?.response?.data?.error || e?.response?.data?.detail || e?.message || "خطای نامشخص";

function Stat({ label, value, hint, tone = "" }) {
  return <article className={`ap-stat ${tone}`}><span>{label}</span><strong>{value ?? "—"}</strong>{hint && <small>{hint}</small>}</article>;
}

export default function AdminDashboard() {
  const [otp, setOtp] = useState("");
  const [session, setSession] = useState(() => sessionStorage.getItem("admin_session_token") || "");
  const [data, setData] = useState(null);
  const [active, setActive] = useState("overview");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState("");

  const clearSession = useCallback(() => {
    sessionStorage.removeItem("admin_session_token");
    setSession(""); setData(null);
  }, []);

  const fetchDashboard = useCallback(async (token) => api.get("/admin/system-dashboard/", {
    headers: { "X-Admin-Session": token },
  }), []);

  const refresh = useCallback(async (token = session) => {
    if (!token) return;
    setLoading(true); setError("");
    try {
      const response = await fetchDashboard(token);
      setData(response.data);
    } catch (e) {
      if (e?.response?.status === 403) { clearSession(); setError("نشست ادمین منقضی شده؛ دوباره وارد شوید."); }
      else setError(errorText(e));
    } finally { setLoading(false); }
  }, [session, fetchDashboard, clearSession]);

  useEffect(() => { if (session && !data) refresh(session); }, [session, data, refresh]);

  const login = async () => {
    if (!/^\d{6}$/.test(otp)) { setError("کد ۶ رقمی Google Authenticator را وارد کنید."); return; }
    setLoading(true); setError("");
    try {
      const r = await api.post("/admin/session/", {}, { headers: { "X-Admin-OTP": otp } });
      const token = r?.data?.admin_session;
      if (!token) throw new Error("توکن ورود از سرور دریافت نشد.");
      const dashboard = await fetchDashboard(token);
      sessionStorage.setItem("admin_session_token", token);
      setSession(token); setData(dashboard.data); setOtp("");
    } catch (e) { clearSession(); setError(errorText(e)); }
    finally { setLoading(false); }
  };

  const copy = async (value, label = "مقدار") => {
    if (!value) return;
    try { await navigator.clipboard.writeText(String(value)); setToast(`${label} کپی شد`); }
    catch { setToast("کپی کردن انجام نشد"); }
    window.setTimeout(() => setToast(""), 2200);
  };

  const reviewPurchase = async (item, action) => {
    if (!window.confirm(action === "APPROVE" ? `درخواست خرید #${item.id} تأیید شود؟` : `درخواست خرید #${item.id} رد شود؟`)) return;
    setBusy(`purchase-${item.id}`); setError("");
    try {
      await api.post(`/admin/purchases/${item.id}/review/`, { action }, { headers: { "X-Admin-Session": session } });
      await refresh();
      setToast(action === "APPROVE" ? "درخواست خرید تأیید شد" : "درخواست خرید رد شد");
    } catch (e) { if (e?.response?.status === 403) clearSession(); setError(errorText(e)); }
    finally { setBusy(""); }
  };

  const completeWithdrawal = async (item) => {
    const tx = window.prompt("هش تراکنش یا رسید پرداخت را وارد کنید:", item.tx_hash || "");
    if (tx === null) return;
    if (!tx.trim()) { setError("برای تکمیل برداشت، هش تراکنش الزامی است."); return; }
    setBusy(`withdraw-${item.id}`); setError("");
    try {
      await api.post(`/admin/withdrawals/${item.id}/complete/`, { tx_hash: tx.trim() }, { headers: { "X-Admin-Session": session } });
      await refresh();
      setToast("برداشت با موفقیت تکمیل شد");
    } catch (e) { if (e?.response?.status === 403) clearSession(); setError(errorText(e)); }
    finally { setBusy(""); }
  };

  const currentRows = useMemo(() => {
    if (!data || !COLUMNS[active]) return [];
    let rows = data[active] || [];
    if (statusFilter !== "all" && rows.some((r) => "status" in r)) rows = rows.filter((r) => String(r.status).toLowerCase() === statusFilter);
    const q = query.trim().toLowerCase();
    if (q) rows = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
    return rows;
  }, [data, active, query, statusFilter]);

  const exportCsv = () => {
    const cols = COLUMNS[active] || [];
    if (!cols.length) return;
    const quote = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const csv = [cols.map((c) => quote(c[1])).join(","), ...currentRows.map((r) => cols.map(([k]) => quote(typeof r[k] === "object" ? JSON.stringify(r[k]) : r[k])).join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `admin-${active}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  if (!data) return <main className="ap-shell ap-login" dir="rtl">
    <div className="ap-login-card">
      <div className="ap-brand-mark">A</div><p className="ap-eyebrow">AI POLIFY · CONTROL CENTER</p>
      <h1>ورود به پنل مدیریت</h1><p className="ap-muted">برای دسترسی امن، کد یک‌بارمصرف Google Authenticator را وارد کنید.</p>
      <label htmlFor="admin-otp">کد امنیتی ۶ رقمی</label>
      <input id="admin-otp" className="ap-otp" value={otp} maxLength={6} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={(e) => e.key === "Enter" && login()} />
      {error && <div className="ap-alert error">{error}</div>}
      <button className="ap-primary full" onClick={login} disabled={loading}>{loading ? "در حال بررسی…" : "ورود امن به پنل"}</button>
      <small className="ap-muted">اتصال رمزنگاری‌شده · نشست زمان‌دار</small>
    </div>
  </main>;

  const summary = data.summary || {};
  const treasury = summary.treasury || {};
  const isTable = Boolean(COLUMNS[active]);
  const title = NAV.find(([key]) => key === active)?.[1] || "نمای کلی";

  return <main className="ap-shell" dir="rtl">
    <aside className="ap-sidebar">
      <div className="ap-logo"><span className="ap-brand-mark">A</span><div><b>POLIFY</b><small>ADMIN CONSOLE</small></div></div>
      <div className="ap-side-caption">مدیریت سیستم</div>
      <nav>{NAV.map(([key, label, icon]) => <button key={key} className={active === key ? "selected" : ""} onClick={() => { setActive(key); setQuery(""); setStatusFilter("all"); }}><span className="ap-nav-icon">{icon}</span>{label}{key === "purchase_requests" && summary.pending_purchases > 0 && <i>{num(summary.pending_purchases)}</i>}</button>)}</nav>
      <div className="ap-side-bottom"><span className="ap-live-dot"/> اتصال پنل فعال <small>نسخه مدیریت ۱.۰</small></div>
    </aside>

    <section className="ap-main">
      <header className="ap-topbar">
        <div><span className="ap-eyebrow">CONTROL CENTER / {active.toUpperCase()}</span><h1>{title}</h1><p>مدیریت و نظارت یکپارچه بر فعالیت‌های برنامه</p></div>
        <div className="ap-top-actions"><span className="ap-session"><i/> نشست امن فعال</span><button className="ap-ghost" onClick={() => refresh()} disabled={loading}>↻ {loading ? "در حال بروزرسانی" : "بروزرسانی"}</button><button className="ap-logout" onClick={() => { clearSession(); setActive("overview"); }}>خروج</button></div>
      </header>
      {error && <div className="ap-alert error">{error}</div>}
      {toast && <div className="ap-toast">{toast}</div>}
      {treasury.low_balance && <div className="ap-alert warning">موجودی خزانه TON کمتر از حد مجاز است.</div>}

      {active === "overview" ? <>
        <div className="ap-welcome"><div><span>گزارش لحظه‌ای سامانه</span><h2>خلاصه وضعیت کسب‌وکار</h2><p>آمار از اطلاعات ثبت‌شده در دیتابیس دریافت شده است.</p></div><div className="ap-date">{new Date().toLocaleDateString("fa-IR", { dateStyle: "full" })}</div></div>
        <div className="ap-stats-grid">
          <Stat label="کل کاربران" value={num(summary.total_users)} hint={`${num(summary.active_users)} کاربر فعال`} />
          <Stat label="کل خریدهای موفق" value={num(summary.total_purchases)} hint={`${num(summary.pending_purchases)} درخواست در انتظار`} />
          <Stat label="ارزش خریدها" value={`$${num(summary.total_usd_value)}`} hint={`${num(summary.total_ton_received)} TON دریافت‌شده`} />
          <Stat label="برداشت‌های در انتظار" value={num(summary.pending_withdrawals)} tone={summary.pending_withdrawals ? "amber" : ""} />
          <Stat label="سفارش NFT در انتظار" value={num(summary.pending_nft_orders)} />
          <Stat label="واریز TON در انتظار" value={num(summary.pending_deposits)} />
          <Stat label="موجودی آزاد ECG" value={`${num(summary.ecg_available)} ECG`} />
          <Stat label="موجودی آزاد USDT" value={`${num(summary.usdt_available)} USDT`} />
          <Stat label="موجودی آزاد EPL" value={`${num(summary.epl_available)} EPL`} />
          <Stat label="کل EPL کسب‌شده" value={`${num(summary.epl_total_earned)} EPL`} />
          <Stat label="پاداش Timer" value={`${num(summary.timer_epl_total)} EPL`} />
          <Stat label="پاداش دعوت" value={`${num(summary.referral_epl_total)} EPL`} />
        </div>
        <div className="ap-overview-grid">
          <section className="ap-card"><div className="ap-card-head"><div><span className="ap-eyebrow">WORK QUEUE</span><h3>موارد نیازمند بررسی</h3></div><span className="ap-chip">در انتظار</span></div>
            {[["درخواست خرید", summary.pending_purchases, "purchase_requests"],["درخواست برداشت", summary.pending_withdrawals, "withdrawals"],["سفارش NFT", summary.pending_nft_orders, "nft_orders"],["واریز TON", summary.pending_deposits, "deposits"]].map(([label, value, key]) => <button className="ap-queue-row" key={key} onClick={() => setActive(key)}><span>{label}</span><b>{num(value || 0)}</b><span>مشاهده ←</span></button>)}
          </section>
          <section className="ap-card"><div className="ap-card-head"><div><span className="ap-eyebrow">ASSET OVERVIEW</span><h3>وضعیت دارایی‌ها</h3></div></div>
            {[["ECG",summary.ecg_available,summary.ecg_self_locked],["USDT",summary.usdt_available,summary.usdt_self_locked],["EPL",summary.epl_available,summary.epl_total_earned]].map(([name,free,locked]) => <div className="ap-asset-row" key={name}><b>{name}</b><div><strong>{num(free)}</strong><small>موجودی آزاد</small></div><div><strong>{num(locked)}</strong><small>{name === "EPL" ? "کل کسب‌شده" : "سود قفل‌شده"}</small></div></div>)}
          </section>
        </div>
        <section className="ap-card ap-treasury"><div><span className="ap-eyebrow">TREASURY</span><h3>خزانه TON</h3><p>{treasury.address ? short(treasury.address) : "آدرس خزانه تنظیم نشده است"}</p></div><div><strong>{treasury.balance_ton == null ? "نامشخص" : `${num(treasury.balance_ton)} TON`}</strong><small>{treasury.error || "موجودی زنجیره در دسترس نیست"}</small></div></section>
      </> : <>
        <div className="ap-table-toolbar">
          <div><span className="ap-count">{num(currentRows.length)} رکورد</span><span className="ap-muted">· حداکثر ۱۰۰۰ مورد اخیر از هر بخش</span></div>
          <div className="ap-table-controls"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جست‌وجو در اطلاعات…" />
            {currentRows.some((r) => "status" in r) && <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">همه وضعیت‌ها</option><option value="pending">در انتظار</option><option value="PENDING">در انتظار</option><option value="APPROVED">تأییدشده</option><option value="REJECTED">ردشده</option><option value="completed">تکمیل‌شده</option><option value="confirmed">تأییدشده</option><option value="failed">ناموفق</option><option value="PAID">پرداخت‌شده</option></select>}
            <button className="ap-ghost" onClick={exportCsv}>↓ خروجی CSV</button></div>
        </div>
        <div className="ap-card ap-table-card"><div className="ap-table-scroll"><table><thead><tr>{COLUMNS[active].map(([key,label]) => <th key={key}>{label}</th>)}{["purchase_requests","withdrawals"].includes(active) && <th>عملیات</th>}</tr></thead>
          <tbody>{currentRows.map((row, idx) => <tr key={row.id || row.invoice_no || row.reference || idx}>{COLUMNS[active].map(([key]) => {
            const value = row[key];
            const copyable = ["wallet_address","destination_wallet","tx_hash","receipt_hash","payment_tx_hash","sender_address","merchant_address","reference","id"].includes(key);
            const display = key === "wallet_address" || key === "destination_wallet" || key.includes("hash") || key === "sender_address" || key === "merchant_address" ? short(value) : key === "meta" ? short(JSON.stringify(value || {})) : fmt(value);
            return <td key={key} title={value == null ? "" : String(value)}>{copyable && value ? <button className="ap-copy" onClick={() => copy(value, "مقدار")}>{display} ⧉</button> : display}</td>;
          })}
          {active === "purchase_requests" && <td>{row.status === "PENDING" ? <div className="ap-row-actions"><button className="ap-approve" disabled={!!busy} onClick={() => reviewPurchase(row,"APPROVE")}>{busy === `purchase-${row.id}` ? "…" : "تأیید"}</button><button className="ap-reject" disabled={!!busy} onClick={() => reviewPurchase(row,"REJECT")}>رد</button></div> : <span className={`ap-status ${String(row.status).toLowerCase()}`}>{row.status}</span>}</td>}
          {active === "withdrawals" && <td>{String(row.status).toUpperCase() === "PENDING" ? <button className="ap-approve" disabled={!!busy} onClick={() => completeWithdrawal(row)}>{busy === `withdraw-${row.id}` ? "…" : "ثبت پرداخت"}</button> : <span className="ap-status">{row.display_status || row.status}</span>}</td>}
          </tr>)}</tbody></table>
          {!currentRows.length && <div className="ap-empty">رکوردی برای نمایش وجود ندارد.</div>}
        </div></div>
        {active === "nft_orders" && <p className="ap-note">مدیریت و تأیید پرداخت سفارش‌های NFT در حال حاضر از بخش Django Admin انجام می‌شود؛ این قسمت برای مشاهده و پیگیری سفارش‌هاست.</p>}
        {active === "deposits" && <p className="ap-note">وضعیت واریزها از دیتابیس نمایش داده می‌شود. تأیید زنجیره‌ای واریزها باید از مسیر تأیید امن TON انجام شود.</p>}
      </>}
      <footer className="ap-footer">POLIFY ADMIN · داشبورد مدیریتی · اطلاعات بر اساس داده‌های ثبت‌شده سرور</footer>
    </section>
  </main>;
}
