import { richTextToPlainText, type NotionBlockOfType } from '../blocks';
import { canRenderNativeMedia, getEmbedUrl, getUrlLabel } from '../url';
import { NotionCaption, NotionLinkCard } from './link-card';

export function NotionImage({
  block,
  fileUrl,
}: {
  block: NotionBlockOfType<'image'>;
  fileUrl: string | undefined;
}) {
  return (
    <figure className="my-5" data-notion-block="image">
      {fileUrl ? (
        <img
          alt={richTextToPlainText(block.image.caption)}
          className="block h-auto max-w-full rounded-xl"
          decoding="async"
          loading="lazy"
          src={fileUrl}
        />
      ) : null}
      <NotionCaption value={block.image.caption} />
    </figure>
  );
}

export function NotionVideo({
  block,
  fileUrl,
}: {
  block: NotionBlockOfType<'video'>;
  fileUrl: string | undefined;
}) {
  if (!fileUrl) return null;
  const caption = richTextToPlainText(block.video.caption);
  const embedUrl = getEmbedUrl(fileUrl);

  return (
    <figure className="my-5" data-notion-block="video">
      {canRenderNativeMedia(fileUrl, block.video.type === 'file', 'video') ? (
        <video
          className="block h-auto max-w-full rounded-xl"
          controls
          preload="metadata"
          src={fileUrl}
        />
      ) : embedUrl ? (
        <NotionEmbedFrame title={caption || 'Embedded video'} url={embedUrl} />
      ) : (
        <NotionLinkCard kind="video" label={caption || undefined} url={fileUrl} />
      )}
      <NotionCaption value={block.video.caption} />
    </figure>
  );
}

export function NotionAudio({
  block,
  fileUrl,
}: {
  block: NotionBlockOfType<'audio'>;
  fileUrl: string | undefined;
}) {
  if (!fileUrl) return null;

  return (
    <figure className="my-5" data-notion-block="audio">
      {canRenderNativeMedia(fileUrl, block.audio.type === 'file', 'audio') ? (
        <audio className="block w-full" controls preload="none" src={fileUrl} />
      ) : (
        <NotionLinkCard kind="audio" url={fileUrl} />
      )}
      <NotionCaption value={block.audio.caption} />
    </figure>
  );
}

export function NotionPdf({
  block,
  fileUrl,
}: {
  block: NotionBlockOfType<'pdf'>;
  fileUrl: string | undefined;
}) {
  if (!fileUrl) return null;

  return (
    <figure className="my-5" data-notion-block="pdf">
      <iframe
        className="block h-[min(44rem,75vh)] w-full rounded-xl border border-fd-border bg-fd-muted"
        loading="lazy"
        src={fileUrl}
        title={richTextToPlainText(block.pdf.caption) || 'PDF document'}
      />
      {/* the frame is unreliable on mobile browsers, so always offer the file itself */}
      <NotionLinkCard kind="pdf" label="Open PDF" url={fileUrl} />
      <NotionCaption value={block.pdf.caption} />
    </figure>
  );
}

export function NotionFile({
  block,
  fileUrl,
}: {
  block: NotionBlockOfType<'file'>;
  fileUrl: string | undefined;
}) {
  return (
    <figure className="my-5" data-notion-block="file">
      {fileUrl ? (
        <NotionLinkCard kind="file" label={block.file.name} url={fileUrl} />
      ) : (
        block.file.name
      )}
      <NotionCaption value={block.file.caption} />
    </figure>
  );
}

export function NotionEmbed({
  block,
  fileUrl,
}: {
  block: NotionBlockOfType<'embed'>;
  fileUrl: string | undefined;
}) {
  const url = fileUrl ?? block.embed.url;
  const caption = richTextToPlainText(block.embed.caption);
  const embedUrl = getEmbedUrl(url);

  if (!embedUrl) {
    return (
      <NotionLinkCard
        caption={block.embed.caption}
        kind="embed"
        label={caption || undefined}
        url={url}
      />
    );
  }

  return (
    <figure className="my-5" data-notion-block="embed">
      <NotionEmbedFrame title={caption || getUrlLabel(url)} url={embedUrl} />
      <NotionCaption value={block.embed.caption} />
    </figure>
  );
}

export function NotionEmbedFrame({ title, url }: { title: string; url: string }) {
  return (
    <iframe
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture"
      allowFullScreen
      className="block min-h-[min(32rem,70vh)] w-full rounded-xl border border-fd-border bg-fd-muted max-sm:min-h-64"
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      sandbox="allow-forms allow-popups allow-presentation allow-same-origin allow-scripts"
      src={url}
      title={title}
    />
  );
}
