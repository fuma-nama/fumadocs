import { CodeBlock, TypingCodeBlock } from '@/components/typing-code-block'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import { cva } from 'class-variance-authority'
import {
  CircleIcon,
  LayoutIcon,
  PaperclipIcon,
  PersonStandingIcon,
  RocketIcon,
  SearchIcon,
  StarIcon,
  StarsIcon,
  TimerIcon
} from 'lucide-react'
import type { HTMLAttributes, SVGProps } from 'react'
import { Rain } from './page.client'

const badgeVariants = cva(
  'mb-2 w-7 h-7 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground font-medium'
)

const code = `const frontmatterSchema = defaultValidators.frontmatter.extend({
  preview: z.string().optional()
})`

function VercelLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-label="Vercel logotype"
      height="64"
      role="img"
      viewBox="0 0 283 64"
      width="283"
      {...props}
    >
      <path
        d="M141.68 16.25c-11.04 0-19 7.2-19 18s8.96 18 20 18c6.67 0 12.55-2.64 16.19-7.09l-7.65-4.42c-2.02 2.21-5.09 3.5-8.54 3.5-4.79 0-8.86-2.5-10.37-6.5h28.02c.22-1.12.35-2.28.35-3.5 0-10.79-7.96-17.99-19-17.99zm-9.46 14.5c1.25-3.99 4.67-6.5 9.45-6.5 4.79 0 8.21 2.51 9.45 6.5h-18.9zm117.14-14.5c-11.04 0-19 7.2-19 18s8.96 18 20 18c6.67 0 12.55-2.64 16.19-7.09l-7.65-4.42c-2.02 2.21-5.09 3.5-8.54 3.5-4.79 0-8.86-2.5-10.37-6.5h28.02c.22-1.12.35-2.28.35-3.5 0-10.79-7.96-17.99-19-17.99zm-9.45 14.5c1.25-3.99 4.67-6.5 9.45-6.5 4.79 0 8.21 2.51 9.45 6.5h-18.9zm-39.03 3.5c0 6 3.92 10 10 10 4.12 0 7.21-1.87 8.8-4.92l7.68 4.43c-3.18 5.3-9.14 8.49-16.48 8.49-11.05 0-19-7.2-19-18s7.96-18 19-18c7.34 0 13.29 3.19 16.48 8.49l-7.68 4.43c-1.59-3.05-4.68-4.92-8.8-4.92-6.07 0-10 4-10 10zm82.48-29v46h-9v-46h9zM37.59.25l36.95 64H.64l36.95-64zm92.38 5l-27.71 48-27.71-48h10.39l17.32 30 17.32-30h10.39zm58.91 12v9.69c-1-.29-2.06-.49-3.2-.49-5.81 0-10 4-10 10v14.8h-9v-34h9v9.2c0-5.08 5.91-9.2 13.2-9.2z"
        fill="currentColor"
      />
    </svg>
  )
}

function NetlifyLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-label="Netlify"
      width="512"
      height="209"
      viewBox="0 0 512 209"
      {...props}
    >
      <g>
        <path
          d="M117.436 207.036V154.604L118.529 153.51H129.452L130.545 154.604V207.036L129.452 208.13H118.529L117.436 207.036Z"
          fill="currentColor"
        />
        <path
          d="M117.436 53.5225V1.09339L118.529 0H129.452L130.545 1.09339V53.5225L129.452 54.6159H118.529L117.436 53.5225Z"
          fill="currentColor"
        />
        <path
          d="M69.9539 169.238H68.4094L60.6869 161.512V159.967L78.7201 141.938L86.8976 141.942L87.9948 143.031V151.209L69.9539 169.238Z"
          fill="currentColor"
        />
        <path
          d="M69.9462 38.8917H68.4017L60.6792 46.6181V48.1626L78.7124 66.192L86.8899 66.1882L87.9871 65.0986V56.9212L69.9462 38.8917Z"
          fill="currentColor"
        />
        <path
          d="M1.09339 97.5104H75.3711L76.4645 98.6038V109.526L75.3711 110.62H1.09339L0 109.526V98.6038L1.09339 97.5104Z"
          fill="currentColor"
        />
        <path
          d="M440.999 97.5104H510.91L512.004 98.6038V109.526L510.91 110.62H436.633L435.539 109.526L439.905 98.6038L440.999 97.5104Z"
          fill="currentColor"
        />
        <path
          d="M212.056 108.727L210.963 109.821H177.079L175.986 110.914C175.986 113.101 178.173 119.657 186.916 119.657C190.196 119.657 193.472 118.564 194.566 116.377L195.659 115.284H208.776L209.869 116.377C208.776 122.934 203.313 132.774 186.916 132.774C168.336 132.774 159.589 119.657 159.589 104.357C159.589 89.0576 168.332 75.9408 185.822 75.9408C203.313 75.9408 212.056 89.0576 212.056 104.357V108.731V108.727ZM195.659 97.7971C195.659 96.7037 194.566 89.0538 185.822 89.0538C177.079 89.0538 175.986 96.7037 175.986 97.7971L177.079 98.8905H194.566L195.659 97.7971Z"
          fill="currentColor"
        />
        <path
          d="M242.66 115.284C242.66 117.47 243.753 118.564 245.94 118.564H255.776L256.87 119.657V130.587L255.776 131.681H245.94C236.103 131.681 227.36 127.307 227.36 115.284V91.2368L226.266 90.1434H218.617L217.523 89.05V78.1199L218.617 77.0265H226.266L227.36 75.9332V66.0965L228.453 65.0031H241.57L242.663 66.0965V75.9332L243.757 77.0265H255.78L256.874 78.1199V89.05L255.78 90.1434H243.757L242.663 91.2368V115.284H242.66Z"
          fill="currentColor"
        />
        <path
          d="M283.1 131.681H269.983L268.889 130.587V56.2636L269.983 55.1702H283.1L284.193 56.2636V130.587L283.1 131.681Z"
          fill="currentColor"
        />
        <path
          d="M312.61 68.2871H299.493L298.399 67.1937V56.2636L299.493 55.1702H312.61L313.703 56.2636V67.1937L312.61 68.2871ZM312.61 131.681H299.493L298.399 130.587V78.1237L299.493 77.0304H312.61L313.703 78.1237V130.587L312.61 131.681Z"
          fill="currentColor"
        />
        <path
          d="M363.98 56.2636V67.1937L362.886 68.2871H353.05C350.863 68.2871 349.769 69.3805 349.769 71.5672V75.9408L350.863 77.0342H361.793L362.886 78.1276V89.0576L361.793 90.151H350.863L349.769 91.2444V130.591L348.676 131.684H335.559L334.466 130.591V91.2444L333.372 90.151H325.723L324.629 89.0576V78.1276L325.723 77.0342H333.372L334.466 75.9408V71.5672C334.466 59.5438 343.209 55.1702 353.046 55.1702H362.882L363.976 56.2636H363.98Z"
          fill="currentColor"
        />
        <path
          d="M404.42 132.774C400.046 143.704 395.677 150.261 380.373 150.261H374.906L373.813 149.167V138.237L374.906 137.144H380.373C385.836 137.144 386.929 136.05 388.023 132.77V131.677L370.536 89.05V78.1199L371.63 77.0265H381.466L382.56 78.1199L395.677 115.284H396.77L409.887 78.1199L410.98 77.0265H420.817L421.91 78.1199V89.05L404.424 132.77L404.42 132.774Z"
          fill="currentColor"
        />
        <path
          d="M135.454 131.681L134.361 130.587L134.368 98.9172C134.368 93.4541 132.22 89.2182 125.625 89.0806C122.234 88.9926 118.354 89.0729 114.209 89.2488L113.59 89.8834L113.598 130.587L112.504 131.681H99.3913L98.2979 130.587V77.5388L99.3913 76.4454L128.901 76.1778C143.685 76.1778 149.668 86.3356 149.668 97.8009V130.587L148.575 131.681H135.454Z"
          fill="currentColor"
        />
      </g>
    </svg>
  )
}

