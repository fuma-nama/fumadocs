'use client';
import { type AnchorHTMLAttributes, forwardRef } from 'react';
import { Edit } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useI18n } from '@/contexts/i18n';
import { buttonVariants } from '@/components/ui/button';

export interface EditOnGitHubOptions
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children'> {
  owner: string;
  repo: string;

  /**
   * SHA or ref (branch or tag) name.
   *
   * @defaultValue main
   */
  sha?: string;

  /**
   * File path in the repo
   */
  path: string;
}

const EditOnGitHub = forwardRef<HTMLAnchorElement, EditOnGitHubOptions>(
  ({ owner, repo, sha = 'main', path, ...props }, ref) => {
    const { text } = useI18n();

    return (
      <a
        ref={ref}
        href={`https://github.com/${owner}/${repo}/blob/${sha}/${path.startsWith('/') ? path.slice(1) : path}`}
        target="_blank"
        rel="noreferrer noopener"
        {...props}
        className={cn(
          buttonVariants({
            color: 'outline',
            className: 'text-fd-muted-foreground text-xs p-1.5 gap-2',
          }),
          props.className,
        )}
      >
        <Edit className="size-3.5" />
        {text.editOnGithub}
      </a>
    );
  },
);

EditOnGitHub.displayName = 'EditOnGitHub';

export default EditOnGitHub;
