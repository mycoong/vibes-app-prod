import { NextResponse } from "next/server";

export const runtime = "nodejs";

function clean(v: any) {
  return String(v ?? "").trim();
}

export async function POST(req: Request) {
  try {
    const LICENSE_API_URL = clean(process.env.LICENSE_API_URL);
    if (!LICENSE_API_URL) {
      return NextResponse.json(
        { ok: false, error: "LICENSE_API_URL_NOT_SET" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({} as any));

    // Lynk payload biasanya punya email + order_id + amount.
    // Kita forward apa adanya biar GAS yang handle issuance + email + logging.
    const email =
      clean(body.email) ||
      clean(body.customer_email) ||
      clean(body.customer?.email);

    const order_id =
      clean(body.order_id) ||
      clean(body.orderId) ||
      clean(body.invoice_id) ||
      clean(body.invoiceId) ||
      clean(body.transaction_id) ||
      clean(body.transactionId);

    const amount =
      clean(body.amount) ||
      clean(body.total) ||
      clean(body.price) ||
      clean(body.gross_amount) ||
      clean(body.grossAmount);

    const source = "lynk_webhook";

    // GAS v2: kamu bisa pakai action=issue atau action=simulate_lynk (tergantung implementasi kamu).
    // Kita default ke issue; kalau GAS kamu maunya simulate_lynk, tinggal ganti 1 baris.
    const url = new URL(LICENSE_API_URL);
    url.searchParams.set("action", "issue");

    const upstream = await fetch(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email,
        order_id,
        amount,
        source,
        payload_json: JSON.stringify(body),
      }),
      cache: "no-store",
    });

    const text = await upstream.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = { ok: false, error: "UPSTREAM_NOT_JSON", upstream_text: text.slice(0, 1000) };
    }

    return NextResponse.json(
      data,
      { status: upstream.ok ? 200 : upstream.status || 400 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
