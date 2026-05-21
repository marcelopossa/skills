import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "marcelopossa-skills",
  description: "Marketplace pessoal de skills curadas por Marcelo Possa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-6">
            <Link href="/" className="font-semibold text-lg">
              marcelopossa-skills
            </Link>
            <nav className="flex gap-4 text-sm text-zinc-600 dark:text-zinc-400">
              <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Skills
              </Link>
              <Link href="/repos" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Fontes
              </Link>
              <Link href="/publish" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                Publicar
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
