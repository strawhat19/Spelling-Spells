import './styles.scss';
import Icon from '../Icon';
import { useState } from 'react';
import Skeleton from '../Skeleton';
import { getMediaUrl } from './urls';
import type { SpellMediaProps } from './types';
import { useMediaImage } from './useMediaImage.web';
import type { SpellMedia as Media } from '../../shared/models/Spell';

const MediaImage = ({ item, prefix, compact }: { item: Media; prefix: string; compact: boolean }) => {
  const image = useMediaImage();
  return <div id={`${prefix}-visual`} className='spell-media-visual'>
    {image.status === `loading` ? <div id={`${prefix}-skeleton`} className='spell-media-skeleton' aria-hidden='true'><Skeleton shape='block' height='100%' /></div> : null}
    {image.status === `error` ? <div id={`${prefix}-unavailable`} className='spell-media-unavailable' role='status'><Icon name='book' size={24} /><span>Illustration Unavailable</span></div> : <img
      width={1024}
      height={576}
      alt={item.alt}
      ref={image.imageRef}
      id={`${prefix}-image`}
      src={getMediaUrl(item.url)}
      onLoad={image.onLoad}
      onError={image.onError}
      loading={compact ? `lazy` : `eager`}
      decoding='async'
      className={`spell-media-image${image.status === `ready` ? ` is-ready` : ``}`}
    />}
    {compact && image.status === `ready` ? <span id={`${prefix}-badge`} className='spell-media-badge'>Illustration</span> : null}
  </div>;
};

const MediaVideo = ({ item, prefix }: { item: Media; prefix: string }) => {
  const [failed, setFailed] = useState(false);
  return <div id={`${prefix}-visual`} className='spell-media-visual'>
    {failed ? <a id={`${prefix}-open-video`} className='spell-media-unavailable' aria-label={`Open Video: ${item.alt}`} href={getMediaUrl(item.url)} target='_blank' rel='noopener noreferrer'><Icon name='play' size={24} /><span>Open Video</span></a> : <video
      controls
      playsInline
      preload='none'
      id={`${prefix}-video`}
      aria-label={item.alt}
      src={getMediaUrl(item.url)}
      poster={getMediaUrl(item.poster)}
      onError={() => setFailed(true)}
      className='spell-media-video'
    >Your browser cannot play this video</video>}
  </div>;
};

const SpellMedia = ({ spell, idPrefix, compact = false }: SpellMediaProps) => {
  const available = spell.media?.filter((item) => getMediaUrl(item.url) && (!compact || item.type === `image`)) ?? [];
  const items = compact ? available.slice(0, 1) : available;
  if (!items.length) return null;
  const prefix = `${idPrefix ?? `spell-${spell.id}`}-media`;
  return <div id={prefix} className={`spell-media${compact ? ` spell-media--compact` : ``}`} role={compact ? undefined : `group`} aria-label={compact ? undefined : `${spell.name} Artwork and Video`}>
    {items.map((item) => {
      const itemPrefix = `${prefix}-${item.id}`;
      const sourceUrl = getMediaUrl(item.sourceUrl);
      return <figure key={`${item.id}:${item.url}`} id={itemPrefix} className='spell-media-item'>
        {item.type === `video` ? <MediaVideo item={item} prefix={itemPrefix} /> : <MediaImage item={item} prefix={itemPrefix} compact={compact} />}
        {!compact && (item.caption || item.credit || sourceUrl) ? <figcaption id={`${itemPrefix}-caption`} className='spell-media-caption'>
          {item.caption ? <p id={`${itemPrefix}-description`}>{item.caption}</p> : null}
          {item.credit ? <small id={`${itemPrefix}-credit`}>{item.credit}</small> : null}
          {sourceUrl ? <a id={`${itemPrefix}-source`} href={sourceUrl} target='_blank' rel='noopener noreferrer'>Media Source<Icon name='external-link' size={13} /></a> : null}
        </figcaption> : null}
      </figure>;
    })}
  </div>;
};

export default SpellMedia;
