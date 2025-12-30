import Image from 'next/image';
import { cn } from '@/lib/cn';
import Link from 'next/link';
import { cva } from 'class-variance-authority';
import {
  BatteryChargingIcon,
  FileIcon,
  FileTextIcon,
  Heart,
  SearchIcon,
  TimerIcon,
} from 'lucide-react';
import { Marquee } from '@/app/(home)/marquee';
import { CodeBlock } from '@/components/code-block';
import {
  Hero,
  AgnosticBackground,
  CreateAppAnimation,
  PreviewImages,
  Writing,
  ContentAdoptionBackground,
} from '@/app/(home)/page.client';
import ShadcnImage from './shadcn.png';
import ContributorCounter from '@/components/contributor-count';
import { owner, repo } from '@/lib/github';

const headingVariants = cva('font-medium tracking-tight', {
  variants: {
    variant: {
      h2: 'text-3xl lg:text-4xl',
      h3: 'text-xl lg:text-2xl',
    },
  },
});

const buttonVariants = cva(
  'inline-flex justify-center px-5 py-3 rounded-full font-medium tracking-tight transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-brand-foreground hover:bg-brand-200',
        secondary: 'border bg-fd-secondary text-fd-secondary-foreground hover:bg-fd-accent',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
);

const cardVariants = cva('rounded-2xl text-sm p-6 bg-origin-border shadow-lg', {
  variants: {
    variant: {
      secondary: 'bg-brand-secondary text-brand-secondary-foreground',
      default: 'border bg-fd-card',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export default function Page() {
  return (
    <main className="text-landing-foreground pt-4 pb-6 dark:text-landing-foreground-dark md:pb-12">
      <div className="relative flex min-h-[600px] h-[70vh] max-h-[900px] border rounded-2xl overflow-hidden mx-auto w-full max-w-[1400px] bg-origin-border">
        <Hero />
        <div className="flex flex-col z-2 px-4 size-full md:p-12 max-md:items-center max-md:text-center">
          <p className="mt-12 text-xs text-brand font-medium rounded-full p-2 border border-brand/50 w-fit">
            the React.js docs framework you love.
          </p>
          <h1 className="text-4xl my-8 leading-tighter font-medium xl:text-5xl xl:mb-12">
            Build excellent
            <br className="md:hidden" /> documentations,
            <br />
            your <span className="text-brand">style</span>.
          </h1>
          <div className="flex flex-row items-center justify-center gap-4 flex-wrap w-fit">
            <Link href="/docs" className={cn(buttonVariants(), 'max-sm:text-sm')}>
              Getting Started
            </Link>
            <a
              href="https://codesandbox.io/p/sandbox/github/fuma-nama/fumadocs-ui-template"
              target="_blank"
              rel="noreferrer noopener"
              className={cn(buttonVariants({ variant: 'secondary' }), 'max-sm:text-sm')}
            >
              Open CodeSandbox
            </a>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-10 mt-12 px-6 mx-auto w-full max-w-[1400px] md:px-12 lg:grid-cols-2">
        <p className="text-2xl tracking-tight leading-snug font-light col-span-full md:text-3xl xl:text-4xl">
          Fumadocs is a <span className="text-brand font-medium">React.js</span> documentation
          framework for <span className="text-brand font-medium">Developers</span>, beautifully
          designed by <span className="text-brand font-medium">Fuma Nama</span>. Bringing powerful
          features for your docs workflows, with high customizability to fit your preferences, works
          seamlessly with any React.js framework, CMS — anything.
        </p>
        <div className="p-8 bg-radial-[circle_at_top_center] from-25% to-brand-secondary/50 rounded-xl col-span-full">
          <h2 className="text-xl text-center text-brand font-mono font-bold uppercase mb-2">
            Try it out.
          </h2>
          <CodeBlock
            code="pnpm create fumadocs-app"
            lang="bash"
            wrapper={{
              className: 'mx-auto w-full max-w-[800px]',
            }}
          />
          <CreateAppAnimation />
        </div>
        <Feedback />
        <Aesthetics />
        <AnybodyCanWrite />
        <ForEngineers />
        <OpenSource />
      </div>
    </main>
  );
}

function Aesthetics() {
  return (
    <>
      <div
        className={cn(
          cardVariants({
            variant: 'secondary',
            className: 'flex items-center justify-center p-0',
          }),
        )}
      >
        <PreviewImages />
      </div>
      <div className={cn(cardVariants(), 'flex flex-col')}>
        <h3 className={cn(headingVariants({ variant: 'h3', className: 'mb-6' }))}>
          Minimal aesthetics, Maximum customizability.
        </h3>
        <p className="mb-4">
          Fumadocs offer well-designed themes, with a headless mode to plug your own UI.
        </p>
        <p className="mb-4">Pro designer? Customise the theme using Fumadocs CLI.</p>
        <CodeBlock
          code={`pnpm dlx @fumadocs/cli customise\n\n> Choose a layout to customise...`}
          lang="bash"
        />
      </div>
    </>
  );
}

function AnybodyCanWrite() {
  return (
    <Writing
      tabs={{
        writer: (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <CodeBlock
              code={`---
title: Hello World
---

## Overview

I love **Fumadocs**!

\`\`\`ts tab="Tab 1"
console.log("Hello World")
\`\`\`

\`\`\`ts tab="Tab 2"
return 0;
\`\`\``}
              lang="mdx"
            />
            <div className="max-lg:row-start-1">
              <h3 className={cn(headingVariants({ variant: 'h3', className: 'my-4' }))}>
                The familiar syntax.
              </h3>
              <p>
                It is just Markdown, with additional features seamlessly composing into the syntax.
              </p>
              <ul className="text-xs list-disc list-inside mt-8">
                <li>Markdown features, including images</li>
                <li>Syntax highlighting (Powered by Shiki)</li>
                <li>Codeblock Groups</li>
                <li>Callouts</li>
                <li>Cards</li>
                <li>Custom Heading Anchors</li>
                <li>Auto Table of Contents</li>
              </ul>
            </div>
          </div>
        ),
        developer: (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <CodeBlock
              code={`---
title: Hello World
---

import { Playground } from "@/components/playground";

## Overview

<Playground title="Test" />

This codeblock shows TypeScript information!

\`\`\`ts twoslash
console.log("Hello World");

// give your code decorations [!code ++]
const name = "fumadocs";
\`\`\`

And re-use content:

<include>./another-page.mdx</include>`}
              lang="mdx"
            />
            <div className="max-lg:row-start-1">
              <h3 className={cn(headingVariants({ variant: 'h3', className: 'my-4' }))}>
                Extensive but simple.
              </h3>
              <p>MDX for developers authoring content, use JavaScript in content.</p>
              <ul className="text-xs list-disc list-inside mt-8">
                <li>JavaScript + JSX syntax</li>
                <li>Custom Components</li>
                <li>Include/Embed Content</li>
                <li>TypeScript Twoslash: show type information in codeblocks.</li>
                <li>Shiki Notations</li>
                <li>Extend via remark, rehype plugins</li>
              </ul>
            </div>
          </div>
        ),
        automation: (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <CodeBlock
              code={`---
title: Hello World
---

import { db } from "@/lib/db";

export async function DataView() {
  const products = await db.select().from("products");
  return products.map(product => <div key={product.id}>{product.name}</div>)
}

<DataView />

<auto-type-table path='./my-file.ts' name='CardProps' />`}
              lang="mdx"
            />

            <div className="max-lg:row-start-1">
              <h3 className={cn(headingVariants({ variant: 'h3', className: 'my-4' }))}>
                Content, always up-to-date.
              </h3>
              <p>
                Combining the power of MDX and React Server Components, use the latest data from
                database, server — anywhere, to be part of your content.
              </p>
              <ul className="text-xs list-disc list-inside mt-8">
                <li>Works on React Server Components</li>
                <li>Display data from database, CMS, anything</li>
                <li>auto-type-table for documenting types based on TypeScript Compiler</li>
                <li>OpenAPI playground for documenting your APIs</li>
              </ul>
            </div>
          </div>
        ),
      }}
    />
  );
}

const feedback = [
  {
    avatar: 'https://avatars.githubusercontent.com/u/124599',
    user: 'shadcn',
    role: 'Creator of Shadcn UI',
    message: `You know how you end up rebuilding a full docs site every time you start a new project? 

Fumadocs fixes this by giving you all the right blocks that you compose together.

Like headless docs to build exactly what you need.`,
  },
  {
    avatar: 'https://avatars.githubusercontent.com/u/35677084',
    user: 'Anthony Shew',
    role: 'Turbo DX at Vercel',
    message: `Major shoutout to @fuma_nama for making fumadocs, a gorgeous documentation framework that composes beautifully into the App Router.`,
  },
  {
    user: 'Aiden Bai',
    avatar: 'https://avatars.githubusercontent.com/u/38025074',
    role: 'Creator of Million.js',
    message: 'fumadocs is the best Next.js docs framework',
  },
  {
    avatar: 'https://avatars.githubusercontent.com/u/10645823',
    user: 'David Blass',
    role: 'Creator of Arktype',
    message: `I'd have no shot building @arktypeio docs that looked half this good without it 😍`,
  },
];

function Feedback() {
  return (
    <>
      <div className={cn(cardVariants())}>
        <h3 className={cn(headingVariants({ variant: 'h3', className: 'mb-6' }))}>
          A framework people love.
        </h3>
        <p className="mb-6">
          Loved by teams and developers from startups like Unkey, Vercel, Orama — evolving everyday
          to be your favourite docs framework.
        </p>
        <Link href="/showcase" className={cn(buttonVariants())}>
          Showcase
        </Link>
      </div>
      <div
        className={cn(
          cardVariants({
            variant: 'secondary',
            className: 'relative p-0',
          }),
        )}
      >
        <div className="absolute inset-0 z-2 inset-shadow-[0_10px_60px] inset-shadow-brand-secondary rounded-2xl" />
        <Marquee className="p-8">
          {feedback.map((item) => (
            <div
              key={item.user}
              className="flex flex-col rounded-xl border bg-fd-card text-landing-foreground p-4 shadow-lg w-[320px]"
            >
              <p className="text-sm whitespace-pre-wrap">{item.message}</p>

              <div className="mt-auto flex flex-row items-center gap-2 pt-4">
                <Image
                  src={item.avatar}
                  alt="avatar"
                  width="32"
                  height="32"
                  unoptimized
                  className="size-8 rounded-full"
                />
                <div>
                  <p className="text-sm font-medium">{item.user}</p>
                  <p className="text-xs text-fd-muted-foreground">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </Marquee>
      </div>
    </>
  );
}

function ForEngineers() {
  return (
    <>
      <h2
        className={cn(
          headingVariants({
            variant: 'h2',
            className: 'text-brand text-center mb-4 col-span-full',
          }),
        )}
      >
        Docs For Engineers.
      </h2>

      <div className={cn(cardVariants(), 'relative flex flex-col overflow-hidden z-2')}>
        <h3
          className={cn(
            headingVariants({
              variant: 'h3',
              className: 'mb-6',
            }),
          )}
        >
          Framework Agnostic
        </h3>
        <p className="mb-20">
          Official support for Next.js, Tanstack Start, React Router, Waku — portable to any
          React.js framework.
        </p>
        <div className="flex flex-row gap-2 mt-auto bg-brand text-brand-foreground rounded-xl p-2 w-fit">
          <svg
            fill="currentColor"
            role="img"
            viewBox="0 0 24 24"
            className="size-6"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>Next.js</title>
            <path d="M18.665 21.978C16.758 23.255 14.465 24 12 24 5.377 24 0 18.623 0 12S5.377 0 12 0s12 5.377 12 12c0 3.583-1.574 6.801-4.067 9.001L9.219 7.2H7.2v9.596h1.615V9.251l9.85 12.727Zm-3.332-8.533 1.6 2.061V7.2h-1.6v6.245Z" />
          </svg>
          <svg className="size-6" viewBox="0 0 663 660" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="currentColor"
              d="m305.114318.62443771c8.717817-1.14462121 17.926803-.36545135 26.712694-.36545135 32.548987 0 64.505987 5.05339923 95.64868 14.63098274 39.74418 12.2236582 76.762804 31.7666864 109.435876 57.477568 40.046637 31.5132839 73.228974 72.8472109 94.520714 119.2362609 39.836383 86.790386 39.544267 191.973146-1.268422 278.398081-26.388695 55.880442-68.724007 102.650458-119.964986 136.75724-41.808813 27.828603-90.706831 44.862601-140.45707 50.89341-63.325458 7.677926-131.784923-3.541603-188.712259-32.729444-106.868873-54.795293-179.52309291-165.076271-180.9604082-285.932068-.27660564-23.300971.08616998-46.74071 4.69884909-69.814998 7.51316071-37.57857 20.61272131-73.903917 40.28618971-106.877282 21.2814003-35.670293 48.7704861-67.1473767 81.6882804-92.5255597 38.602429-29.7610135 83.467691-51.1674988 130.978372-62.05777669 11.473831-2.62966514 22.9946-4.0869914 34.57273-5.4964306l3.658171-.44480576c3.050084-.37153079 6.104217-.74794222 9.162589-1.14972654zm-110.555861 549.44131429c-14.716752 1.577863-30.238964 4.25635-42.869928 12.522173 2.84343.683658 6.102369.004954 9.068638 0 7.124652-.011559 14.317732-.279903 21.434964.032202 17.817402.781913 36.381729 3.63214 53.58741 8.350042 22.029372 6.040631 41.432961 17.928687 62.656049 25.945156 22.389644 8.456554 44.67706 11.084675 68.427 11.084675 11.96813 0 23.845573-.035504 35.450133-3.302696-6.056202-3.225083-14.72582-2.619864-21.434964-3.963236-14.556814-2.915455-28.868774-6.474936-42.869928-11.470264-10.304996-3.676672-20.230803-8.214291-30.11097-12.848661l-6.348531-2.985046c-9.1705-4.309263-18.363277-8.560752-27.845391-12.142608-24.932161-9.418465-52.560181-14.071964-79.144482-11.221737zm22.259385-62.614168c-29.163917 0-58.660076 5.137344-84.915434 18.369597-6.361238 3.206092-12.407546 7.02566-18.137277 11.258891-1.746125 1.290529-4.841829 2.948483-5.487351 5.191839-.654591 2.275558 1.685942 4.182039 3.014086 5.637703 6.562396-3.497556 12.797498-7.199878 19.78612-9.855246 45.19892-17.169893 99.992458-13.570779 145.098218 2.172348 22.494346 7.851335 43.219483 19.592421 65.129314 28.800338 24.503461 10.297807 49.53043 16.975034 75.846795 20.399104 31.04195 4.037546 66.433549.7654 94.808495-13.242161 9.970556-4.921843 23.814245-12.422267 28.030337-23.320339-5.207047.454947-9.892236 2.685918-14.83959 4.224149-7.866632 2.445646-15.827248 4.51974-23.908229 6.138887-27.388113 5.486604-56.512458 6.619429-84.091013 1.639788-25.991939-4.693152-50.142596-14.119246-74.179513-24.03502l-3.068058-1.268177c-2.045137-.846788-4.089983-1.695816-6.135603-2.544467l-3.069142-1.272366c-12.279956-5.085721-24.606928-10.110797-37.210937-14.51024-24.485325-8.546552-50.726667-13.784628-76.671218-13.784628zm51.114145-447.9909432c-34.959602 7.7225298-66.276908 22.7605319-96.457338 41.7180089-17.521434 11.0054099-34.281927 22.2799893-49.465301 36.4444283-22.5792616 21.065423-39.8360564 46.668751-54.8866988 73.411509-15.507372 27.55357-25.4498976 59.665686-30.2554517 90.824149-4.7140432 30.568106-5.4906485 62.70747-.0906864 93.301172 6.7503648 38.248526 19.5989769 74.140579 39.8896436 107.337631 6.8187918-3.184625 11.659796-10.445603 17.3128555-15.336896 11.4149428-9.875888 23.3995608-19.029311 36.2745548-26.928535 4.765981-2.923712 9.662222-5.194315 14.83959-7.275014 1.953055-.785216 5.14604-1.502727 6.06527-3.647828 1.460876-3.406732-1.240754-9.335897-1.704904-12.865654-1.324845-10.095517-2.124534-20.362774-1.874735-30.549941.725492-29.668947 6.269727-59.751557 16.825623-87.521453 7.954845-20.924233 20.10682-39.922168 34.502872-56.971512 4.884699-5.785498 10.077731-11.170545 15.437296-16.512656 3.167428-3.157378 7.098271-5.858983 9.068639-9.908915-10.336599.006606-20.674847 2.987289-30.503603 6.013385-21.174447 6.519522-41.801477 16.19312-59.358362 29.841512-8.008432 6.226409-13.873368 14.387371-21.44733 20.939921-2.32322 2.010516-6.484901 4.704691-9.695199 3.187928-4.8500728-2.29042-4.1014979-11.835213-4.6571581-16.222019-2.1369011-16.873476 4.2548401-38.216325 12.3778671-52.843142 13.039878-23.479694 37.150915-43.528712 65.467327-42.82854 12.228647.302197 22.934587 4.551115 34.625711 7.324555-2.964621-4.211764-6.939158-7.28162-10.717482-10.733763-9.257431-8.459031-19.382979-16.184864-30.503603-22.028985-4.474136-2.350694-9.291232-3.77911-14.015169-5.506421-2.375159-.867783-5.36616-2.062533-6.259834-4.702213-1.654614-4.888817 7.148561-9.416813 10.381943-11.478522 12.499882-7.969406 27.826705-14.525258 42.869928-14.894334 23.509209-.577147 46.479246 12.467678 56.162903 34.665926 3.404469 7.803171 4.411273 16.054969 5.079109 24.382907l.121749 1.56229.174325 2.345587c.01913.260708.038244.521433.057403.782164l.11601 1.56437.120128 1.563971c7.38352-6.019164 12.576553-14.876995 19.78612-21.323859 16.861073-15.07846 39.936636-21.7722 61.831627-14.984333 19.786945 6.133107 36.984382 19.788105 47.105807 37.959541 2.648042 4.754231 10.035685 16.373942 4.698379 21.109183-4.177345 3.707277-9.475079.818243-13.880788-.719162-3.33605-1.16376-6.782939-1.90214-10.241828-2.585698l-1.887262-.369639c-.629089-.122886-1.257979-.246187-1.886079-.372129-11.980496-2.401886-25.91652-2.152533-37.923398-.041284-7.762754 1.364839-15.349083 4.127545-23.083807 5.271929v1.651348c21.149714.175043 41.608563 12.240618 52.043268 30.549941 4.323267 7.585468 6.482428 16.267431 8.138691 24.770223 2.047864 10.50918.608423 21.958802-2.263037 32.201289-.962925 3.433979-2.710699 9.255807-6.817143 10.046802-2.902789.558982-5.36781-2.330878-7.024898-4.279468-4.343878-5.10762-8.475879-9.96341-13.573278-14.374161-12.895604-11.157333-26.530715-21.449361-40.396663-31.373138-7.362086-5.269452-15.425755-12.12007-23.908229-15.340199 2.385052 5.745041 4.721463 11.086326 5.532694 17.339156 2.385876 18.392716-5.314223 35.704625-16.87179 49.540445-3.526876 4.222498-7.29943 8.475545-11.744712 11.755948-1.843407 1.360711-4.156734 3.137561-6.595373 2.752797-7.645687-1.207961-8.555849-12.73272-9.728176-18.637115-3.970415-19.998652-2.375984-39.861068 3.132802-59.448534-4.901187 2.485279-8.443727 7.923994-11.521293 12.385111-6.770975 9.816439-12.645804 20.199291-16.858599 31.375615-16.777806 44.519521-16.616219 96.664142 5.118834 139.523233 2.427098 4.786433 6.110614 4.144058 10.894733 4.144058.720854 0 1.44257-.004515 2.164851-.010924l2.168232-.022283c4.338648-.045438 8.686803-.064635 12.979772.508795 2.227588.297243 5.320818.032202 7.084256 1.673642 2.111344 1.966755.986008 5.338808.4996 7.758859-1.358647 6.765574-1.812904 12.914369-1.812904 19.816178 9.02412-1.398692 11.525415-15.866153 14.724172-23.118874 3.624982-8.216283 7.313444-16.440823 10.667192-24.770223 1.648843-4.093692 3.854171-8.671229 3.275427-13.210785-.649644-5.10184-4.335633-10.510831-6.904531-14.862134-4.86244-8.234447-10.389363-16.70834-13.969002-25.595896-2.861567-7.104926-.197036-15.983399 7.871579-18.521521 4.450228-1.400344 9.198073 1.345848 12.094266 4.562675 6.07269 6.74328 9.992815 16.777697 14.401823 24.692609l34.394873 61.925556c2.920926 5.243856 5.848447 10.481933 8.836976 15.687808 1.165732 2.031158 2.352075 5.167068 4.740424 6.0332 2.127008.77118 5.033095-.325315 7.148561-.748886 5.492297-1.099798 10.97635-2.287117 16.488434-3.28288 6.605266-1.193099 16.673928-.969342 21.434964-6.129805-6.963066-2.205375-15.011895-2.074919-22.259386-1.577863-4.352947.298894-9.178287 1.856116-13.178381-.686135-5.953149-3.783239-9.910373-12.522173-13.552668-18.377854-8.980425-14.439388-17.441465-29.095929-26.041008-43.760726l-1.376261-2.335014-2.765943-4.665258c-1.380597-2.334387-2.750786-4.67476-4.079753-7.036188-1.02723-1.826391-2.549937-4.233231-1.078344-6.24705 1.545791-2.114476 4.91472-2.239146 7.956473-2.243117l.603351.000261c1.195428.001526 2.315572.002427 3.222811-.11692 12.27399-1.615019 24.718635-2.952611 37.098976-2.952611-.963749-3.352237-3.719791-7.141255-2.838484-10.73046 1.972017-8.030506 13.526287-10.543033 18.899867-4.780653 3.60767 3.868283 5.704174 9.192229 8.051303 13.859765 3.097352 6.162006 6.624228 12.118418 9.940876 18.16483 5.805578 10.585967 12.146205 20.881297 18.116667 31.375615.49237.865561.999687 1.726685 1.512269 2.587098l.771613 1.290552c2.577138 4.303168 5.164895 8.635123 6.553094 13.461506-20.735854-.9487-36.30176-25.018751-45.343193-41.283704-.721369 2.604176.450959 4.928448 1.388326 7.431066 1.948109 5.197619 4.276275 10.147535 7.20627 14.862134 4.184765 6.732546 8.982075 13.665732 15.313633 18.553722 11.236043 8.673707 26.05255 8.721596 39.572241 7.794364 8.669619-.595311 19.50252-4.542034 28.030338-1.864372 8.513803 2.673532 11.940924 12.063098 6.884745 19.276187-3.787393 5.403211-8.842747 7.443452-15.128962 8.257566 4.445282 9.53571 10.268996 18.385285 14.490036 28.072919 1.758491 4.035895 3.59118 10.22102 7.8048 12.350433 2.805507 1.416857 6.824562.09743 9.85761.034678-3.043765-8.053625-8.742992-14.887729-11.541904-23.118874 8.533589.390544 16.786875 4.843404 24.732651 7.685374 15.630376 5.590144 31.063836 11.701854 46.475333 17.86913l7.112077 2.848685c6.338978 2.538947 12.71588 5.052299 18.961699 7.812528 2.285297 1.009799 5.449427 3.370401 7.975455 1.917215 2.061054-1.186494 3.394144-4.015253 4.665403-5.931643 3.55573-5.361927 6.775921-10.928622 9.965609-16.513481 12.774414-22.36586 22.143967-46.872692 28.402976-71.833646 20.645168-82.323009 2.934117-173.156241-46.677107-241.922507-19.061454-26.420745-43.033164-49.262193-69.46165-68.1783861-66.13923-47.336721-152.911262-66.294198-232.486917-48.7172481zm135.205158 410.5292842c-17.532977 4.570931-35.601827 8.714164-53.58741 11.040088 2.365265 8.052799 8.145286 15.885969 12.376218 23.118874 1.635653 2.796558 3.3859 6.541816 6.618457 7.755557 3.651364 1.370619 8.063669-.853747 11.508927-1.975838-1.595256-4.364513-4.279573-8.292245-6.476657-12.385112-.905215-1.687677-2.305907-3.685809-1.559805-5.68972 1.410585-3.786541 7.266452-3.563609 10.509727-4.221671 8.54678-1.733916 17.004522-3.898008 25.557073-5.611281 3.150939-.631641 7.538512-2.342438 10.705115-1.285575 2.371037.791232 3.800147 2.744743 5.152304 4.781948l.606196.918752c.80912 1.222827 1.637246 2.41754 2.671212 3.351165 3.457625 3.121874 8.628398 3.60159 13.017619 4.453686-2.678546-6.027421-7.130424-11.301001-9.984571-17.339156-1.659561-3.511592-3.023155-8.677834-6.656381-10.707341-5.005064-2.795733-15.341663 2.461334-20.458024 3.795624zm-110.472507-40.151706c-.825246 10.467897-4.036369 18.984725-9.068639 28.072919 5.76683.729896 11.649079.989984 17.312856 2.39363 4.244947 1.051908 8.156828 3.058296 12.366325 4.211763-2.250671-6.157877-6.426367-11.651913-9.661398-17.339156-3.266358-5.740912-6.189758-12.717032-10.949144-17.339156z"
              transform="translate(.9778)"
            />
          </svg>
          <svg
            fill="currentcolor"
            role="img"
            viewBox="0 0 24 24"
            className="size-6"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>React Router</title>
            <path d="M12.118 5.466a2.306 2.306 0 00-.623.08c-.278.067-.702.332-.953.583-.41.423-.49.609-.662 1.469-.08.423.41 1.43.847 1.734.45.317 1.085.502 2.065.608 1.429.16 1.84.636 1.84 2.197 0 1.377-.385 1.747-1.96 1.906-1.707.172-2.58.834-2.765 2.117-.106.781.41 1.76 1.125 2.091 1.627.768 3.15-.198 3.467-2.196.211-1.284.622-1.642 1.998-1.747 1.588-.133 2.409-.675 2.713-1.787.278-1.02-.304-2.157-1.297-2.554-.264-.106-.873-.238-1.35-.291-1.495-.16-1.879-.424-2.038-1.39-.225-1.337-.317-1.562-.794-2.09a2.174 2.174 0 00-1.613-.73zm-4.785 4.36a2.145 2.145 0 00-.497.048c-1.469.318-2.17 2.051-1.35 3.295 1.178 1.774 3.944.953 3.97-1.177.012-1.193-.98-2.143-2.123-2.166zM2.089 14.19a2.22 2.22 0 00-.427.052c-2.158.476-2.237 3.626-.106 4.182.53.145.582.145 1.111.013 1.191-.318 1.866-1.456 1.549-2.607-.278-1.02-1.144-1.664-2.127-1.64zm19.824.008c-.233.002-.477.058-.784.162-1.39.477-1.866 2.092-.98 3.336.557.794 1.96 1.058 2.82.516 1.416-.874 1.363-3.057-.093-3.746-.38-.186-.663-.271-.963-.268z" />
          </svg>
        </div>

        <AgnosticBackground />
      </div>
      <div
        className={cn(
          cardVariants({
            className: 'flex flex-col',
          }),
        )}
      >
        <h3 className={cn(headingVariants({ variant: 'h3', className: 'mb-6' }))}>
          A truly composable framework.
        </h3>
        <p className="mb-8">
          Separated as <span className="text-brand">Content</span> →{' '}
          <span className="text-brand">Core</span> → <span className="text-brand">UI</span>,
          offering the high composability that engineers love — you can use Fumadocs as a library,
          without adapting the entire framework.
        </p>
        <div className="mt-auto flex flex-col gap-2 @container mask-[linear-gradient(to_bottom,white,transparent)]">
          {[
            {
              name: 'fumadocs-mdx',
              description: 'Use MDX in your React framework elegantly.',
            },
            {
              name: 'fumadocs-core',
              description: 'Headless library for building docs + handling content.',
            },
            {
              name: 'fumadocs-ui',
              description: 'UI library for building docs.',
            },
            {
              name: 'fumadocs-openapi',
              description: 'Extend Fumadocs to render OpenAPI docs.',
            },
            {
              name: 'fumadocs-obsidian',
              description: 'Extend Fumadocs to handle Obsidian-style Markdown.',
            },
          ].map((item) => (
            <div
              key={item.name}
              className="flex flex-col text-sm gap-2 p-2 border border-dashed border-brand-secondary @lg:flex-row @lg:items-center last:@max-lg:hidden"
            >
              <p className="font-medium text-nowrap">{item.name}</p>
              <p className="text-xs flex-1 @lg:text-end">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
      <div className={cn(cardVariants())}>
        <h3 className={cn(headingVariants({ variant: 'h3', className: 'mb-6' }))}>
          Adopts your content.
        </h3>
        <p className="mb-4">
          Designed to integrate with any <span className="text-brand">content source</span>,
          Fumadocs works on MDX, Content Collections, and even your own CMS.
        </p>
        <div className="flex flex-row w-fit items-center gap-4 mb-6">
          {[
            {
              href: 'https://github.com/fuma-nama/fumadocs-basehub',
              text: 'BaseHub CMS',
            },
            {
              href: 'https://github.com/fuma-nama/fumadocs-sanity',
              text: 'Sanity',
            },
            {
              href: 'https://github.com/MFarabi619/fumadocs-payloadcms',
              text: 'Payload CMS',
            },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              rel="noreferrer noopener"
              target="_blank"
              className="text-sm text-brand hover:underline"
            >
              {item.text}
            </a>
          ))}
        </div>
        <CodeBlock
          wrapper={{
            title: 'Fumadocs MDX',
          }}
          code={`
import { loader } from 'fumadocs-core/source';
import { docs } from 'fumadocs-mdx:collections/server';

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: '/docs',
});`.trim()}
          lang="ts"
        />
      </div>
      <div className={cn(cardVariants({ className: 'relative overflow-hidden min-h-[400px]' }))}>
        <ContentAdoptionBackground className="absolute inset-0" />
        <div className="absolute top-8 left-4 w-[70%] flex flex-col bg-neutral-50/80 backdrop-blur-lg border text-neutral-800 p-2 rounded-xl shadow-lg shadow-black dark:bg-neutral-900/80 dark:text-neutral-200">
          <p className="px-2 pb-2 font-medium border-b mb-2 text-neutral-500 dark:text-neutral-400">
            My CMS
          </p>
          {['My Page', 'Another Page', 'Components', 'Getting Started'].map((page) => (
            <div
              key={page}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-400/20"
            >
              <FileIcon className="stroke-neutral-500 size-4 dark:stroke-neutral-400" />
              <span className="text-sm">{page}</span>
              <div className="px-3 py-1 font-mono rounded-full bg-brand text-xs text-brand-foreground ms-auto">
                Article
              </div>
            </div>
          ))}
        </div>

        <div className="absolute bottom-8 right-4 w-[70%] flex flex-col bg-neutral-100 text-neutral-800 rounded-xl border shadow-lg shadow-black dark:bg-neutral-900 dark:text-neutral-200">
          <div className="px-4 py-2 text-neutral-500 border-b font-medium dark:text-neutral-400">
            MDX Editor
          </div>
          <pre className="text-base text-neutral-800 overflow-auto p-4 dark:text-neutral-400">
            {`---
title: Hello World
---

# Hello World!

This is my first document.`}
          </pre>
        </div>
      </div>
      <div className={cn(cardVariants(), 'flex flex-col max-md:pb-0')}>
        <h3 className={cn(headingVariants({ variant: 'h3', className: 'mb-6' }))}>
          Enhance your search experience.
        </h3>
        <p className="mb-6">Integrate with Orama Search and Algolia Search in your docs easily.</p>
        <Link
          href="/docs/headless/search/algolia"
          className={cn(buttonVariants({ className: 'w-fit mb-8' }))}
        >
          Learn More
        </Link>
        <Search />
      </div>
      <div className={cn(cardVariants(), 'flex flex-col p-0 overflow-hidden')}>
        <div className="p-6 mb-2">
          <h3 className={cn(headingVariants({ variant: 'h3', className: 'mb-6' }))}>
            The shadcn/ui for docs
          </h3>
          <p className="mb-6">
            Fumadocs CLI creates interactive components for your docs, offering a rich experience to
            your users.
          </p>
          <Link href="/docs/cli" className={cn(buttonVariants({ className: 'w-fit' }))}>
            Commands
          </Link>
        </div>
        <Image src={ShadcnImage} alt="shadcn" className="mt-auto flex-1 w-full object-cover" />
      </div>
    </>
  );
}

const searchItemVariants = cva('rounded-md p-2 text-sm text-fd-popover-foreground');

function Search() {
  return (
    <div className="flex select-none flex-col mt-auto bg-fd-popover rounded-xl border mask-[linear-gradient(to_bottom,white_40%,transparent_90%)] max-md:-mx-4">
      <div className="inline-flex items-center gap-2 px-4 py-3 text-sm text-fd-muted-foreground">
        <SearchIcon className="size-4" />
        Search...
      </div>
      <div className="border-t p-2">
        {[
          ['Getting Started', 'Use Fumadocs in your project.'],
          ['Components', 'The UI Components for your docs.'],
          ['MDX Content', 'Using MDX for content.'],
          ['User Guide', 'How to use Fumadocs.'],
        ].map(([title, description], i) => (
          <div key={i} className={cn(searchItemVariants(), i === 0 && 'bg-fd-accent')}>
            <div className="flex flex-row items-center gap-2">
              <FileTextIcon className="size-4 text-fd-muted-foreground" />
              <p>{title}</p>
              {i === 7 && <p className="ms-auto text-xs text-fd-muted-foreground">Open</p>}
            </div>
            <p className="text-xs mt-2 text-fd-muted-foreground ps-6">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function OpenSource() {
  return (
    <>
      <h2
        className={cn(
          headingVariants({
            variant: 'h2',
            className: 'mt-8 text-brand text-center mb-4 col-span-full',
          }),
        )}
      >
        A Framework of Dream.
      </h2>

      <div className={cn(cardVariants({ className: 'flex flex-col' }))}>
        <Heart fill="currentColor" className="text-pink-500 mb-4" />
        <h3
          className={cn(
            headingVariants({
              variant: 'h3',
              className: 'mb-6',
            }),
          )}
        >
          Made Possible by You.
        </h3>
        <p className="mb-8">Fumadocs is 100% powered by passion and open source community.</p>
        <div className="mb-8 flex flex-row items-center gap-2">
          <Link href="/sponsors" className={cn(buttonVariants({ variant: 'primary' }))}>
            Sponsors
          </Link>
          <a
            href="https://github.com/fuma-nama/fumadocs/graphs/contributors"
            rel="noreferrer noopener"
            className={cn(buttonVariants({ variant: 'secondary' }))}
          >
            Contributors
          </a>
        </div>
        <ContributorCounter repoOwner={owner} repoName={repo} />
      </div>
      <div
        className={cn(
          cardVariants({
            className: 'flex flex-col p-0 pt-8',
          }),
        )}
      >
        <h2 className="text-3xl text-center font-extrabold font-mono uppercase mb-4 lg:text-4xl">
          Build Your Docs
        </h2>
        <p className="text-center font-mono text-xs opacity-50 mb-8">
          light and gorgeous, just like the moon.
        </p>
        <div className="h-[200px] mt-auto overflow-hidden p-8 bg-gradient-to-b from-brand-secondary/10">
          <div className="mx-auto bg-radial-[circle_at_0%_100%] from-60% from-transparent to-brand-secondary size-[500px] rounded-full" />
        </div>
      </div>

      <ul
        className={cn(
          cardVariants({
            className: 'flex flex-col gap-6 col-span-full',
          }),
        )}
      >
        <li>
          <span className="flex flex-row items-center gap-2 font-medium">
            <BatteryChargingIcon className="size-5" />
            Battery guaranteed.
          </span>
          <span className="mt-2 text-sm text-fd-muted-foreground">
            Actively maintained, open for contributions.
          </span>
        </li>
        <li>
          <span className="flex flex-row items-center gap-2 font-medium">
            <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            Fully open-source.
          </span>
          <span className="mt-2 text-sm text-fd-muted-foreground">
            Open source, available on Github.
          </span>
        </li>
        <li>
          <span className="flex flex-row items-center gap-2 font-medium">
            <TimerIcon className="size-5" />
            Within seconds.
          </span>
          <span className="mt-2 text-sm text-fd-muted-foreground">
            Initialize a new project instantly with CLI.
          </span>
        </li>
        <li className="flex flex-row flex-wrap gap-2 mt-auto">
          <Link href="/docs" className={cn(buttonVariants())}>
            Read docs
          </Link>
          <a
            href="https://github.com/fuma-nama/fumadocs"
            rel="noreferrer noopener"
            className={cn(
              buttonVariants({
                variant: 'secondary',
              }),
            )}
          >
            Open GitHub
          </a>
        </li>
      </ul>
    </>
  );
}
