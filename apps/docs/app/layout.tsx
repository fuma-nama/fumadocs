import { Inter } from "next/font/google";
import { ExternalLinkIcon, Star } from "lucide-react";
import { RootProvider } from "next-docs-ui/provider";
import { Nav } from "@/components/nav";

import "next-docs-ui/style.css";
import "./style.css";

export const metadata = {
    title: {
        template: "%s | Next Docs",
        default: "Next Docs",
    },
    description: "The headless ui library for building a documentation website",
    openGraph: {
        url: "https://next-docs-zeta.vercel.app",
        title: {
            template: "%s | Next Docs",
            default: "Next Docs",
        },
        description:
            "The headless ui library for building a documentation website",
        images: "/banner.png",
        siteName: "Next Docs",
    },
    twitter: {
        card: "summary_large_image",
        creator: "@money_is_shark",
        title: {
            template: "%s | Next Docs",
            default: "Next Docs",
        },
        description:
            "The headless ui library for building a documentation website",
        images: "/banner.png",
    },
    metadataBase:
        process.env.NODE_ENV === "development"
            ? "http://localhost:3000"
            : `https://${process.env.VERCEL_URL}`,
};

const inter = Inter({
    subsets: ["latin"],
});

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={inter.className}>
            <body className="relative flex flex-col min-h-screen">
                <RootProvider>
                    <Nav />
                    {children}
                    <Footer />
                </RootProvider>
            </body>
        </html>
    );
}

function Footer() {
    return (
        <footer className="mt-auto border-t py-12 bg-secondary text-secondary-foreground">
            <div className="container flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-semibold mb-1">NEXT DOCS</p>
                    <p className="text-xs">Built with ❤️ by Fuma</p>
                </div>

                <div className="flex flex-row gap-20 items-center">
                    <a
                        href="https://github.com/SonMooSans/next-docs"
                        rel="noreferrer noopener"
                        className="flex flex-row items-center text-sm"
                    >
                        <Star className="w-4 h-4 mr-2" />
                        Give us a star
                    </a>
                    <a
                        href="https://www.npmjs.com/package/next-docs-zeta"
                        rel="noreferrer noopener"
                        className="flex flex-row items-center text-sm"
                    >
                        <ExternalLinkIcon className="w-4 h-4 mr-2" />
                        NPM registry
                    </a>
                </div>
            </div>
        </footer>
    );
}
