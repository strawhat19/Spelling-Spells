import Icon from '../Icon';
import Skeleton from '../Skeleton';
import styles from './styles.native';
import { getMediaUrl } from './urls';
import { useMemo, useState } from 'react';
import type { SpellMediaProps } from './types';
import { spellMediaAssets } from './assets.native';
import { useTheme } from '../../shared/themeContext/useTheme';
import { Text, View, Alert, Image, Linking, Pressable, type ImageSourcePropType } from 'react-native';

const getHttpsUrl = (value?: string) => {
  const url = getMediaUrl(value);
  return url?.startsWith(`https://`) ? url : null;
};

const getImageSource = (url: string): ImageSourcePropType | undefined => {
  const mediaUrl = getMediaUrl(url);
  const asset = mediaUrl ? spellMediaAssets.get(mediaUrl) : undefined;
  if (asset) return asset;
  const uri = getHttpsUrl(url);
  return uri ? { uri } : undefined;
};

const openExternal = (value: string) => {
  const url = getHttpsUrl(value);
  if (url) void Linking.openURL(url).catch(() => Alert.alert(`Could Not Open Media`, `Please Try Again When You’re Connected`));
};

type MediaImageProps = { url: string; alt: string; elementId: string; compact?: boolean };

const MediaImage = ({ url, alt, elementId, compact = false }: MediaImageProps) => {
  const { palette } = useTheme();
  const source = useMemo(() => getImageSource(url), [url]);
  const [state, setState] = useState<`loading` | `ready` | `error`>(source ? `loading` : `error`);
  const [ratio, setRatio] = useState(() => {
    const asset = source ? Image.resolveAssetSource(source) : null;
    return asset?.width && asset?.height ? asset.width / asset.height : 16 / 9;
  });
  return <View
    nativeID={`${elementId}-frame`}
    style={[styles.frame, compact && styles.compactFrame, { aspectRatio: compact ? 16 / 9 : ratio, borderColor: palette.border, backgroundColor: palette.panel }]}
  >
    {source && state !== `error` ? <Image
      source={source}
      nativeID={`${elementId}-image`}
      accessibilityLabel={alt}
      accessible={state === `ready`}
      resizeMode={compact ? `cover` : `contain`}
      onError={() => setState(`error`)}
      style={[styles.image, { opacity: state === `ready` ? 1 : 0 }]}
      onLoad={(event) => {
        const { width, height } = event.nativeEvent.source;
        if (width > 0 && height > 0) setRatio(width / height);
        setState(`ready`);
      }}
    /> : null}
    {state === `loading` ? <>
      <View nativeID={`${elementId}-placeholder`} accessible={false} pointerEvents='none' accessibilityElementsHidden importantForAccessibility='no-hide-descendants' style={[styles.placeholder, { backgroundColor: palette.panel }]}><Skeleton id={`${elementId}-skeleton`} shape='block' width='100%' height='100%' /></View>
      <Text nativeID={`${elementId}-loading-status`} accessibilityLiveRegion='polite' style={styles.loadingStatus}>Loading Illustration</Text>
    </> : null}
    {state === `error` ? <View nativeID={`${elementId}-fallback`} accessible accessibilityRole='image' accessibilityLabel={`${alt}. Illustration Unavailable`} style={styles.fallback}><Icon name='book' size={25} color={palette.muted} /><Text style={[styles.fallbackText, { color: palette.muted }]}>Illustration Unavailable</Text></View> : null}
  </View>;
};

const SpellMedia = ({ spell, idPrefix, compact = false }: SpellMediaProps) => {
  const { palette } = useTheme();
  const available = spell.media?.filter((media) => getMediaUrl(media.url) && (!compact || media.type === `image`)) ?? [];
  const entries = compact ? available.slice(0, 1) : available;
  const elementId = idPrefix ? `${idPrefix}-${spell.id}` : spell.id;
  if (!entries.length) return null;
  return <View nativeID={`spell-media-${elementId}`} style={styles.gallery}>{entries.map((media, index) => {
    const mediaId = `spell-media-${elementId}-${media.id}-${index}`;
    const videoUrl = media.type === `video` ? getHttpsUrl(media.url) : null;
    const sourceUrl = getHttpsUrl(media.sourceUrl);
    return <View key={`${media.id}-${media.url}-${index}`} nativeID={mediaId} style={styles.item}>
      {media.type === `image` ? <MediaImage key={media.url} url={media.url} alt={media.alt} elementId={mediaId} compact={compact} /> : <>
        {media.poster ? <MediaImage key={media.poster} url={media.poster} alt={media.alt} elementId={`${mediaId}-poster`} /> : null}
        {videoUrl ? <Pressable nativeID={`${mediaId}-video-link`} accessibilityRole='link' accessibilityLabel={`Open Video: ${media.alt}`} onPress={() => openExternal(videoUrl)} style={styles.link}><Icon name='play' size={19} color={palette.gold} /><Text style={[styles.linkText, { color: palette.gold }]}>Open Video</Text><Icon name='external-link' size={15} color={palette.gold} /></Pressable> : <Text nativeID={`${mediaId}-video-unavailable`} style={[styles.fallbackText, { color: palette.muted }]}>Video Unavailable</Text>}
      </>}
      {!compact && media.caption ? <Text nativeID={`${mediaId}-caption`} style={[styles.caption, { color: palette.text }]}>{media.caption}</Text> : null}
      {!compact && (media.credit || sourceUrl) ? sourceUrl ? <Pressable nativeID={`${mediaId}-credit-link`} accessibilityRole='link' onPress={() => openExternal(sourceUrl)} style={styles.link}><Text style={[styles.linkText, { color: palette.gold }]}>{media.credit || `Media Source`}</Text><Icon name='external-link' size={14} color={palette.gold} /></Pressable> : <Text nativeID={`${mediaId}-credit`} style={[styles.credit, { color: palette.muted }]}>{media.credit}</Text> : null}
    </View>;
  })}</View>;
};

export default SpellMedia;
