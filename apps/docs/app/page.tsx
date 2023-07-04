import Image from "next/image";
import { ComponentPropsWithRef, ComponentPropsWithoutRef } from "react";

export default function HomePage() {
    return (
        <div className="flex flex-col relative">
            <div className="flex absolute top-0 inset-x-0">
                <div className="w-[1500px] max-w-[100vw] h-[300px] mx-auto bg-gradient-radial-top from-blue-500/10 to-80%" />
            </div>
            <Image
                src="/stars.png"
                alt="stars"
                width={650 / 1.2}
                height={627 / 1.2}
                className="absolute right-0 top-0"
                priority
            />
            <div className="absolute top-0 left-0 max-xl:hidden">
                <div className="w-6 ml-72 h-[500px] -rotate-45 rounded-full bg-gradient-to-b from-transparent via-purple-400/50 via-60% to-cyan-200" />
            </div>
            <Star className="absolute top-40 left-[10%] text-cyan-100 animate-star delay-200 max-lg:hidden" />
            <Star className="absolute top-72 left-[30%] scale-[.25] text-cyan-100 delay-700 animate-star" />
            <Star className="absolute top-64 right-[10%] scale-50 text-pink-200 animate-star md:top-20" />
            <Star className="absolute top-96 right-[15%] text-pink-200 delay-1000 animate-star max-lg:hidden" />
            <Star className="absolute top-64 right-[30%] scale-50 animate-star text-pink-200 max-lg:hidden" />

            <div className="pt-40 z-[2] flex flex-col gap-4 text-center container">
                <div className="relative mx-auto">
                    <div
                        className="absolute top-0 -left-20 -right-20 h-full bg-gradient-to-l from-cyan-200/30 to-purple-400/30 blur-3xl -z-[1] max-w-[100vw]"
                        aria-hidden
                    />
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-purple-200 leading-normal from-20% to-cyan-300 sm:text-5xl">
                        The Headless UI for
                        <br /> Next.js Docs
                    </h1>
                </div>

                <p className="text-[#84BDDD]">
                    Next Docs is a headless ui library built for building
                    documentation websites
                </p>
                <div className="flex flex-row justify-center mt-4">
                    <button className="rounded-full bg-gradient-to-b from-cyan-200 to-cyan-300 px-8 py-2 text-cyan-950 font-medium">
                        Get Started -&gt;
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 container mt-24 gap-10">
                <div className="relative md:col-span-3 p-8 border rounded-2xl flex flex-col overflow-hidden bg-background z-[2]">
                    <div className="-z-[1] mx-auto mb-28 px-24 bg-gradient-to-b from-transparent to-cyan-500/30 rounded-3xl border flex shadow-2xl shadow-cyan-400/30">
                        <Heart className="mx-auto" />
                    </div>
                    <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-background/30 to-blue-500/30 p-8 from-10%">
                        <div className="mt-auto text-center">
                            <p className="text-xl font-medium text-cyan-200 mb-2">
                                First class Developer Experience
                            </p>
                            <p className="text-[#84BDDD] text-sm">
                                Install, Code, Deploy within seconds
                            </p>
                        </div>
                    </div>
                </div>
                <div className="relative md:col-span-2 p-8 border rounded-2xl flex flex-col overflow-hidden bg-background z-[2]">
                    <div className="-z-[1] mx-auto mb-20 relative">
                        <div className="bg-cyan-400/30 inset-0 absolute blur-3xl -z-[1] animate-pulse" />
                        <Rocket className="mx-auto text-cyan-200" />
                    </div>
                    <div className="absolute inset-0 flex flex-col bg-gradient-to-b from-background/30 to-blue-500/30 p-8 from-10%">
                        <div className="mt-auto text-center">
                            <p className="text-xl font-medium text-cyan-200 mb-2">
                                Lightening Fast
                            </p>
                            <p className="text-[#84BDDD] text-sm">
                                Built for App Router and work with Pages Router
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <div className="bg-gradient-to-b from-transparent via-blue-500/10 to-transparent h-[400px] -mt-[200px]" />
        </div>
    );
}

