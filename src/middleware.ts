import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigurado } from "@/lib/supabase/config";

const PUBLICAS = ["/m/", "/cardapio", "/api/webhooks"];

/** Renova a sessão do Supabase e manda para /login quem não está logado. */
export async function middleware(request: NextRequest) {
  if (!supabaseConfigurado) return NextResponse.next();

  let response = NextResponse.next({ request });
  const sb = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await sb.auth.getUser();

  const caminho = request.nextUrl.pathname;
  // Páginas do cliente (cardápio da mesa e delivery) e webhooks são públicos
  if (PUBLICAS.some((p) => caminho.startsWith(p))) return response;

  const naLogin = caminho.startsWith("/login");
  if (!user && !naLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (user && naLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.png|logo.svg|categorias/|.*\\.(?:png|svg|jpg|webp)$).*)"],
};
