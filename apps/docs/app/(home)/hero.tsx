'use client';
import Image from 'next/image';
import { Dithering, GrainGradient } from '@paper-design/shaders-react';
import HeroImage from './hero-preview.jpeg';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

export function Hero() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [imageReady, setImageReady] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {mounted && (
        <GrainGradient
          className="absolute inset-0 animate-fd-fade-in duration-1000"
          colors={
            resolvedTheme === 'dark'
              ? ['#39BE1C', '#9c2f05', '#7A2A0000']
              : ['#81ff66', '#fc7744', '#fc7744', '#7A2A0020']
          }
          colorBack="#00000000"
          softness={1}
          intensity={0.9}
          noise={0.5}
          shape="corners"
          speed={1}
        />
      )}
      {mounted && (
        <Dithering
          width={720}
          height={720}
          colorBack="#00000000"
          colorFront="#DF3F00"
          shape="sphere"
          type="4x4"
          scale={0.5}
          size={3}
          speed={0.5}
          rotation={270}
          className="absolute max-lg:bottom-[-50%] max-lg:left-[-200px] animate-fd-fade-in duration-800 lg:top-[-5%] lg:right-0"
        />
      )}
      <Image
        src={HeroImage}
        alt="hero-image"
        className={cn(
          'absolute top-[460px] left-[20%] max-w-[1200px] rounded-xl border-2 lg:top-[400px]',
          imageReady ? 'animate-in fade-in duration-400' : 'invisible',
        )}
        onLoad={() => setImageReady(true)}
        priority
      />
    </>
  );
}
