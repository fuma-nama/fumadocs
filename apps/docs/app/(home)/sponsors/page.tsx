import { Fragment } from 'react';
import Image from 'next/image';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { getSponsors } from '@/lib/get-sponsors';
import { owner } from '@/lib/github';
import { organizationAsUserSponsors } from '@/app/(home)/sponsors/data';

const tiers = [
  {
    name: 'Platinum Sponsor',
    min: 1000,
    color: 'text-purple-600 dark:text-purple-400',
  },
  {
    name: 'Golden Sponsor',
    min: 225,
    color: 'text-yellow-600 dark:text-yellow-400',
  },
  {
    name: 'Sliver Sponsor',
    min: 128,
    color: 'text-fd-muted-foreground',
  },
];

export default async function Page() {
  const result = await getSponsors(owner);

  const sponsors = result.map((v) => {
    const entity = organizationAsUserSponsors.find(
      (entity) => entity.asUser === v.login,
    );
    if (entity) {
      return {
        login: entity.github,
        name: entity.label,
        websiteUrl: entity.url,
        logo: entity.logo,
        __typename: 'Organization',
        tier: v.tier,
        avatarUrl: undefined,
      };
    }

    return {
      logo: undefined,
      ...v,
    };
  });

  return (
    <main className="container flex flex-col items-center py-16 text-center z-[2]">
      <Image
        src="/circuit_2.svg"
        alt="circuit"
        width="1231"
        height="536"
        className="absolute top-16 z-[-1] w-full max-w-[1200px] opacity-0 dark:opacity-20"
      />
      <h1 className="text-4xl font-semibold">Support Fumadocs</h1>
      <p className="mt-4 text-sm">
        Your sponsorship means a lot to open-source projects, including
        Fumadocs.
      </p>
      <a
        href="https://github.com/sponsors/fuma-nama"
        rel="noreferrer noopener"
        target="_blank"
        className={cn(
          buttonVariants({
            className: 'rounded-full mt-6',
          }),
        )}
      >
        Sponsor
      </a>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 600 200"
        className="max-w-[600px]"
      >
        <defs>
          <linearGradient
            id="circuit-1-fill"
            x1="0"
            y1="0"
            x2="0.939104"
            y2="0.786487"
          >
            <stop offset="0%" stopColor="rgb(50,50,60)" />
            <stop offset="100%" stopColor="rgb(30,30,38)" />
          </linearGradient>
          <linearGradient id="circuit-1-energy" x2="0" y2="1">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="60%" stopColor="rgb(200,100,255)" />
          </linearGradient>
          <linearGradient id="circuit-1-x-line" x1="0" y1="0" y2="0" x2="1">
            <stop offset="40%" stopColor="rgb(50,50,60)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          <linearGradient id="circuit-1-x-energy" x1="0" y1="0" y2="0" x2="1">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="60%" stopColor="rgba(140,180,255)" />
          </linearGradient>
        </defs>
        <line
          x1="300"
          y1="0"
          x2="300"
          y2="99"
          fill="none"
          stroke="rgb(50,50,60)"
          strokeWidth="2"
          strokeLinecap="square"
        />
        <rect
          x="299"
          y="0"
          width="2"
          height="20"
          fill="url(#circuit-1-energy)"
          style={{
            animation: 'circuit_1 infinite linear 3s',
          }}
        />
        <rect
          width="120"
          height="85"
          rx="6"
          ry="6"
          x="240"
          y="99"
          fill="url(#circuit-1-fill)"
          stroke="#3f4c59"
          strokeWidth="0.5"
        />
        {new Array(3).fill(null).map((_, i) => (
          <Fragment key={i}>
            <rect
              x="368"
              y={120 + i * 20 + 5 / 4}
              width="232"
              height="2"
              fill="url(#circuit-1-x-line)"
            />
            <rect
              x="368"
              y={120 + i * 20 + 5 / 4}
              width="20"
              height="2"
              fill="url(#circuit-1-x-energy)"
              style={{
                opacity: 0,
                animation: 'circuit_1_x_energy infinite linear 6s',
                animationDelay: `${(Math.pow(2, i) * 360).toString()}ms`,
              }}
            />
            <rect
              x="360"
              y={120 + i * 20}
              width="8"
              height="5"
              fill="rgb(100,100,120)"
            />
          </Fragment>
        ))}

        <circle
          r="4"
          cx="348"
          cy="114"
          fill="rgb(255,140,255)"
          style={{
            filter: 'drop-shadow(2px 0px 8px rgb(255, 100, 255))',
          }}
        />
        <text
          dx="256"
          dy="147.793041"
          fontSize="18"
          fontWeight="400"
          fill="rgba(70,70,86,0.9)"
        >
          Fumadocs
        </text>
      </svg>
      <h2 className="mt-12 font-mono text-xs mb-7">Organization Sponsors</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {sponsors
          .filter((sponsor) => sponsor.__typename === 'Organization')
          .map((sponsor) => {
            const tier = tiers.find(
              (tier) => sponsor.tier.monthlyPriceInDollars >= tier.min,
            );

            return (
              <a
                key={sponsor.name}
                href={getSponsorHref(sponsor.login, sponsor.websiteUrl)}
                rel="noreferrer noopener"
                target="_blank"
                className="flex flex-col items-center"
              >
                <div className="inline-flex h-14 items-center gap-2.5 font-medium text-xl">
                  {sponsor.logo ?? (
                    <>
                      <Image
                        alt="avatar"
                        src={sponsor.avatarUrl}
                        unoptimized
                        width="38"
                        height="38"
                        className="rounded-lg"
                      />
                      <p>{sponsor.name}</p>
                    </>
                  )}
                </div>
                {tier && (
                  <p className={cn('text-xs', tier.color)}>{tier.name}</p>
                )}
              </a>
            );
          })}
      </div>
      <h2 className="mt-12 font-mono text-xs mb-7">Hosting Sponsor</h2>
      <a href="https://vercel.com" rel="noreferrer noopener">
        <svg
          aria-label="Vercel logotype"
          role="img"
          viewBox="0 0 283 64"
          className="w-32"
        >
          <path
            d="M141.68 16.25c-11.04 0-19 7.2-19 18s8.96 18 20 18c6.67 0 12.55-2.64 16.19-7.09l-7.65-4.42c-2.02 2.21-5.09 3.5-8.54 3.5-4.79 0-8.86-2.5-10.37-6.5h28.02c.22-1.12.35-2.28.35-3.5 0-10.79-7.96-17.99-19-17.99zm-9.46 14.5c1.25-3.99 4.67-6.5 9.45-6.5 4.79 0 8.21 2.51 9.45 6.5h-18.9zm117.14-14.5c-11.04 0-19 7.2-19 18s8.96 18 20 18c6.67 0 12.55-2.64 16.19-7.09l-7.65-4.42c-2.02 2.21-5.09 3.5-8.54 3.5-4.79 0-8.86-2.5-10.37-6.5h28.02c.22-1.12.35-2.28.35-3.5 0-10.79-7.96-17.99-19-17.99zm-9.45 14.5c1.25-3.99 4.67-6.5 9.45-6.5 4.79 0 8.21 2.51 9.45 6.5h-18.9zm-39.03 3.5c0 6 3.92 10 10 10 4.12 0 7.21-1.87 8.8-4.92l7.68 4.43c-3.18 5.3-9.14 8.49-16.48 8.49-11.05 0-19-7.2-19-18s7.96-18 19-18c7.34 0 13.29 3.19 16.48 8.49l-7.68 4.43c-1.59-3.05-4.68-4.92-8.8-4.92-6.07 0-10 4-10 10zm82.48-29v46h-9v-46h9zM37.59.25l36.95 64H.64l36.95-64zm92.38 5l-27.71 48-27.71-48h10.39l17.32 30 17.32-30h10.39zm58.91 12v9.69c-1-.29-2.06-.49-3.2-.49-5.81 0-10 4-10 10v14.8h-9v-34h9v9.2c0-5.08 5.91-9.2 13.2-9.2z"
            fill="currentColor"
          ></path>
        </svg>
      </a>
      <h2 className="mt-12 font-mono text-xs">Individual Sponsors</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {sponsors
          .filter((sponsor) => sponsor.__typename === 'User')
          .map((sponsor) => (
            <a
              key={sponsor.name}
              href={getSponsorHref(sponsor.login, sponsor.websiteUrl)}
              rel="noreferrer noopener"
              target="_blank"
              className="inline-flex items-center gap-2 rounded-xl p-3 text-xs transition-colors hover:bg-fd-primary/10"
            >
              <Image
                alt="avatar"
                src={sponsor.avatarUrl!}
                unoptimized
                width="30"
                height="30"
                className="rounded-lg"
              />
              {sponsor.name}
            </a>
          ))}
      </div>
    </main>
  );
}

function getSponsorHref(login: string, url?: string): string {
  if (url) return url.startsWith('http') ? url : `https://${url}`;

  return `https://github.com/${login}`;
}
