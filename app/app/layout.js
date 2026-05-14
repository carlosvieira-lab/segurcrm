export const metadata = {
  title: "SegurCRM",
  description: "CRM para mediação de seguros",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