function Star(props: ComponentPropsWithoutRef<"svg">) {
    return (
        <svg
            width="91"
            height="268"
            viewBox="0 0 91 268"
            fill="none"
            {...props}
        >
            <path
                d="M91 134.177C58.7846 134.177 47.4533 48.4036 45.5 0.560455C43.5467 48.4036 32.2154 134.177 0 134.177C32.2154 134.177 43.5467 219.949 45.5 267.793C47.4533 219.949 58.7846 134.177 91 134.177Z"
                fill="currentColor"
            />
        </svg>
    );
}

function Rocket(props: ComponentPropsWithRef<"svg">) {
    return (
        <svg width="200" height="200" viewBox="0 0 512 512" {...props}>
            <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="6"
                d="M461.81 53.81a4.4 4.4 0 0 0-3.3-3.39c-54.38-13.3-180 34.09-248.13 102.17a294.9 294.9 0 0 0-33.09 39.08c-21-1.9-42-.3-59.88 7.5c-50.49 22.2-65.18 80.18-69.28 105.07a9 9 0 0 0 9.8 10.4l81.07-8.9a180.29 180.29 0 0 0 1.1 18.3a18.15 18.15 0 0 0 5.3 11.09l31.39 31.39a18.15 18.15 0 0 0 11.1 5.3a179.91 179.91 0 0 0 18.19 1.1l-8.89 81a9 9 0 0 0 10.39 9.79c24.9-4 83-18.69 105.07-69.17c7.8-17.9 9.4-38.79 7.6-59.69a293.91 293.91 0 0 0 39.19-33.09c68.38-68 115.47-190.86 102.37-247.95ZM298.66 213.67a42.7 42.7 0 1 1 60.38 0a42.65 42.65 0 0 1-60.38 0Z"
            />
            <path
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="6"
                d="M109.64 352a45.06 45.06 0 0 0-26.35 12.84C65.67 382.52 64 448 64 448s65.52-1.67 83.15-19.31A44.73 44.73 0 0 0 160 402.32"
            />
        </svg>
    );
}

function Heart(props: ComponentPropsWithoutRef<"svg">) {
    return (
        <svg
            width="178"
            height="159"
            viewBox="0 0 178 159"
            fill="none"
            {...props}
        >
            <g filter="url(#filter0_d_2_135)">
                <path
                    d="M52 39H76M46 45.5L80 45.5M44 51.5L84 51.5M43 57.5H135M44 63.5H134M45 69.5H133M49 75.5H129M53 81.5H125M57 87.5H121M62 93.5H116M68 99.5H110M75 105.5H103M82.5 111.5H97.5M126 39H102M132 45.5L98 45.5M134 51.5L94 51.5"
                    stroke="#E1FBFF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="animate-heart"
                    strokeDasharray={200}
                />
            </g>
            <defs>
                <filter
                    id="filter0_d_2_135"
                    x="0"
                    y="0"
                    width="178"
                    height="158.5"
                    filterUnits="userSpaceOnUse"
                    colorInterpolationFilters="sRGB"
                >
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix
                        in="SourceAlpha"
                        type="matrix"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        result="hardAlpha"
                    />
                    <feOffset dy="4" />
                    <feGaussianBlur stdDeviation="21" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix
                        type="matrix"
                        values="0 0 0 0 0.7875 0 0 0 0 0.9745 0 0 0 0 1 0 0 0 1 0"
                    />
                    <feBlend
                        mode="normal"
                        in2="BackgroundImageFix"
                        result="effect1_dropShadow_2_135"
                    />
                    <feBlend
                        mode="normal"
                        in="SourceGraphic"
                        in2="effect1_dropShadow_2_135"
                        result="shape"
                    />
                </filter>
            </defs>
        </svg>
    );
}
