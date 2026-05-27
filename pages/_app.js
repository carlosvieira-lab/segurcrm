import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://accmdxprsetsqsrepflq.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "sb_publishable_AicIeg3TXV3cJaG3R8YBFQ_A3uJGQEI";

const supabase = createClient(supabaseUrl, supabaseKey);

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      const isLoginPage = router.pathname === "/login";

      if (!data.session && !isLoginPage) {
        router.push("/login");
        return;
      }

      if (data.session && isLoginPage) {
        router.push("/");
        return;
      }

      setChecking(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkSession();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router.pathname]);

  if (checking && router.pathname !== "/login") {
    return (
      <>
        <Head>
          <title>CRM.SISEGCVIEIRA</title>
          <link rel="icon" type="image/png" href="/logo.png?v=2" />
          <link rel="shortcut icon" href="/logo.png?v=2" />
        </Head>

        <div style={loadingPage}>
          <h2>A verificar sessão...</h2>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>CRM.SISEGCVIEIRA</title>
        <link rel="icon" type="image/png" href="/logo.png?v=2" />
        <link rel="shortcut icon" href="/logo.png?v=2" />
      </Head>

      <Component {...pageProps} />
    </>
  );
}

const loadingPage = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "Arial, sans-serif",
  background: "#f3f4f6",
};