function Earth(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="900" height="900" viewBox="0 0 900 900" fill="none" {...props}>
      <circle cx="450" cy="450" r="450" fill="url(#paint0_linear_26_28)" />
      <g opacity={0.3}>
        <path
          d="M449.5 450C449.5 572.589 441.666 683.562 429.004 763.878C422.672 804.039 415.136 836.512 406.779 858.934C402.599 870.147 398.224 878.817 393.711 884.674C389.191 890.541 384.602 893.5 380 893.5C375.398 893.5 370.809 890.541 366.289 884.674C361.776 878.817 357.401 870.147 353.221 858.934C344.864 836.512 337.328 804.039 330.996 763.878C318.334 683.562 310.5 572.589 310.5 450C310.5 327.411 318.334 216.438 330.996 136.122C337.328 95.9608 344.864 63.4878 353.221 41.0664C357.401 29.8528 361.776 21.183 366.289 15.3257C370.809 9.45855 375.398 6.5 380 6.5C384.602 6.5 389.191 9.45855 393.711 15.3257C398.224 21.183 402.599 29.8528 406.779 41.0664C415.136 63.4878 422.672 95.9608 429.004 136.122C441.666 216.438 449.5 327.411 449.5 450Z"
          stroke="currentColor"
        />
        <path
          d="M449.5 450C449.5 567.875 433.834 674.57 408.52 751.779C395.862 790.386 380.8 821.593 364.099 843.138C347.393 864.689 329.107 876.5 310 876.5C290.893 876.5 272.607 864.689 255.901 843.138C239.2 821.593 224.138 790.386 211.48 751.779C186.166 674.57 170.5 567.875 170.5 450C170.5 332.125 186.166 225.43 211.48 148.221C224.138 109.614 239.2 78.4069 255.901 56.8621C272.607 35.3107 290.893 23.5 310 23.5C329.107 23.5 347.393 35.3107 364.099 56.8621C380.8 78.4069 395.862 109.614 408.52 148.221C433.834 225.43 449.5 332.125 449.5 450Z"
          stroke="currentColor"
        />
        <path
          d="M449.5 449.5C449.5 554.228 426.009 649.016 388.055 717.605C350.091 786.211 297.725 828.5 240 828.5C182.275 828.5 129.909 786.211 91.9451 717.605C53.9908 649.016 30.5 554.228 30.5 449.5C30.5 344.772 53.9908 249.984 91.9451 181.395C129.909 112.789 182.275 70.5 240 70.5C297.725 70.5 350.091 112.789 388.055 181.395C426.009 249.984 449.5 344.772 449.5 449.5Z"
          stroke="currentColor"
        />
        <path
          d="M450.5 450C450.5 572.589 458.334 683.562 470.996 763.878C477.328 804.039 484.864 836.512 493.221 858.934C497.401 870.147 501.776 878.817 506.289 884.674C510.809 890.541 515.398 893.5 520 893.5C524.602 893.5 529.191 890.541 533.711 884.674C538.224 878.817 542.599 870.147 546.779 858.934C555.136 836.512 562.672 804.039 569.004 763.878C581.666 683.562 589.5 572.589 589.5 450C589.5 327.411 581.666 216.438 569.004 136.122C562.672 95.9608 555.136 63.4878 546.779 41.0664C542.599 29.8528 538.224 21.183 533.711 15.3257C529.191 9.45855 524.602 6.5 520 6.5C515.398 6.5 510.809 9.45855 506.289 15.3257C501.776 21.183 497.401 29.8528 493.221 41.0664C484.864 63.4878 477.328 95.9608 470.996 136.122C458.334 216.438 450.5 327.411 450.5 450Z"
          stroke="currentColor"
        />
        <path
          d="M450.5 450C450.5 567.875 466.166 674.57 491.48 751.779C504.138 790.386 519.2 821.593 535.901 843.138C552.607 864.689 570.893 876.5 590 876.5C609.107 876.5 627.393 864.689 644.099 843.138C660.8 821.593 675.862 790.386 688.52 751.779C713.834 674.57 729.5 567.875 729.5 450C729.5 332.125 713.834 225.43 688.52 148.221C675.862 109.614 660.8 78.4069 644.099 56.8621C627.393 35.3107 609.107 23.5 590 23.5C570.893 23.5 552.607 35.3107 535.901 56.8621C519.2 78.4069 504.138 109.614 491.48 148.221C466.166 225.43 450.5 332.125 450.5 450Z"
          stroke="currentColor"
        />
        <path
          d="M450.5 449.5C450.5 554.228 473.991 649.016 511.945 717.605C549.909 786.211 602.275 828.5 660 828.5C717.725 828.5 770.091 786.211 808.055 717.605C846.009 649.016 869.5 554.228 869.5 449.5C869.5 344.772 846.009 249.984 808.055 181.395C770.091 112.789 717.725 70.5 660 70.5C602.275 70.5 549.909 112.789 511.945 181.395C473.991 249.984 450.5 344.772 450.5 449.5Z"
          stroke="currentColor"
        />
        <path
          d="M450 450.5C572.589 450.5 683.562 458.334 763.878 470.996C804.039 477.328 836.512 484.864 858.934 493.221C870.147 497.401 878.817 501.776 884.674 506.289C890.541 510.809 893.5 515.398 893.5 520C893.5 524.602 890.541 529.191 884.674 533.711C878.817 538.224 870.147 542.599 858.934 546.779C836.512 555.136 804.039 562.672 763.878 569.004C683.562 581.666 572.589 589.5 450 589.5C327.411 589.5 216.438 581.666 136.122 569.004C95.9608 562.672 63.4878 555.136 41.0664 546.779C29.8528 542.599 21.183 538.224 15.3257 533.711C9.45855 529.191 6.5 524.602 6.5 520C6.5 515.398 9.45855 510.809 15.3257 506.289C21.183 501.776 29.8528 497.401 41.0664 493.221C63.4878 484.864 95.9608 477.328 136.122 470.996C216.438 458.334 327.411 450.5 450 450.5Z"
          stroke="currentColor"
        />
        <path
          d="M450 450.5C567.875 450.5 674.57 466.166 751.779 491.48C790.386 504.138 821.593 519.2 843.138 535.901C864.689 552.607 876.5 570.893 876.5 590C876.5 609.107 864.689 627.393 843.138 644.099C821.593 660.8 790.386 675.862 751.779 688.52C674.57 713.834 567.875 729.5 450 729.5C332.125 729.5 225.43 713.834 148.221 688.52C109.614 675.862 78.4069 660.8 56.8621 644.099C35.3107 627.393 23.5 609.107 23.5 590C23.5 570.893 35.3107 552.607 56.8621 535.901C78.4069 519.2 109.614 504.138 148.221 491.48C225.43 466.166 332.125 450.5 450 450.5Z"
          stroke="currentColor"
        />
        <path
          d="M449.5 450.5C554.228 450.5 649.016 473.991 717.605 511.945C786.211 549.909 828.5 602.275 828.5 660C828.5 717.725 786.211 770.091 717.605 808.055C649.016 846.009 554.228 869.5 449.5 869.5C344.772 869.5 249.984 846.009 181.395 808.055C112.789 770.091 70.5 717.725 70.5 660C70.5 602.275 112.789 549.909 181.395 511.945C249.984 473.991 344.772 450.5 449.5 450.5Z"
          stroke="currentColor"
        />
        <path
          d="M450 449.5C572.589 449.5 683.562 441.666 763.878 429.004C804.039 422.672 836.512 415.136 858.934 406.779C870.147 402.599 878.817 398.224 884.674 393.711C890.541 389.191 893.5 384.602 893.5 380C893.5 375.398 890.541 370.809 884.674 366.289C878.817 361.776 870.147 357.401 858.934 353.221C836.512 344.864 804.039 337.328 763.878 330.996C683.562 318.334 572.589 310.5 450 310.5C327.411 310.5 216.438 318.334 136.122 330.996C95.9608 337.328 63.4878 344.864 41.0664 353.221C29.8528 357.401 21.183 361.776 15.3257 366.289C9.45855 370.809 6.5 375.398 6.5 380C6.5 384.602 9.45855 389.191 15.3257 393.711C21.183 398.224 29.8528 402.599 41.0664 406.779C63.4878 415.136 95.9608 422.672 136.122 429.004C216.438 441.666 327.411 449.5 450 449.5Z"
          stroke="currentColor"
        />
        <path
          d="M450 449.5C567.875 449.5 674.57 433.834 751.779 408.52C790.386 395.862 821.593 380.8 843.138 364.099C864.689 347.393 876.5 329.107 876.5 310C876.5 290.893 864.689 272.607 843.138 255.901C821.593 239.2 790.386 224.138 751.779 211.48C674.57 186.166 567.875 170.5 450 170.5C332.125 170.5 225.43 186.166 148.221 211.48C109.614 224.138 78.4069 239.2 56.8621 255.901C35.3107 272.607 23.5 290.893 23.5 310C23.5 329.107 35.3107 347.393 56.8621 364.099C78.4069 380.8 109.614 395.862 148.221 408.52C225.43 433.834 332.125 449.5 450 449.5Z"
          stroke="currentColor"
        />
        <path
          d="M449.5 449.5C554.228 449.5 649.016 426.009 717.605 388.055C786.211 350.091 828.5 297.725 828.5 240C828.5 182.275 786.211 129.909 717.605 91.9451C649.016 53.9908 554.228 30.5 449.5 30.5C344.772 30.5 249.984 53.9908 181.395 91.9451C112.789 129.909 70.5 182.275 70.5 240C70.5 297.725 112.789 350.091 181.395 388.055C249.984 426.009 344.772 449.5 449.5 449.5Z"
          stroke="currentColor"
        />
      </g>

      <path
        d="M449.5 450C449.5 572.589 441.666 683.562 429.004 763.878C422.672 804.039 415.136 836.512 406.779 858.934C402.599 870.147 398.224 878.817 393.711 884.674C389.191 890.541 384.602 893.5 380 893.5C375.398 893.5 370.809 890.541 366.289 884.674C361.776 878.817 357.401 870.147 353.221 858.934C344.864 836.512 337.328 804.039 330.996 763.878C318.334 683.562 310.5 572.589 310.5 450C310.5 327.411 318.334 216.438 330.996 136.122C337.328 95.9608 344.864 63.4878 353.221 41.0664C357.401 29.8528 361.776 21.183 366.289 15.3257C370.809 9.45855 375.398 6.5 380 6.5C384.602 6.5 389.191 9.45855 393.711 15.3257C398.224 21.183 402.599 29.8528 406.779 41.0664C415.136 63.4878 422.672 95.9608 429.004 136.122C441.666 216.438 449.5 327.411 449.5 450Z"
        stroke="currentColor"
        className="animate-stroke"
      />
      <path
        d="M449.5 450C449.5 567.875 433.834 674.57 408.52 751.779C395.862 790.386 380.8 821.593 364.099 843.138C347.393 864.689 329.107 876.5 310 876.5C290.893 876.5 272.607 864.689 255.901 843.138C239.2 821.593 224.138 790.386 211.48 751.779C186.166 674.57 170.5 567.875 170.5 450C170.5 332.125 186.166 225.43 211.48 148.221C224.138 109.614 239.2 78.4069 255.901 56.8621C272.607 35.3107 290.893 23.5 310 23.5C329.107 23.5 347.393 35.3107 364.099 56.8621C380.8 78.4069 395.862 109.614 408.52 148.221C433.834 225.43 449.5 332.125 449.5 450Z"
        stroke="currentColor"
        className="animate-stroke"
      />
      <path
        d="M449.5 449.5C449.5 554.228 426.009 649.016 388.055 717.605C350.091 786.211 297.725 828.5 240 828.5C182.275 828.5 129.909 786.211 91.9451 717.605C53.9908 649.016 30.5 554.228 30.5 449.5C30.5 344.772 53.9908 249.984 91.9451 181.395C129.909 112.789 182.275 70.5 240 70.5C297.725 70.5 350.091 112.789 388.055 181.395C426.009 249.984 449.5 344.772 449.5 449.5Z"
        stroke="currentColor"
        className="animate-stroke"
      />
      <path
        d="M450.5 450C450.5 572.589 458.334 683.562 470.996 763.878C477.328 804.039 484.864 836.512 493.221 858.934C497.401 870.147 501.776 878.817 506.289 884.674C510.809 890.541 515.398 893.5 520 893.5C524.602 893.5 529.191 890.541 533.711 884.674C538.224 878.817 542.599 870.147 546.779 858.934C555.136 836.512 562.672 804.039 569.004 763.878C581.666 683.562 589.5 572.589 589.5 450C589.5 327.411 581.666 216.438 569.004 136.122C562.672 95.9608 555.136 63.4878 546.779 41.0664C542.599 29.8528 538.224 21.183 533.711 15.3257C529.191 9.45855 524.602 6.5 520 6.5C515.398 6.5 510.809 9.45855 506.289 15.3257C501.776 21.183 497.401 29.8528 493.221 41.0664C484.864 63.4878 477.328 95.9608 470.996 136.122C458.334 216.438 450.5 327.411 450.5 450Z"
        stroke="currentColor"
        className="animate-stroke"
      />
      <path
        d="M450.5 450C450.5 567.875 466.166 674.57 491.48 751.779C504.138 790.386 519.2 821.593 535.901 843.138C552.607 864.689 570.893 876.5 590 876.5C609.107 876.5 627.393 864.689 644.099 843.138C660.8 821.593 675.862 790.386 688.52 751.779C713.834 674.57 729.5 567.875 729.5 450C729.5 332.125 713.834 225.43 688.52 148.221C675.862 109.614 660.8 78.4069 644.099 56.8621C627.393 35.3107 609.107 23.5 590 23.5C570.893 23.5 552.607 35.3107 535.901 56.8621C519.2 78.4069 504.138 109.614 491.48 148.221C466.166 225.43 450.5 332.125 450.5 450Z"
        stroke="currentColor"
        className="animate-stroke"
      />
      <path
        d="M450.5 449.5C450.5 554.228 473.991 649.016 511.945 717.605C549.909 786.211 602.275 828.5 660 828.5C717.725 828.5 770.091 786.211 808.055 717.605C846.009 649.016 869.5 554.228 869.5 449.5C869.5 344.772 846.009 249.984 808.055 181.395C770.091 112.789 717.725 70.5 660 70.5C602.275 70.5 549.909 112.789 511.945 181.395C473.991 249.984 450.5 344.772 450.5 449.5Z"
        stroke="currentColor"
        className="animate-stroke"
      />
      <path
        d="M450 450.5C572.589 450.5 683.562 458.334 763.878 470.996C804.039 477.328 836.512 484.864 858.934 493.221C870.147 497.401 878.817 501.776 884.674 506.289C890.541 510.809 893.5 515.398 893.5 520C893.5 524.602 890.541 529.191 884.674 533.711C878.817 538.224 870.147 542.599 858.934 546.779C836.512 555.136 804.039 562.672 763.878 569.004C683.562 581.666 572.589 589.5 450 589.5C327.411 589.5 216.438 581.666 136.122 569.004C95.9608 562.672 63.4878 555.136 41.0664 546.779C29.8528 542.599 21.183 538.224 15.3257 533.711C9.45855 529.191 6.5 524.602 6.5 520C6.5 515.398 9.45855 510.809 15.3257 506.289C21.183 501.776 29.8528 497.401 41.0664 493.221C63.4878 484.864 95.9608 477.328 136.122 470.996C216.438 458.334 327.411 450.5 450 450.5Z"
        stroke="currentColor"
        className="animate-stroke"
      />
      <path
        d="M450 450.5C567.875 450.5 674.57 466.166 751.779 491.48C790.386 504.138 821.593 519.2 843.138 535.901C864.689 552.607 876.5 570.893 876.5 590C876.5 609.107 864.689 627.393 843.138 644.099C821.593 660.8 790.386 675.862 751.779 688.52C674.57 713.834 567.875 729.5 450 729.5C332.125 729.5 225.43 713.834 148.221 688.52C109.614 675.862 78.4069 660.8 56.8621 644.099C35.3107 627.393 23.5 609.107 23.5 590C23.5 570.893 35.3107 552.607 56.8621 535.901C78.4069 519.2 109.614 504.138 148.221 491.48C225.43 466.166 332.125 450.5 450 450.5Z"
        stroke="currentColor"
        className="animate-stroke"
      />
      <path
        d="M449.5 450.5C554.228 450.5 649.016 473.991 717.605 511.945C786.211 549.909 828.5 602.275 828.5 660C828.5 717.725 786.211 770.091 717.605 808.055C649.016 846.009 554.228 869.5 449.5 869.5C344.772 869.5 249.984 846.009 181.395 808.055C112.789 770.091 70.5 717.725 70.5 660C70.5 602.275 112.789 549.909 181.395 511.945C249.984 473.991 344.772 450.5 449.5 450.5Z"
        stroke="currentColor"
        className="animate-stroke"
      />
      <path
        d="M450 449.5C572.589 449.5 683.562 441.666 763.878 429.004C804.039 422.672 836.512 415.136 858.934 406.779C870.147 402.599 878.817 398.224 884.674 393.711C890.541 389.191 893.5 384.602 893.5 380C893.5 375.398 890.541 370.809 884.674 366.289C878.817 361.776 870.147 357.401 858.934 353.221C836.512 344.864 804.039 337.328 763.878 330.996C683.562 318.334 572.589 310.5 450 310.5C327.411 310.5 216.438 318.334 136.122 330.996C95.9608 337.328 63.4878 344.864 41.0664 353.221C29.8528 357.401 21.183 361.776 15.3257 366.289C9.45855 370.809 6.5 375.398 6.5 380C6.5 384.602 9.45855 389.191 15.3257 393.711C21.183 398.224 29.8528 402.599 41.0664 406.779C63.4878 415.136 95.9608 422.672 136.122 429.004C216.438 441.666 327.411 449.5 450 449.5Z"
        stroke="currentColor"
        className="animate-stroke"
      />
      <path
        d="M450 449.5C567.875 449.5 674.57 433.834 751.779 408.52C790.386 395.862 821.593 380.8 843.138 364.099C864.689 347.393 876.5 329.107 876.5 310C876.5 290.893 864.689 272.607 843.138 255.901C821.593 239.2 790.386 224.138 751.779 211.48C674.57 186.166 567.875 170.5 450 170.5C332.125 170.5 225.43 186.166 148.221 211.48C109.614 224.138 78.4069 239.2 56.8621 255.901C35.3107 272.607 23.5 290.893 23.5 310C23.5 329.107 35.3107 347.393 56.8621 364.099C78.4069 380.8 109.614 395.862 148.221 408.52C225.43 433.834 332.125 449.5 450 449.5Z"
        stroke="currentColor"
        className="animate-stroke"
      />
      <path
        d="M449.5 449.5C554.228 449.5 649.016 426.009 717.605 388.055C786.211 350.091 828.5 297.725 828.5 240C828.5 182.275 786.211 129.909 717.605 91.9451C649.016 53.9908 554.228 30.5 449.5 30.5C344.772 30.5 249.984 53.9908 181.395 91.9451C112.789 129.909 70.5 182.275 70.5 240C70.5 297.725 112.789 350.091 181.395 388.055C249.984 426.009 344.772 449.5 449.5 449.5Z"
        stroke="currentColor"
        className="animate-stroke"
      />
      <defs>
        <linearGradient
          id="paint0_linear_26_28"
          x1="450"
          y1="0"
          x2="450"
          y2="900"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="rgba(255,255,255,0)" />
          <stop offset="0.5" stopColor="rgba(200,200,255,0.2)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function HomePage() {
  return (
    <main className="relative py-20">
      <div
        className="absolute w-[calc(100%-2rem)] border-x top-0 left-[50%] translate-x-[-50%] h-full z-[-1] max-w-[1200px]"
        style={{
          background:
            'repeating-linear-gradient(to bottom, transparent, hsl(var(--secondary)/.4) 500px, transparent 1000px)'
        }}
      />
      <div className="px-4">
        <Hero />
      </div>
      <div className="container border-b px-8">
        <div className="flex flex-col sm:divide-x sm:divide-border sm:flex-row">
          <div className="py-8 flex-1 sm:pr-8 sm:py-16">
            <p className="font-medium text-muted-foreground [&_b]:text-foreground sm:text-lg">
              Next Docs is the Next.js framework for building documentation
              sites along with <b>Breathtaking UI</b> and{' '}
              <b>Excellent User Experience</b>.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 py-8 sm:pl-8 sm:py-16 sm:max-md:grid-cols-1">
            <Button size="lg">Getting Started</Button>
            <Button size="lg" variant="secondary">
              Open Demo
            </Button>
          </div>
        </div>
      </div>
      <div className="container py-24 border-b">
        <h2 className="text-2xl font-semibold text-center sm:text-4xl">
          Start instantly.
          <br />
          Make it yours, Ship within seconds.
        </h2>
      </div>
      <div className="container px-8 border-b">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="relative flex flex-col py-16 md:pr-8">
            <div className={cn(badgeVariants())}>1</div>
            <h3 className="font-bold text-xl">Create It.</h3>
            <p className="text-muted-foreground">
              Initialize a new docs with a command.
            </p>
            <div className="mr-4">
              <CodeBlock lang="bash" code="pnpm create next-docs-app" />
            </div>
            <LaunchAppWindow className="ml-auto w-fit -mt-14 min-h-[120px] z-[2]" />
          </div>
          <div className="relative flex flex-col py-16 md:border-l md:pl-8">
            <div className={cn(badgeVariants())}>2</div>
            <h3 className="font-bold text-xl">Customise.</h3>
            <p className="text-muted-foreground">
              Modify the code, in a comfortable way with Typescript
              auto-complete.
            </p>
            <TypingCodeBlock
              title="source.ts"
              lang="ts"
              code={code}
              allowCopy={false}
            />
          </div>
        </div>
      </div>
      <div className="container py-12 border-b flex flex-col text-center items-center">
        <div className={cn(badgeVariants())}>3</div>
        <h3 className="font-bold text-2xl">Ship.</h3>
        <p className="text-muted-foreground mb-2">
          Deploy your docs easily with Next.js compatible hosting platforms.
        </p>

        <div className="flex flex-row flex-wrap gap-8 items-center mt-4">
          <a href="https://vercel.com" rel="noreferrer noopener">
            <VercelLogo className="w-32 h-auto" />
          </a>
          <a href="https://netlify.com" rel="noreferrer noopener">
            <NetlifyLogo className="w-32 h-auto" />
          </a>
        </div>

        <div
          className="w-full mt-8"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to right,hsl(var(--primary)/.1),hsl(var(--primary)/.1) 1px,transparent 1px,transparent 40px), repeating-linear-gradient(to bottom,hsl(var(--primary)/.1),hsl(var(--primary)/.1) 1px,transparent 1px,transparent 40px)'
          }}
        >
          <Earth className="mx-auto w-60 h-auto -my-8" />
        </div>
      </div>
      <div className="relative container py-32 border-b overflow-hidden">
        <h2 className="text-2xl font-semibold text-center sm:text-3xl">
          Loved by users.
          <br />
          Built for developers.
        </h2>
        <Rain
          width={1000}
          height={500}
          className="absolute w-full h-full inset-0 mix-blend-difference"
        />
      </div>
      <div className="container px-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <div className="px-8 py-16 border-b md:border-r">
          <RocketIcon />
          <h2 className="font-bold inline mr-2">Light and Fast.</h2>
          <span className="text-muted-foreground font-medium">
            Full powered documentation site with Next.js App Router.
          </span>
        </div>
        <div className="px-8 py-16 border-b lg:border-r">
          <TimerIcon />
          <h2 className="font-bold inline mr-2">Optimized.</h2>
          <span className="text-muted-foreground font-medium">
            Less client components, less Javascript, optimized images.
          </span>
        </div>
        <div className="px-8 py-16 border-b md:border-r">
          <LayoutIcon />
          <h2 className="font-bold inline mr-2">Accessibility & UX first.</h2>
          <span className="text-muted-foreground font-medium">
            Focus on user experience and accessibility, providing an excellent
            experience for your users.
          </span>
        </div>
        <div className="px-8 py-16 border-b lg:border-r">
          <SearchIcon />
          <h2 className="font-bold inline mr-2">Powerful document search.</h2>
          <span className="text-muted-foreground font-medium">
            Built-in search implemented with Flexsearch, with high flexibility
            and performance.
          </span>
        </div>
        <div className="px-8 py-16 border-b md:border-r">
          <PaperclipIcon />
          <h2 className="font-bold inline mr-2">Useful MDX Plugins.</h2>
          <span className="text-muted-foreground font-medium">
            Bundled with remark and rehype plugins that enhances the developer
            experience.
          </span>
        </div>
        <div className="px-8 py-16 border-b">
          <PersonStandingIcon />
          <h2 className="font-bold inline mr-2">Personalized.</h2>
          <span className="text-muted-foreground font-medium">
            Advanced options for customising your theme in a comfortable way.
          </span>
        </div>
      </div>
    </main>
  )
}

