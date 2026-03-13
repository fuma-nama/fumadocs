import { Fragment } from 'react';
import Image from 'next/image';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { getSponsors } from '@/lib/get-sponsors';
import { owner } from '@/lib/github';
import { organizationAsUserSponsors } from '@/app/(home)/sponsors/data';
import { HeartIcon } from 'lucide-react';

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
    name: 'Silver Sponsor',
    min: 128,
    color: 'text-fd-muted-foreground',
  },
];

export const revalidate = 3600;

export default async function Page() {
  const result = await getSponsors(owner);

  const sponsors = result.map((v) => {
    const entity = organizationAsUserSponsors.find((entity) => entity.asUser === v.login);
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
    <main className="w-full max-w-page mx-auto flex flex-col items-center px-4 py-16 text-center z-2">
      <Image
        src="/circuit_2.svg"
        alt="circuit"
        width="1231"
        height="536"
        className="absolute top-16 z-[-1] w-full max-w-[1200px] opacity-0 dark:opacity-20"
      />
      <h1 className="text-4xl font-semibold">Support Fumadocs</h1>
      <p className="mt-4 text-sm">
        Support the development work of Fumadocs. Fumadocs is fully open source, your sponsorship
        means a lot.
      </p>
      <a
        href="https://github.com/sponsors/fuma-nama"
        rel="noreferrer noopener"
        target="_blank"
        className={cn(
          buttonVariants({
            className: 'group rounded-full mt-6',
          }),
        )}
      >
        Sponsor
        <span className="w-0 transition-[width] overflow-hidden group-hover:w-6">
          <HeartIcon className="text-pink-200 ms-auto fill-current size-4 dark:text-red-400" />
        </span>
      </a>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 200" className="max-w-[600px]">
        <defs>
          <linearGradient id="circuit-1-fill" x1="0" y1="0" x2="0.939104" y2="0.786487">
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
            <rect x="360" y={120 + i * 20} width="8" height="5" fill="rgb(100,100,120)" />
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
        <text dx="256" dy="147.793041" fontSize="18" fontWeight="400" fill="rgba(70,70,86,0.9)">
          Fumadocs
        </text>
      </svg>
      <h2 className="mt-12 font-mono text-xs mb-7">Organization Sponsors</h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {sponsors
          .filter((sponsor) => sponsor.__typename === 'Organization')
          .map((sponsor) => {
            const tier = tiers.find((tier) => sponsor.tier.monthlyPriceInDollars >= tier.min);

            return (
              <a
                key={sponsor.name}
                href={getSponsorHref(sponsor.login, sponsor.websiteUrl)}
                rel="noreferrer noopener"
                target="_blank"
                className="flex flex-col items-start"
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
                {tier && <p className={cn('text-xs', tier.color)}>{tier.name}</p>}
              </a>
            );
          })}
      </div>
      <h2 className="mt-12 font-mono text-xs mb-7">Open Source Program</h2>
      <div className="flex flex-row gap-4 items-center">
        <a href="https://vercel.com" rel="noreferrer noopener">
          <svg aria-label="Vercel logotype" role="img" viewBox="0 0 283 64" className="w-32 h-auto">
            <path
              d="M141.68 16.25c-11.04 0-19 7.2-19 18s8.96 18 20 18c6.67 0 12.55-2.64 16.19-7.09l-7.65-4.42c-2.02 2.21-5.09 3.5-8.54 3.5-4.79 0-8.86-2.5-10.37-6.5h28.02c.22-1.12.35-2.28.35-3.5 0-10.79-7.96-17.99-19-17.99zm-9.46 14.5c1.25-3.99 4.67-6.5 9.45-6.5 4.79 0 8.21 2.51 9.45 6.5h-18.9zm117.14-14.5c-11.04 0-19 7.2-19 18s8.96 18 20 18c6.67 0 12.55-2.64 16.19-7.09l-7.65-4.42c-2.02 2.21-5.09 3.5-8.54 3.5-4.79 0-8.86-2.5-10.37-6.5h28.02c.22-1.12.35-2.28.35-3.5 0-10.79-7.96-17.99-19-17.99zm-9.45 14.5c1.25-3.99 4.67-6.5 9.45-6.5 4.79 0 8.21 2.51 9.45 6.5h-18.9zm-39.03 3.5c0 6 3.92 10 10 10 4.12 0 7.21-1.87 8.8-4.92l7.68 4.43c-3.18 5.3-9.14 8.49-16.48 8.49-11.05 0-19-7.2-19-18s7.96-18 19-18c7.34 0 13.29 3.19 16.48 8.49l-7.68 4.43c-1.59-3.05-4.68-4.92-8.8-4.92-6.07 0-10 4-10 10zm82.48-29v46h-9v-46h9zM37.59.25l36.95 64H.64l36.95-64zm92.38 5l-27.71 48-27.71-48h10.39l17.32 30 17.32-30h10.39zm58.91 12v9.69c-1-.29-2.06-.49-3.2-.49-5.81 0-10 4-10 10v14.8h-9v-34h9v9.2c0-5.08 5.91-9.2 13.2-9.2z"
              fill="currentColor"
            />
          </svg>
        </a>
        <a href="https://openai.com" rel="noreferrer noopener">
          <svg
            width="1604"
            height="718"
            viewBox="0 0 1604 718"
            className="w-32 h-auto"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#clip0_1637_2932)">
              <path
                d="M358.8 239.3C293.02 239.3 239.2 293.12 239.2 358.9C239.2 424.68 293.02 478.5 358.8 478.5C424.58 478.5 478.4 425.012 478.4 358.9C478.4 292.787 424.912 239.3 358.8 239.3ZM358.8 435.643C317.937 435.643 285.046 402.089 285.046 358.9C285.046 315.711 317.937 282.156 358.8 282.156C399.663 282.156 432.553 315.711 432.553 358.9C432.553 402.089 399.663 435.643 358.8 435.643Z"
                fill="currentColor"
              />
              <path
                d="M599.326 305.744C577.732 305.744 556.802 314.382 545.838 329V309.066H502.649V541.622H545.838V457.57C556.802 471.191 577.067 478.5 599.326 478.5C645.837 478.5 682.382 441.955 682.382 392.122C682.382 342.289 645.837 305.744 599.326 305.744ZM592.017 440.959C567.433 440.959 545.506 421.69 545.506 392.122C545.506 362.554 567.433 343.285 592.017 343.285C616.602 343.285 638.528 362.554 638.528 392.122C638.528 421.69 616.602 440.959 592.017 440.959Z"
                fill="currentColor"
              />
              <path
                d="M784.046 305.744C736.871 305.744 699.662 342.621 699.662 392.122C699.662 441.623 732.22 478.5 785.375 478.5C828.896 478.5 856.803 452.254 865.441 422.686H823.249C817.933 434.979 802.983 443.616 785.043 443.616C762.784 443.616 745.841 428.002 741.854 405.743H867.434V388.8C867.434 343.617 835.873 305.744 784.046 305.744ZM742.186 375.179C746.838 354.249 764.113 340.627 785.043 340.627C807.302 340.627 824.245 355.245 826.239 375.179H742.186Z"
                fill="currentColor"
              />
              <path
                d="M982.38 305.744C963.111 305.744 942.845 314.382 933.543 328.667V309.066H890.354V475.177H933.543V385.81C933.543 359.896 947.496 342.953 970.087 342.953C991.017 342.953 1002.31 358.9 1002.31 381.159V475.177H1045.5V374.182C1045.5 332.986 1020.25 305.744 982.38 305.744Z"
                fill="currentColor"
              />
              <path
                d="M1156.12 242.628L1062.1 475.184H1108.28L1128.21 424.354H1235.19L1255.12 475.184H1301.96L1208.61 242.628H1156.12ZM1143.16 385.816L1181.7 288.475L1219.9 385.816H1143.16Z"
                fill="currentColor"
              />
              <path d="M1363.42 242.628H1319.57V475.184H1363.42V242.628Z" fill="currentColor" />
            </g>
            <defs>
              <clipPath id="clip0_1637_2932">
                <rect
                  width="1603.2"
                  height="717.6"
                  fill="white"
                  transform="translate(0 0.0999756)"
                />
              </clipPath>
            </defs>
          </svg>
        </a>
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
