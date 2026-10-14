import type { PropsWithChildren } from 'react';

const RootHtml = ({ children }: PropsWithChildren) => (
  <html lang='en' data-theme='night'>
    <head>
      <meta charSet='utf-8' />
      <meta name='theme-color' content='#17102B' />
      <meta name='application-name' content='Spelling Spells' />
      <meta name='viewport' content='width=device-width, initial-scale=1' />
      <link rel='icon' href='/favicon.svg' type='image/svg+xml' />
      <link rel='manifest' href='/manifest.webmanifest' />
      <link rel='apple-touch-icon' href='/icons/icon-192.png' />
    </head>
    <body>{children}</body>
  </html>
);

export default RootHtml;
