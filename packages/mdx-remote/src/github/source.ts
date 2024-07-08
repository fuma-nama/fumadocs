import {
  type MetaData,
  type PageData,
  type Source,
} from 'fumadocs-core/source';
import { type FileData } from '@/github/types';
import {
  type GetFilesOptions,
  getGitHubFiles,
  type GetGitHubFilesOptions,
  getLocalFiles,
} from '@/github/helper/get-files';
import { USE_LOCAL } from '@/github/constants';

/**
 * Choose between GitHub and Local file system based on node environment.
 *
 * Use GitHub in production mode, otherwise, use file system.
 */
export async function createSourceAuto<Frontmatter extends PageData>(
  options: GetFilesOptions & {
    /**
     * Choose the content source
     *
     * @defaultValue 'auto'
     */
    from?: 'auto' | 'local' | 'github';

    /**
     * Options when GitHub content source is used
     */
    github: Omit<GetGitHubFilesOptions, keyof GetFilesOptions> &
      Partial<GetFilesOptions>;
  },
): Promise<
  Source<{
    pageData: Frontmatter & {
      data: FileData;
    };
    metaData: MetaData;
  }>
> {
  const { from = 'auto', ...rest } = options;

  return {
    files:
      (from === 'auto' && USE_LOCAL) || from === 'local'
        ? await getLocalFiles(rest)
        : await getGitHubFiles({
            ...rest,
            ...rest.github,
          }),
  };
}
