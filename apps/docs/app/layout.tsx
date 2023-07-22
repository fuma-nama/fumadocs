import { Inter } from "next/font/google";
import { GithubIcon } from "lucide-react";
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
        <html lang="en" className="dark">
            <body
                className={`relative flex flex-col min-h-screen ${inter.className}`}
            >
                {children}
                <Footer />
            </body>
        </html>
    );
}

function Footer() {
    return (
        <footer className="mt-auto border-t py-8 pb-20 bg-gradient-to-b from-blue-500/20">
            <div className="container flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-cyan-200 font-bold">NEXT DOCS</p>
                <div className="flex flex-row gap-20 items-center text-[#84BDDD]">
                    <a
                        href="https://github.com/SonMooSans/next-docs"
                        rel="noreferrer noopener"
                        className="flex flex-row items-center text-sm"
                    >
                        <GithubIcon className="w-5 h-5 mr-1" />
                        Github
                    </a>
                    <a
                        href="https://www.npmjs.com/package/next-docs-zeta"
                        rel="noreferrer noopener"
                        className="flex flex-row items-center text-sm"
                    >
                        NPM -&gt;
                    </a>
                </div>
            </div>
        </footer>
    );
}
