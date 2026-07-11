import Image from 'next/image';
import { Marquee } from '@/app/(home)/marquee';
import { ArrowRightIcon } from 'lucide-react';

interface APISponsorItem {
  __typename: 'User' | 'Organization';
  login: string;
  avatarUrl: string;
  websiteUrl: string | null;
  name: string;
  tier: {
    monthlyPriceInDollars: number;
    name?: string;
  };
  tierName?: string;
  isActive: boolean;
  isOneTimePayment: boolean;
}

const visibleTiers = ['Golden Sponsor', 'Platinum Sponsor'];

export async function SponsorsMarquee() {
  const sponsors = await getSponsors();
  const items = sponsors.filter(
    (item) =>
      item.isActive &&
      item.tierName &&
      item.__typename === 'Organization' &&
      visibleTiers.includes(item.tierName),
  );
  if (items.length === 0) return null;

  return (
    <div className="bg-fd-card border rounded-md px-2 py-1.5 max-w-full">
      <a
        href="https://fuma-nama.dev/sponsors"
        className="inline-flex items-center gap-1 text-xs font-medium text-fd-muted-foreground hover:text-fd-accent-foreground"
      >
        Sponsors
        <ArrowRightIcon className="size-3.5" />
      </a>
      <Marquee
        pauseOnHover
        className="px-0 [mask-image:linear-gradient(to_right,transparent,white_10%,white_90%,transparent)]"
      >
        {items.map((item) => (
          <a
            key={item.login}
            href={getSponsorUrl(item)}
            rel="sponsored noreferrer noopener"
            target="_blank"
            className="flex items-center gap-1.5 text-xs whitespace-nowrap text-fd-muted-foreground hover:text-fd-accent-foreground"
          >
            <Image
              src={item.avatarUrl}
              alt={item.name}
              width={20}
              height={20}
              unoptimized
              className="size-5 rounded-full"
            />
            {item.name}
          </a>
        ))}
      </Marquee>
    </div>
  );
}

async function getSponsors(): Promise<APISponsorItem[]> {
  try {
    const res = await fetch('https://fuma-nama.dev/api/sponsors', {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return (await res.json()) as APISponsorItem[];
  } catch {
    return [];
  }
}

function getSponsorUrl(item: APISponsorItem): string {
  if (!item.websiteUrl) return `https://github.com/${item.login}`;
  if (!/^https?:\/\//.test(item.websiteUrl)) return `https://${item.websiteUrl}`;
  return item.websiteUrl;
}
