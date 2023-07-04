import "./style.css";

export const metadata = {
    title: "Next Docs",
    description: "The headless ui library for building a documentation website",
    metadataBase:
        process.env.NODE_ENV === "development"
            ? "http://localhost:3000"
            : `https://${process.env.VERCEL_URL}`,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className="relative">
                <div className="absolute inset-0 -z-[1] overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-br from-purple-400/20 to-background to-50%" />
                </div>
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
