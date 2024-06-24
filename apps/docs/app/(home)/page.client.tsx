'use client';

import Phenomenon from 'phenomenon';
import {
  useEffect,
  useRef,
  type CanvasHTMLAttributes,
  useState,
  Fragment,
  type ReactElement,
  type HTMLAttributes,
  useCallback,
  useMemo,
} from 'react';
import { TerminalIcon } from 'lucide-react';
import Image from 'next/image';
import useSWR from 'swr';
import type { SWRResponse } from 'swr';
import {
  GLSLX_NAME_U_RESOLUTION,
  GLSLX_NAME_U_TIME,
  GLSLX_SOURCE_FRAGMENT_SHADER,
  GLSLX_SOURCE_VERTEX_SHADER,
} from '@/shaders/rain.min.js';
import { cn } from '@/utils/cn';

export function Rain(
  props: CanvasHTMLAttributes<HTMLCanvasElement>,
): React.ReactElement {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    let contextType = 'experimental-webgl';
    if (canvas.getContext('webgl2')) contextType = 'webgl2';
    if (canvas.getContext('webgl')) contextType = 'webgl';

    // Create a renderer
    const phenomenon = new Phenomenon({
      canvas,
      contextType,
      settings: {
        alpha: true,
        position: { x: 0, y: 0, z: 1 },
        shouldRender: true,
      },
    });

    phenomenon.add('', {
      mode: 4,
      vertex: GLSLX_SOURCE_VERTEX_SHADER,
      geometry: {
        vertices: [
          { x: -100, y: 100, z: 0 },
          { x: -100, y: -100, z: 0 },
          { x: 100, y: 100, z: 0 },
          { x: 100, y: -100, z: 0 },
          { x: -100, y: -100, z: 0 },
          { x: 100, y: 100, z: 0 },
        ] as unknown as object[][],
      },
      fragment: GLSLX_SOURCE_FRAGMENT_SHADER,
      uniforms: {
        [GLSLX_NAME_U_RESOLUTION]: {
          type: 'vec2',
          value: [
            canvas.width * window.devicePixelRatio,
            canvas.height * window.devicePixelRatio,
          ],
        },
        [GLSLX_NAME_U_TIME]: {
          type: 'float',
          // @ts-expect-error -- Wrong type definitions
          value: 0.0,
        },
      },
      onRender: ({ uniforms }: { uniforms: Record<string, unknown> }) => {
        const time = uniforms[GLSLX_NAME_U_TIME] as { value: number };
        time.value += 0.01;
      },
    });

    return () => {
      phenomenon.destroy();
    };
  }, []);

  return <canvas width={1000} height={1000} ref={ref} {...props} />;
}

export function Previews(): React.ReactElement {
  return (
    <div className="rounded-xl border bg-background p-4 shadow-lg">
      <p className="text-sm font-medium">I&apos;m satisfied with it</p>

      <a
        href="https://joulev.dev"
        rel="noreferrer noopener"
        className="mt-4 inline-flex items-center text-sm font-medium"
      >
        @joulev
      </a>
      <p className="text-xs text-muted-foreground">Next.js Expert</p>
    </div>
  );
}

