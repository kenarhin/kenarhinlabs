import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        /* Admin app page title — updated per route via useHead() or per-route head() */
        title: 'Ken Arhin Labs Admin',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    /*
     * data-theme is set by the inline theme boot script below before first
     * paint. The attribute is omitted here at the server render level; the
     * script below sets it before the browser paints any pixels, preventing
     * a flash of the wrong color scheme.
     */
    <html lang="en">
      <head>
        <HeadContent />
        {/*
         * Theme boot script — must run inline before first paint.
         * Reads the stored preference from localStorage and sets data-theme
         * on <html> so @labs/design's CSS variables resolve to the correct
         * palette immediately. Runs before any React hydration.
         */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `(function(){
  var stored;
  try { stored = localStorage.getItem('labs-theme'); } catch(_) {}
  var html = document.documentElement;
  if (stored === 'light' || stored === 'dark') {
    html.setAttribute('data-theme', stored);
  } else {
    html.removeAttribute('data-theme');
  }
})();`,
          }}
        />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
