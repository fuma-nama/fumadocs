import { Inter } from "next/font/google";
import "./style.css";

export const metadata = {
    title: "Next Docs",
    description: "The headless ui library for building a documentation website",
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
            <body className={`relative min-h-screen ${inter.className}`}>
                <nav className="sticky flex flex-row items-center top-0 left-0 right-0 h-12 bg-gradient-to-t from-background/50 to-accent to-[150%] z-50 backdrop-blur-xl">
                    <p className="text-sm text-muted-foreground mx-auto text-center">
                        next-docs
                    </p>
                </nav>
                {children}
            </body>
        </html>
    );
}