export function CreateAppAnimation(): React.ReactElement {
  const installCmd = 'npm create fumadocs-app';
  const tickTime = 100;
  const timeCommandEnter = installCmd.length;
  const timeCommandRun = timeCommandEnter + 3;
  const timeCommandEnd = timeCommandRun + 3;
  const timeWindowOpen = timeCommandEnd + 1;
  const timeEnd = timeWindowOpen + 1;

  const [tick, setTick] = useState(timeEnd);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((prev) => (prev >= timeEnd ? prev : prev + 1));
    }, tickTime);

    return () => {
      clearInterval(timer);
    };
  }, [timeEnd]);

  const lines: ReactElement[] = [];

  lines.push(
    <span key="command_type">
      {installCmd.substring(0, tick)}
      {tick < timeCommandEnter && (
        <div className="inline-block h-3 w-1 animate-pulse bg-white" />
      )}
    </span>,
  );

  if (tick >= timeCommandEnter) {
    lines.push(<span key="space"> </span>);
  }

  if (tick > timeCommandRun)
    lines.push(
      <Fragment key="command_response">
        <span className="font-bold">┌ Create Fumadocs App</span>
        <span>│</span>
        {tick > timeCommandRun + 1 && (
          <>
            <span className="font-bold">◇ Project name</span>
            <span>│ my-app</span>
          </>
        )}
        {tick > timeCommandRun + 2 && (
          <>
            <span>│</span>
            <span className="font-bold">◆ Choose a content source</span>
          </>
        )}
        {tick > timeCommandRun + 3 && (
          <>
            <span>│ ● Fumadocs MDX</span>
            <span>│ ○ Contentlayer</span>
          </>
        )}
      </Fragment>,
    );

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        if (tick >= timeEnd) {
          setTick(0);
        }
      }}
    >
      {tick > timeWindowOpen && (
        <LaunchAppWindow className="absolute bottom-5 right-4 z-10 animate-in fade-in slide-in-from-top-10" />
      )}
      <pre className="overflow-hidden rounded-xl border text-xs">
        <div className="flex flex-row items-center gap-2 border-b px-4 py-2">
          <TerminalIcon className="size-4" />{' '}
          <span className="font-bold">Terminal</span>
          <div className="grow" />
          <div className="size-2 rounded-full bg-red-400" />
        </div>
        <div className="min-h-[200px] bg-gradient-to-b from-secondary [mask-image:linear-gradient(to_bottom,white,transparent)]">
          <code className="grid p-4">{lines}</code>
        </div>
      </pre>
    </div>
  );
}

function LaunchAppWindow(
  props: HTMLAttributes<HTMLDivElement>,
): React.ReactElement {
  return (
    <div
      {...props}
      className={cn(
        'overflow-hidden rounded-md border bg-background shadow-xl',
        props.className,
      )}
    >
      <div className="relative flex h-6 flex-row items-center border-b bg-muted px-4 text-xs text-muted-foreground">
        <p className="absolute inset-x-0 text-center">localhost:3000</p>
      </div>
      <div className="p-4 text-sm">New App launched!</div>
    </div>
  );
}

interface Contributor {
  avatar_url: string;
  login: string;
}

interface ContributorCounterProps {
  repoOwner: string;
  repoName: string;
  displayCount?: number;
  intersectionThreshold?: number;
}

