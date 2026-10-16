import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

// Everything requires a session except the login page and static assets.
const PUBLIC_PATHS = ["/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // Signed-in users shouldn't sit on the login page.
  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (!session && !isPublic) {
    const url = new URL("/login", req.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // ---- Role-based route access (defence in depth; nav hiding is cosmetic) ----
  if (session && !isPublic) {
    const role = session.role;
    const startsWithAny = (prefixes: string[]) =>
      prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));

    // Company configuration & user admin — admin only.
    const ADMIN_ONLY = ["/business-units", "/agency-groups", "/industries", "/currencies", "/tax-rules", "/uoms", "/salespeople", "/media-channels", "/admin"];
    // Bank & cash and payments — admin or accountant only.
    const FINANCE_ONLY = ["/bank-accounts", "/payments"];

    if (startsWithAny(ADMIN_ONLY) && role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (startsWithAny(FINANCE_ONLY) && !(role === "admin" || role === "accountant")) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Restricted salesperson group: whitelist only their own surfaces.
    if (role === "salesperson") {
      const SALESPERSON_ALLOW = ["/booking-orders", "/proforma-invoices", "/sales-targets", "/account"];
      if (!(pathname === "/" || startsWithAny(SALESPERSON_ALLOW))) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  // Protect all app routes; skip Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|woff2?)$).*)"],
};
