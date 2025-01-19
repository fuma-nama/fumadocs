import { type MDXComponents } from 'mdx/types';

export type MdxContent = React.FC<{ components?: MDXComponents }>;

export async function renderMDX(
  compiled: string,
  scope: object,
): Promise<MdxContent> {
  let jsxRuntime;

  if (process.env.NODE_ENV === 'production') {
    jsxRuntime = await import('react/jsx-runtime');
  } else {
    jsxRuntime = await import('react/jsx-dev-runtime');
  }

  const fullScope = {
    opts: jsxRuntime,
    ...scope,
  };
  const keys = Object.keys(fullScope);
  const values = Object.values(fullScope);

  const hydrateFn = Reflect.construct(Function, keys.concat(compiled));

  const result = hydrateFn.apply(hydrateFn, values) as {
    default: MdxContent;
  };

  return result.default;
}