export function ContributorCounter({
  repoOwner,
  repoName,
  displayCount = 4,
  intersectionThreshold = 0.1,
}: ContributorCounterProps): JSX.Element {
  const [count, setCount] = useState(0);
  const [totalContributors, setTotalContributors] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [randomContributors, setRandomContributors] = useState<Contributor[]>(
    [],
  );
  const counterRef = useRef<HTMLDivElement>(null);

  const animateCount = useCallback(() => {
    let start = 0;
    const end = totalContributors;
    const duration = 1500;
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
  }, [totalContributors]);

  useEffect(() => {
    const fetchContributors = async (): Promise<void> => {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/contributors?per_page=100`,
        );
        if (!response.ok) {
          throw new Error('Failed to fetch contributors');
        }
        const contributors = (await response.json()) as Contributor[];
        const filteredContributors = contributors.filter(
          (contributor) => !contributor.login.endsWith('[bot]'),
        );
        setTotalContributors(filteredContributors.length);

        const shuffled = [...filteredContributors].sort(
          () => 0.5 - Math.random(),
        );
        setRandomContributors(shuffled.slice(0, displayCount));

        setIsLoading(false);
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error('Error fetching contributors:', err.message);
        }
        setError('Failed to load contributor data');
        setIsLoading(false);
      }
    };

    fetchContributors().catch((err: unknown) => {
      if (err instanceof Error) {
        console.error('Error fetching contributors:', err.message);
      }
      setError('Failed to load contributor data');
      setIsLoading(false);
    });
  }, [repoOwner, repoName, displayCount]);

  useEffect(() => {
    if (!isLoading && !error) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            animateCount();
            observer.unobserve(entry.target);
          }
        },
        { threshold: intersectionThreshold },
      );

      const currentCounterRef = counterRef.current;
      if (currentCounterRef) {
        observer.observe(currentCounterRef);
      }

      return () => {
        if (currentCounterRef) {
          observer.unobserve(currentCounterRef);
        }
      };
    }
  }, [isLoading, error, animateCount, intersectionThreshold]);

  if (isLoading) {
    return (
      <div>
        <div className="text-[#e0e0e0]">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="text-[#f97583]">{error}</div>
      </div>
    );
  }

  return (
    <div ref={counterRef} className=" ">
      <h2 className="mb-2 text-center text-lg font-semibold">
        Project Contributors
      </h2>
      <div className="flex items-center justify-center">
        <div className="p-6">
          <span className="text-4xl font-bold">{count}</span>
        </div>
      </div>
      <div className="mt-6">
        <div className="flex justify-center space-x-4">
          {randomContributors.map((contributor) => (
            <div key={contributor.login} className="flex flex-col items-center">
              <Image
                src={contributor.avatar_url}
                alt={`${contributor.login}'s avatar`}
                className="rounded-full"
                width={48}
                height={48}
              />
              <span className="mt-2 text-sm text-[#e0e0e0]">
                {contributor.login}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface Contributor {
  avatar_url: string;
  login: string;
}

interface ContributorCounterProps {
  repoOwner: string;
  repoName: string;
  displayCount?: number;
  intersectionThreshold?: number;
}

const fetcher = async (url: string): Promise<Contributor[]> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch contributors');
  }
  return response.json() as Promise<Contributor[]>;
};

export function ContributorCounterSWR({
  repoOwner,
  repoName,
  displayCount = 4,
  intersectionThreshold = 0.1,
}: ContributorCounterProps): JSX.Element {
  const [count, setCount] = useState(0);
  const counterRef = useRef<HTMLDivElement>(null);

  const { data: contributors, error }: SWRResponse<Contributor[], Error> =
    useSWR<Contributor[], Error>(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contributors?per_page=100`,
      fetcher,
    );

  const isLoading = !contributors && !error;

  const { randomContributors, totalContributors } = useMemo(() => {
    if (!contributors) {
      return { randomContributors: [], totalContributors: 0 };
    }

    const filtered = contributors.filter(
      (contributor) => !contributor.login.endsWith('[bot]'),
    );

    const shuffled = [...filtered].sort(() => 0.5 - Math.random());

    return {
      randomContributors: shuffled.slice(0, displayCount),
      totalContributors: filtered.length,
    };
  }, [contributors, displayCount]);

  const animateCount = useCallback(() => {
    let start = 0;
    const end = totalContributors;
    const duration = 1500;
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
  }, [totalContributors]);

  useEffect(() => {
    if (!isLoading && !error) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            animateCount();
            observer.unobserve(entry.target);
          }
        },
        { threshold: intersectionThreshold },
      );

      const currentCounterRef = counterRef.current;
      if (currentCounterRef) {
        observer.observe(currentCounterRef);
      }

      return () => {
        if (currentCounterRef) {
          observer.unobserve(currentCounterRef);
        }
      };
    }
  }, [isLoading, error, animateCount, intersectionThreshold]);

  if (isLoading) {
    return (
      <div>
        <div className="text-[#e0e0e0]">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="text-[#f97583]">Failed to load contributor data</div>
      </div>
    );
  }

  return (
    <div ref={counterRef} className=" ">
      <h2 className="mb-2 text-center text-lg font-semibold">
        Project Contributors
      </h2>
      <div className="flex items-center justify-center">
        <div className="p-6">
          <span className="text-4xl font-bold">{count}</span>
        </div>
      </div>
      <div className="mt-6">
        <div className="flex justify-center space-x-4">
          {randomContributors.map((contributor) => (
            <div key={contributor.login} className="flex flex-col items-center">
              <Image
                src={contributor.avatar_url}
                alt={`${contributor.login}'s avatar`}
                className="rounded-full"
                width={48}
                height={48}
              />
              <span className="mt-2 text-sm text-[#e0e0e0]">
                {contributor.login}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
