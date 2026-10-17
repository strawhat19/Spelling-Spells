import Icon from '../Icon';
import { useState } from 'react';
import SpellCard from '../SpellCard';
import styles from './styles.native';
import BrandLogo from '../BrandLogo';
import { useRouter } from 'expo-router';
import { useHomeMotion } from './useHomeMotion';
import HeroSpellCarousel from '../HeroSpellCarousel';
import { useTheme } from '../../shared/themeContext/useTheme';
import { useSpells } from '../../shared/spellsContext/useSpells';
import { Text, View, Image, Animated, Pressable, TextInput } from 'react-native';

const HomePage = () => {
  const router = useRouter();
  const motion = useHomeMotion();
  const [query, setQuery] = useState(``);
  const { theme, palette } = useTheme();
  const { spells, worlds, savedIds, ready } = useSpells();
  const featured = spells.find(spell => spell.name === `Lumos`) ?? spells[0];
  const discoveries = spells.filter(spell => spell.id !== featured?.id).slice(0, 3);
  const search = () => router.push({ pathname: `/spells`, params: { q: query.trim() } });

  return (
    <View nativeID="home-page" style={styles.page}>
      <Animated.View nativeID='landing-hero' style={[styles.hero, motion.heroStyle]}>
        {theme === `night` && <Image nativeID="hero-night-archive-art" accessible={false} resizeMode="cover" source={require('../../../public/visuals/hero-night-background.png')} style={styles.heroBackground} />}
        <Animated.View pointerEvents='none' nativeID='hero-orbit-outer' accessibilityElementsHidden importantForAccessibility='no-hide-descendants' style={[styles.orbit, motion.orbitStyle, { borderColor: palette.lavender }]} />
        <Animated.View pointerEvents='none' nativeID='hero-orbit-inner' accessibilityElementsHidden importantForAccessibility='no-hide-descendants' style={[styles.orbitInner, motion.innerOrbitStyle, { borderColor: palette.gold }]} />
        <Animated.View pointerEvents='none' nativeID='hero-watermark' accessibilityElementsHidden importantForAccessibility='no-hide-descendants' style={[styles.watermark, motion.watermarkStyle]}><BrandLogo size={270} /></Animated.View>
        <View nativeID="hero-eyebrow" style={styles.eyebrow}>
          <Icon name="spark" size={17} color={palette.gold} />
          <Text style={[styles.eyebrowText, { color: palette.lavender }]}>A FIELD GUIDE TO FICTIONAL MAGIC</Text>
        </View>
        <Text nativeID="hero-heading" accessibilityRole="header" style={[styles.title, { color: palette.text }]}>
          Every spell has{`\n`}a <Text style={{ color: palette.gold }}>story.</Text>
        </Text>
        <Text nativeID="hero-description" style={[styles.description, { color: palette.muted }]}>From familiar incantations to invented languages: explore how spells are written, spoken, and imagined across your favorite worlds.</Text>
        <View nativeID="hero-feature-list" style={styles.features}>
          {[
            { icon: `book`, label: `Spelling` },
            { icon: `wand`, label: `Pronunciation` },
            { icon: `globe`, label: `Origins & lore` },
          ].map(feature => (
            <View key={feature.icon} nativeID={`hero-feature-${feature.icon}`} style={styles.feature}>
              <Icon name={feature.icon} size={15} color={palette.lavender} />
              <Text style={[styles.featureText, { color: palette.lavender }]}>{feature.label}</Text>
            </View>
          ))}
        </View>
        <View nativeID="hero-actions" style={styles.actions}>
          <Pressable nativeID="hero-explore-library" accessibilityRole="link" onPress={() => router.push(`/spells`)} style={[styles.primary, { backgroundColor: palette.gold }]}>
            <Text style={styles.primaryText}>Explore the spell library</Text>
            <Icon name="arrow-right" size={17} color="#20134D" />
          </Pressable>
          <Pressable nativeID="hero-pronunciation" accessibilityRole="link" onPress={() => router.push(`/pronunciation`)} style={styles.secondary}>
            <Icon name="wand" size={16} color={palette.lavender} />
            <Text style={[styles.secondaryText, { color: palette.text }]}>Say it like you mean it</Text>
          </Pressable>
        </View>
        <View nativeID="hero-search" style={[styles.search, { borderBottomColor: palette.border }]}>
          <Icon name="search" size={18} color={palette.muted} />
          <TextInput
            nativeID="hero-search-input"
            accessibilityLabel="Search the spell library"
            returnKeyType="search"
            value={query}
            placeholder="Find a spell, language, or world…"
            placeholderTextColor={palette.muted}
            onChangeText={setQuery}
            onSubmitEditing={search}
            style={[styles.input, { color: palette.text }]}
          />
          <Pressable nativeID="hero-search-submit" accessibilityLabel="Search spells" onPress={search}><Icon name="arrow-right" size={18} color={palette.gold} /></Pressable>
        </View>
        <View nativeID="hero-spell-stage" style={styles.stage}>
          <Text style={[styles.stageCaption, { color: palette.gold }]}>A little light to begin…</Text>
          <HeroSpellCarousel spells={spells} ready={ready} />
          <View nativeID="hero-spelling-note" style={[styles.pageNote, { backgroundColor: palette.panel, borderColor: palette.border }]}>
            <View style={styles.noteTitle}>
              <Icon name="spark" size={16} color={palette.gold} />
              <Text style={[styles.noteHeading, { color: palette.gold }]}>Spell it. Say it. Know it.</Text>
            </View>
            <Text style={[styles.noteCopy, { color: palette.muted }]}>Each record connects its exact letters, phonetic guide, meaning, and source. Invented words welcome.</Text>
          </View>
        </View>
      </Animated.View>

      <View nativeID="worlds-section" style={styles.section}>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>Magic has many worlds.</Text>
        <Text style={[styles.sectionCopy, { color: palette.muted }]}>Follow a familiar universe, or wander into a new one.</Text>
        <View style={styles.worlds}>
          {worlds.slice(0, 6).map(world => (
            <Pressable key={world.id} nativeID={`home-world-${world.id}`} accessibilityRole="link" onPress={() => router.push({ pathname: `/spells`, params: { world: world.id } })} style={[styles.world, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Icon name="globe" size={22} color={palette.gold} />
              <Text style={[styles.worldName, { color: palette.text }]}>{world.name}</Text>
              <Text style={[styles.worldCount, { color: palette.muted }]}>{spells.filter(spell => spell.worldId === world.id).length} spells · {world.medium}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View nativeID="discovery-section" style={styles.section}>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>A few pages worth turning.</Text>
        <Text style={[styles.sectionCopy, { color: palette.muted }]}>Useful little charms, powerful incantations, and words with a history.</Text>
        <View style={styles.cards}>{discoveries.map(spell => <SpellCard key={spell.id} spell={spell} compact />)}</View>
      </View>

      <View nativeID="field-guide-section" style={styles.section}>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>More than a magic word.</Text>
        <View style={styles.steps}>
          {[
            { icon: `book`, title: `Learn the letters`, copy: `Exact spelling and syllable tiles help you keep every incantation straight.` },
            { icon: `wand`, title: `Read it aloud`, copy: `Plain-language pronunciation, stress notes, and language context give each word a voice.` },
            { icon: `globe`, title: `Trace the story`, copy: `Explore meanings, suggested roots, and source references, with uncertainty clearly marked.` },
            { icon: `shield`, title: `Know its place`, copy: `Compare fictional danger, usefulness, and skill through a consistent editorial guide.` },
          ].map(step => (
            <View key={step.icon} nativeID={`guide-step-${step.icon}`} style={[styles.step, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.stepHeading}><Icon name={step.icon} size={20} color={palette.gold} /><Text style={[styles.stepTitle, { color: palette.text }]}>{step.title}</Text></View>
              <Text style={[styles.stepCopy, { color: palette.muted }]}>{step.copy}</Text>
            </View>
          ))}
        </View>
      </View>

      <View nativeID="personal-grimoire-section" style={styles.section}>
        <View style={[styles.savedNote, { backgroundColor: palette.panel, borderColor: palette.border }]}>
          <Icon name="bookmark" size={26} color={palette.gold} />
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>Keep a little magic.</Text>
          <Text style={[styles.sectionCopy, { color: palette.muted }]}>Sign in to save favorites in your private account collection. Browse and read freely, with no account needed.</Text>
          <Pressable nativeID="home-open-saved" accessibilityRole="link" onPress={() => router.push(`/saved`)} style={styles.secondary}>
            <Text style={[styles.secondaryText, { color: palette.gold }]}>{savedIds.length ? `Open ${savedIds.length} saved spell${savedIds.length === 1 ? `` : `s`}` : `Open your grimoire`}</Text>
            <Icon name="arrow-right" size={17} color={palette.gold} />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default HomePage;
