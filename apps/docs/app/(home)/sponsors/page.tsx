import { Fragment } from 'react';
import Image from 'next/image';
import {
  organizationUsers,
  organizationSponsors,
  sponsorData,
  sponsorTiers,
} from '@/app/(home)/sponsors/data';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { getSponsors } from '@/lib/get-sponsors';

export default async function Page() {
  const sponsors = await getSponsors('fuma-nama', [
    ...organizationUsers,
    ...organizationSponsors.map((sponsor) => sponsor.github),
  ]);

  return (
    <main className="container flex flex-col items-center py-16 text-center">
      <div
        className="absolute inset-0 z-[-1]"
        style={{
          backgroundImage:
            'conic-gradient(at 50% 196px, transparent 20%, rgba(200,100,255,0.2) 40%, transparent, rgba(100,140,255,0.3) 60%, transparent 80%)',
          maskImage:
            'radial-gradient(circle at 50% 196px, transparent 80px, white 100px, transparent 80%)',
        }}
      />
      <Image
        src="/circuit_2.svg"
        alt="circuit"
        width="1231"
        height="536"
        className="absolute top-16 z-[-1] w-full max-w-[1200px] opacity-10 dark:opacity-30"
      />
      <svg
        viewBox="0 0 100 100"
        className="absolute top-24 z-[-1] max-w-[200px]"
        style={{
          maskImage: 'linear-gradient(to bottom,transparent 80%,white 100%)',
        }}
      >
        <circle
          r="49"
          cx="50"
          cy="50"
          stroke="url(#circle)"
          fill="none"
          strokeWidth="1"
        />
        <defs>
          <linearGradient id="circle" y2="1">
            <stop stopColor="rgb(100,140,255)" />
            <stop offset="100%" stopColor="rgb(255,100,255)" />
          </linearGradient>
        </defs>
      </svg>
      <h1 className="bg-gradient-to-b from-fd-foreground from-50% to-fd-muted bg-clip-text text-4xl font-bold text-transparent">
        Support Fumadocs
      </h1>
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
            variant: 'outline',
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
      <h2 className="mt-12 font-mono text-xs">Organization Sponsors</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {[
          ...organizationSponsors,
          ...sponsors
            .filter((sponsor) => sponsor.__typename === 'Organization')
            .map((sponsor) => ({
              label: sponsor.name,
              logo: (
                <>
                  <Image
                    alt="avatar"
                    src={sponsor.avatarUrl}
                    unoptimized
                    width="30"
                    height="30"
                    className="rounded-lg"
                  />
                  {sponsor.name}
                </>
              ),
              url: getSponsorHref(sponsor.login, sponsor.websiteUrl),
              tier: sponsorData[sponsor.login] ?? '',
            })),
        ]
          .sort((a, b) => {
            const idx1 = sponsorTiers.findIndex((tier) => tier.type === a.tier);
            const idx2 = sponsorTiers.findIndex((tier) => tier.type === b.tier);

            return (
              (idx1 === -1 ? sponsorTiers.length : idx1) -
              (idx2 === -1 ? sponsorTiers.length : idx2)
            );
          })
          .map((sponsor) => {
            const tier = sponsorTiers.find(
              (tier) => tier.type === sponsor.tier,
            );

            return (
              <a
                key={sponsor.label}
                href={sponsor.url}
                rel="noreferrer noopener"
                target="_blank"
                className="group flex flex-col items-center justify-center rounded-xl p-3 transition-colors hover:bg-fd-primary/10"
              >
                <div className="inline-flex h-12 items-center gap-2 text-lg grayscale transition-all group-hover:grayscale-0">
                  {sponsor.logo}
                </div>
                {tier ? (
                  <p className="text-xs text-fd-muted-foreground">
                    {tier.label}
                  </p>
                ) : null}
              </a>
            );
          })}
      </div>

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
                src={sponsor.avatarUrl}
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
