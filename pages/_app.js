import Head from "next/head";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>CRM.SISEGCVIEIRA</title>
        <link rel="icon" href="/logo.png" />
      </Head>

      <Component {...pageProps} />
    </>
  );
}
