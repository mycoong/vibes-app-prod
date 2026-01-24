import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: ["/builder/:path*"],
};

function clearAuthCookies(res: NextResponse) {
  const opts = { path: "/" };
  res.cookies.set("ww_session", "", { ...opts, maxAge: 0 });
  res.cookies.set("ww_license", "", { ...opts, maxAge: 0 });
  res.cookies.set("ww_device_id", "", { ...opts, maxAge: 0 });
}

export async function middleware(req: NextRequest) {
  // DEV MODE: jangan blok apa pun di localhost
  if (process.env.NODE_ENV !== "production") return NextResponse.next();

  const token = req.cookies.get("ww_session")?.value || "";
  const license = req.cookies.get("ww_license")?.value || "";
  const device_id = req.cookies.get("ww_device_id")?.value || "";

  if (!token || token !== "ok" || !license || !device_id) {
    const res = NextResponse.redirect(new URL("/", req.url));
    clearAuthCookies(res);
    return res;
  }

  const base = (process.env.LICENSE_API_URL || "").trim();
  if (!base) {
    const res = NextResponse.redirect(new URL("/", req.url));
    clearAuthCookies(res);
    return res;
  }

  const url = new URL(base);
  url.searchParams.set("action", "validate");
  url.searchParams.set("license", license);
  url.searchParams.set("device_id", device_id);

  try {
    const r = await fetch(url.toString(), { method: "GET", headers: { "cache-control": "no-store" } });
    const j = await r.json().catch(() => ({} as any));

    const ok = j?.ok === true;
    const status = String(j?.status || "").toUpperCase();

    if (ok && status === "ACTIVE") return NextResponse.next();

    const res = NextResponse.redirect(new URL("/", req.url));
    clearAuthCookies(res);
    return res;
  } catch {
    const res = NextResponse.redirect(new URL("/", req.url));
    clearAuthCookies(res);
    return res;
  }
}
