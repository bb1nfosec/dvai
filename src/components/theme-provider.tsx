import React from 'react';

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof import('next-themes').ThemeProvider>) {
  // Simple dark theme wrapper — next-themes not needed for dark-only
  return <>{children}</>;
}