function LaunchAppWindow(props: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        'bg-background rounded-md border overflow-hidden',
        props.className
      )}
    >
      <div className="relative flex flex-row items-center h-6 border-b bg-muted text-muted-foreground text-xs px-4">
        <CircleIcon
          aria-label="close"
          className="fill-red-400 w-2 h-2 text-transparent"
        />
        <p className="absolute inset-x-0 text-center">localhost:3000</p>
      </div>
      <div className="p-4 text-sm">New App launched with Next Docs!</div>
    </div>
  )
}

function Hero() {
  return (
    <div className="relative flex flex-col items-center text-center container p-6 border z-[2] bg-background">
      <div className="h-fit mt-12 mb-[260px]">
        <h1 className="font-medium text-4xl sm:text-6xl p-2">
          Build Your Docs.
        </h1>
      </div>
      <StarsIcon
        className="absolute -top-4 -left-4 w-8 h-8"
        stroke="none"
        fill="currentColor"
      />
      <StarsIcon
        className="absolute -bottom-4 -right-4 w-8 h-8"
        stroke="none"
        fill="currentColor"
      />
      <div className="absolute top-[65%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-gradient-to-t from-black to-gray-700 p-4 rounded-full">
        <StarIcon
          className="w-20 h-20"
          stroke="none"
          fill="url(#star-gradient)"
        >
          <defs>
            <linearGradient id="star-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="20%" stopColor="rgb(255,255,255)" />
              <stop offset="50%" stopColor="rgba(0,255,255,0.8)" />
              <stop offset="100%" stopColor="rgba(0,50,255,0.4)" />
            </linearGradient>
          </defs>
        </StarIcon>
      </div>
      <div
        className="absolute inset-0 z-[-1]"
        style={{
          backgroundImage:
            'conic-gradient(from 310deg at 50% 65%,transparent 0deg,transparent 100deg,rgba(0, 180, 255, 0.8) 140deg,rgba(50, 50, 255, 0.8) 184deg,rgba(255, 20, 255, 0.8) 216deg,rgba(250, 0, 55, 1) 300deg,rgba(200, 50, 255, 0.8) 340deg,transparent 1turn)'
        }}
      />
      <div
        className="absolute inset-0 z-[-1]"
        style={{
          backgroundImage:
            'repeating-radial-gradient(500px at 50% 65%,hsl(var(--background)/.5),hsl(var(--primary)/.2) 56px)'
        }}
      />
      <div
        className="absolute inset-0 z-[-1]"
        style={{
          background:
            'radial-gradient(500px at 50% 65%, transparent 20%, hsl(var(--background)/.8))'
        }}
      />
    </div>
  )
}
