import type { StaticImageData } from 'next/image';
import Expostarter from '@/public/showcases/expostarter.png';
import Sunar from '@/public/showcases/sunar.png';
import OpenPanel from '@/public/showcases/openpanel.png';
import Supastarter from '@/public/showcases/supastarter.png';
import BetterAuth from '@/public/showcases/better-auth.png';
import ArkType from '@/public/showcases/arktype.png';
import AssistantUI from '@/public/showcases/assistant-ui.png';
import VisionUI from '@/public/showcases/vision-ui.png';
import MixSpace from '@/public/showcases/mix-space.png';
import TurboStarter from '@/public/showcases/turbostarter.png';
import HexaasBlog from '@/public/showcases/hexaas-blog.png';

export interface ShowcaseObject {
  image?: StaticImageData | string;
  name: string;
  url: string;
}

export const showcases: ShowcaseObject[] = [
  {
    image: '/showcases/shadcn.png',
    name: 'shadcn/ui',
    url: 'https://ui.shadcn.com',
  },
  {
    image: BetterAuth,
    name: 'Better Auth',
    url: 'https://better-auth.com',
  },
  {
    image: '/showcases/c15t.png',
    name: 'c15t',
    url: 'https://c15t.com',
  },
  {
    image: '/showcases/better-t-stack.jpeg',
    name: 'Better-T-Stack',
    url: 'https://better-t-stack.dev',
  },
  {
    image: '/showcases/zod.png',
    name: 'Zod',
    url: 'https://zod.dev',
  },
  {
    image: '/showcases/prisma.png',
    name: 'Prisma',
    url: 'https://prisma.io',
  },
  { image: '/showcases/nuqs.jpg', name: 'nuqs', url: 'https://nuqs.47ng.com' },
  {
    image: '/showcases/dokploy.png',
    name: 'Dokploy',
    url: 'https://dokploy.com',
  },
  {
    image: '/showcases/ultracite.jpg',
    name: 'Ultracite',
    url: 'https://ultracite.ai',
  },
  {
    image: '/showcases/sim.png',
    name: 'Sim',
    url: 'https://sim.ai',
  },
  {
    image: '/showcases/agentskit.png',
    name: 'AgentsKit',
    url: 'https://www.agentskit.io',
  },
  {
    image: '/showcases/generative-a11y.png',
    name: 'generative-a11y',
    url: 'https://generativea11y.com',
  },
  {
    image: '/showcases/openpost.png',
    name: 'OpenPost',
    url: 'https://docs.openpo.st',
  },
  {
    image: '/showcases/turbobulls.png',
    name: 'Turbobulls',
    url: 'https://www.turbobulls.com/help',
  },
  {
    image: '/showcases/comfydeploy.png',
    name: 'ComfyDeploy',
    url: 'https://comfydeploy.com',
  },
  {
    image: '/showcases/conductor.png',
    name: 'Conductor',
    url: 'https://conductor.build/docs',
  },
  {
    image: '/showcases/cossistant.png',
    name: 'Cossistant',
    url: 'https://cossistant.com',
  },
  {
    image: '/showcases/llm-gateway.png',
    name: 'LLM Gateway',
    url: 'https://llmgateway.io',
  },
  {
    image: '/showcases/nativewind.png',
    name: 'Nativewind',
    url: 'https://www.nativewind.dev',
  },
  {
    image: ArkType,
    name: 'ArkType',
    url: 'https://arktype.io',
  },
  {
    image: '/showcases/zen-browser.png',
    name: 'Zen Browser',
    url: 'https://docs.zen-browser.app',
  },
  {
    image: '/showcases/hero-ui.png',
    name: 'HeroUI',
    url: 'https://v3.heroui.com',
  },
  {
    image: '/showcases/documenso.png',
    name: 'Documenso',
    url: 'https://docs.documenso.com',
  },
  {
    image: '/showcases/mrscraper.png',
    name: 'MrScraper',
    url: 'https://docs.mrscraper.com',
  },
  {
    image: '/showcases/hiro.png',
    name: 'Hiro',
    url: 'https://docs.hiro.so/stacks',
  },
  {
    image: '/showcases/next-faq.png',
    name: 'Next.js Discord Common Questions',
    url: 'https://nextjs-faq.com',
  },
  {
    image: OpenPanel,
    name: 'OpenPanel',
    url: 'https://openpanel.dev',
  },
  {
    image: '/showcases/animate-ui.png',
    name: 'Animate UI',
    url: 'https://animate-ui.com',
  },
  {
    image: '/showcases/sora-ui.png',
    name: 'Sora UI',
    url: 'https://ui.soralabs.studio',
  },
  {
    image: '/showcases/kibo-ui.jpg',
    name: 'Kibo UI',
    url: 'https://kibo-ui.com',
  },
  {
    image: '/showcases/hexta-ui.png',
    name: 'HextaUI',
    url: 'https://hextaui.com',
  },
  {
    image: MixSpace,
    name: 'MixSpace',
    url: 'https://mx-space.js.org',
  },
  {
    image: '/showcases/libra.png',
    name: 'Libra',
    url: 'https://libra.dev',
  },
  {
    image: Sunar,
    name: 'Sunar',
    url: 'https://sunar.js.org',
  },
  {
    image: '/showcases/freestyle.png',
    name: 'Freestyle',
    url: 'https://freestyle.sh',
  },
  {
    image: '/showcases/zap-studio.png',
    name: 'Zap Studio',
    url: 'https://zapstudio.dev',
  },
  {
    image: VisionUI,
    name: 'Vision UI',
    url: 'https://vision.uing.dev',
  },
  {
    image: '/showcases/yamlresume.png',
    name: 'YAMLResume',
    url: 'https://yamlresume.dev',
  },
  {
    image: '/showcases/kaneo.png',
    name: 'Kaneo',
    url: 'https://kaneo.app',
  },
  {
    image: '/showcases/axionjs.jpg',
    name: 'axion/js',
    url: 'https://axionjs.com',
  },

  {
    image: '/showcases/codehike.png',
    name: 'Code Hike',
    url: 'https://codehike.org',
  },
  {
    image: AssistantUI,
    name: 'assistant-ui',
    url: 'https://assistant-ui.com',
  },
  {
    image: '/showcases/constatic.png',
    name: 'Constatic',
    url: 'https://constatic-docs.vercel.app',
  },
  {
    image: Supastarter,
    name: 'supastarter',
    url: 'https://supastarter.dev',
  },
  {
    image: Expostarter,
    name: 'ExpoStarter',
    url: 'https://expostarter.com/docs',
  },
  {
    image: '/showcases/nxjs.png',
    name: 'nx.js',
    url: 'https://nxjs.n8.io',
  },
  {
    image: TurboStarter,
    name: 'TurboStarter',
    url: 'https://turbostarter.dev',
  },
  {
    name: 'ModelFetch',
    url: 'https://modelfetch.com',
    image: '/showcases/modelfetch.png',
  },
  {
    image: '/showcases/fashnai.png',
    name: 'FASHN AI',
    url: 'https://fashn.ai',
  },
  {
    name: 'Dirstarter',
    url: 'https://dirstarter.com',
  },
  {
    name: 'Rehooks',
    url: 'https://rehooks.pyr33x.ir',
  },
  {
    name: 'Swellchain',
    url: 'https://build.swellnetwork.io',
  },
  {
    name: 'ESLint React',
    url: 'https://eslint-react.xyz',
  },
  {
    name: 'LlamaIndex',
    url: 'https://ts.llamaindex.ai',
  },
  {
    name: 'Clojure Stack Lite',
    url: 'https://stack.bogoyavlensky.com',
  },
  {
    name: 'BProgress',
    url: 'https://bprogress.vercel.app',
  },
  {
    name: 'nextjs i18n docs',
    url: 'https://nextjs.im',
  },
  {
    name: 'Yeecord',
    url: 'https://yeecord.com',
  },
  {
    image: '/showcases/arkenv.png',
    name: 'ArkEnv',
    url: 'https://arkenv.js.org',
  },
];

export const blogs: ShowcaseObject[] = [
  {
    name: "RUNFUNRUN's Blog",
    url: 'https://runfunrun.dev',
  },
  {
    name: 'xlog.systems',
    url: 'https://www.xlog.systems',
  },
  {
    name: 'stutuer',
    url: 'https://www.stutuer.tech',
  },
  {
    image: HexaasBlog,
    name: "hexaa's blog",
    url: 'https://hexaa.sh/blog',
  },
];

/** open source SDKs of Vercel */
export const vercel = [
  {
    name: 'Turbo',
    url: 'https://turbo.build',
  },
  {
    name: 'Flags SDK',
    url: 'https://flags-sdk.dev',
  },
  {
    name: 'Chat SDK',
    url: 'https://chat-sdk.dev',
  },
];
