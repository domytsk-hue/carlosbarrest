import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigurado } from "@/lib/supabase/config";

const PUBLICAS = ["/m/", "/cardapio", "/api/webhooks"];

/** Renova a sessão do Supabase e manda para /login quem não está logado. */
export async function middleware(request: NextRequest) {
  if (!supabaseConfigurado) return NextResponse.next();

  const caminho = request.nextUrl.pathname;
  // Páginas do cliente (cardápio da mesa e delivery) e webhooks não
  // dependem do login do painel: nem consultam o Supabase.
  if (PUBLICAS.some((p) => caminho.startsWith(p))) return NextResponse.next();

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

  // getClaims confere a assinatura do login aqui mesmo, sem ir ao servidor do
  // Supabase a cada clique (getUser fazia uma ida e volta por requisição).
  // Quando o login vence, ele renova sozinho e grava os cookies novos.
  const { data } = await sb.auth.getClaims();
  const logado = Boolean(data?.claims?.sub);

  const naLogin = caminho.startsWith("/login");
  if (!logado && !naLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (logado && naLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.png|logo.svg|sw.js|categorias/|.*\\.(?:png|svg|jpg|webp|ico|txt|json|webmanifest)$).*)"],
};
