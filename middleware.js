import { NextResponse } from "next/server";

export function middleware(request) {
  const username = process.env.CRM_BASIC_USER;
  const password = process.env.CRM_BASIC_PASSWORD;

  const authHeader = request.headers.get("authorization");

  if (authHeader) {
    const basicAuth = authHeader.split(" ")[1];
    const [user, pass] = atob(basicAuth).split(":");

    if (user === username && pass === password) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Autenticação necessária", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="SegurCRM"',
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|logo.png).*)",
  ],
};
