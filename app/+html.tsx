import type { PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

const RootHtml = ({ children }: PropsWithChildren) => (
  <html lang='en' data-theme='night'>
    <head>
      <meta charSet='utf-8' />
      <title>Spelling Spells · Every Spell Has a Story</title>
      <meta name='theme-color' content='#17102B' />
      <meta name='application-name' content='Spelling Spells' />
      <meta name='viewport' content='width=device-width, initial-scale=1' />
      <meta name='description' content='Explore the spelling, pronunciation, origins and effects of famous fictional spells from stories and games.' />
      <link rel='icon' href='/favicon.svg' type='image/svg+xml' />
      <link rel='manifest' href='/manifest.webmanifest' />
      <link rel='apple-touch-icon' href='/icons/icon-192.png' />
      <ScrollViewStyleReset />
    </head>
    <body>{children}</body>
  </html>
);

export default RootHtml;
