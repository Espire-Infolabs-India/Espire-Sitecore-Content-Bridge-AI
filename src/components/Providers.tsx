'use client'

import * as React from 'react'
import { ChakraProvider, extendTheme } from '@chakra-ui/react'

const theme = extendTheme({
  colors: {
    brand: {
      50: '#e3f2f9',
      100: '#c5e4f3',
      200: '#a2d4ec',
      300: '#7ac1e4',
      400: '#47a9da',
      500: '#0088cc',
      600: '#007ab8',
      700: '#006ba1',
      800: '#005885',
      900: '#003f5e',
    },
    danger: {
      50: '#ffe5e9',
      100: '#fbbcc3',
      200: '#f4929c',
      300: '#ed6a76',
      400: '#e8425a',
      500: '#e02424',
      600: '#c71d1d',
      700: '#a31616',
      800: '#7f1010',
      900: '#5b0a0a',
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return <ChakraProvider theme={theme}>{children}</ChakraProvider>
}
