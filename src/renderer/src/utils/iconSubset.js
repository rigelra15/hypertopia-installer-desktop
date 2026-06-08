import { addCollection } from '@iconify/react'

const iconCollections = [
  {
    prefix: 'bi',
    icons: {
      'headset-vr': {
        body: '<g fill="currentColor"><path d="M8 1.248c1.857 0 3.526.641 4.65 1.794a5 5 0 0 1 2.518 1.09C13.907 1.482 11.295 0 8 0C4.75 0 2.12 1.48.844 4.122a5 5 0 0 1 2.289-1.047C4.236 1.872 5.974 1.248 8 1.248"/><path d="M12 12a4 4 0 0 1-2.786-1.13l-.002-.002a1.6 1.6 0 0 0-.276-.167A2.2 2.2 0 0 0 8 10.5c-.414 0-.729.103-.935.201a1.6 1.6 0 0 0-.277.167l-.002.002A4 4 0 1 1 4 4h8a4 4 0 0 1 0 8"/></g>'
      }
    }
  },
  {
    prefix: 'dashicons',
    width: 20,
    height: 20,
    icons: {
      games: {
        body: '<path fill="currentColor" d="M15.9 5.5C15.3 4.5 14.2 4 13 4H7c-1.2 0-2.3.5-2.9 1.5c-2.3 3.5-2.8 8.8-1.2 9.9s5.2-3.7 7.1-3.7s5.4 4.8 7.1 3.7c1.6-1.1 1.1-6.4-1.2-9.9M8 9H7v1H6V9H5V8h1V7h1v1h1zm5.4.5c0 .5-.4.9-.9.9s-.9-.4-.9-.9s.4-.9.9-.9s.9.4.9.9m1.9-2c0 .5-.4.9-.9.9s-.9-.4-.9-.9s.4-.9.9-.9s.9.4.9.9"/>'
      }
    }
  },
  {
    prefix: 'fa6-solid',
    width: 512,
    height: 512,
    icons: {
      'chevron-down': {
        body: '<path fill="currentColor" d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7L86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"/>'
      }
    }
  },
  {
    prefix: 'heroicons',
    width: 24,
    height: 24,
    icons: {
      'chevron-down': {
        body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="m19.5 8.25l-7.5 7.5l-7.5-7.5"/>'
      }
    }
  },
  {
    prefix: 'line-md',
    width: 24,
    height: 24,
    icons: {
      'alert-twotone': {
        body: '<g stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path fill="currentColor" fill-opacity="0" stroke-dasharray="60" d="M12 3l9 17h-18l9 -17Z"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="60;0"/><animate fill="freeze" attributeName="fill-opacity" begin="1s" dur="0.15s" to=".3"/></path><g fill="none"><path stroke-dasharray="6" stroke-dashoffset="6" d="M12 10v4"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.7s" dur="0.2s" to="0"/></path><path stroke-dasharray="4" stroke-dashoffset="4" d="M12 17v0.01"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.7s" dur="0.2s" to="0"/></path></g></g>'
      },
      'arrow-up-circle': {
        body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path stroke-dasharray="60" d="M21 12c0 4.97 -4.03 9 -9 9c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9c4.97 0 9 4.03 9 9Z"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="60;0"/></path><path stroke-dasharray="12" stroke-dashoffset="12" d="M12 17l0 -9.5"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.7s" dur="0.2s" to="0"/></path><path stroke-dasharray="8" stroke-dashoffset="8" d="M12 7l4 4M12 7l-4 4"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.9s" dur="0.2s" to="0"/></path></g>'
      },
      'chevron-down': {
        body: '<path fill="none" stroke="currentColor" stroke-dasharray="12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 16l-7 -7M12 16l7 -7"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.4s" values="12;0"/></path>'
      },
      'chevron-right': {
        body: '<path fill="none" stroke="currentColor" stroke-dasharray="12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12l-7 -7M16 12l-7 7"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.4s" values="12;0"/></path>'
      },
      'clipboard-list': {
        body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path stroke-dasharray="66" stroke-width="2" d="M12 3h7v18h-14v-18h7Z"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="66;0"/></path><path stroke-dasharray="14" stroke-dashoffset="14" d="M14.5 3.5v3h-5v-3"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.7s" dur="0.2s" to="0"/></path><g stroke-width="2"><path stroke-dasharray="6" stroke-dashoffset="6" d="M9 10h3"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.9s" dur="0.2s" to="0"/></path><g stroke-dasharray="8" stroke-dashoffset="8"><path d="M9 13h5"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1.1s" dur="0.2s" to="0"/></path><path d="M9 16h6"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1.3s" dur="0.2s" to="0"/></path></g></g></g>'
      },
      'cog-filled': {
        body: '<path fill="none" stroke="currentColor" stroke-dasharray="34" stroke-linecap="round" stroke-linejoin="round" stroke-width="5" d="M12 7c2.76 0 5 2.24 5 5c0 2.76 -2.24 5 -5 5c-2.76 0 -5 -2.24 -5 -5c0 -2.76 2.24 -5 5 -5Z"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.4s" values="34;0"/><set fill="freeze" attributeName="opacity" begin="0.4s" to="0"/></path><g fill="currentColor"><path d="M11 13l4.74 -7.5c0.29 0.17 0.57 0.35 0.83 0.55c0 0 2.52 -1.01 2.52 -1.01c0.16 -0.06 0.43 -0.03 0.51 0.13c0 0 2.07 3.58 2.07 3.58c0.1 0.17 0.06 0.45 -0.07 0.57c0 0 -2.17 1.68 -2.17 1.68c0.05 0.33 0.07 0.66 0.07 1Z" opacity="0"><set fill="freeze" attributeName="opacity" begin="0.4s" to="1"/><animate fill="freeze" attributeName="d" begin="0.4s" dur="0.2s" values="M11 13l4.74 -7.5c0.29 0.17 0.57 0.35 0.83 0.55c0 0 0 0 0 0c0.07 0.05 0.14 0.11 0.2 0.17c1.37 1.12 2.32 2.72 2.63 4.53c0.01 0.09 0.02 0.17 0.03 0.25c0 0 0 0 0 0c0.05 0.33 0.07 0.66 0.07 1Z;M11 13l4.74 -7.5c0.29 0.17 0.57 0.35 0.83 0.55c0 0 2.52 -1.01 2.52 -1.01c0.16 -0.06 0.43 -0.03 0.51 0.13c0 0 2.07 3.58 2.07 3.58c0.1 0.17 0.06 0.45 -0.07 0.57c0 0 -2.17 1.68 -2.17 1.68c0.05 0.33 0.07 0.66 0.07 1Z"/></path><path d="M10.63 11.63l8.87 0.35c0 0.34 -0.02 0.67 -0.06 0.99c0 0 2.13 1.68 2.13 1.68c0.13 0.11 0.24 0.36 0.14 0.51c0 0 -2.07 3.58 -2.07 3.58c-0.1 0.17 -0.36 0.28 -0.53 0.22c0 0 -2.54 -1.04 -2.54 -1.04c-0.26 0.21 -0.54 0.39 -0.83 0.56Z" opacity="0"><set fill="freeze" attributeName="opacity" begin="0.4s" to="1"/><animate fill="freeze" attributeName="d" begin="0.4s" dur="0.2s" values="M10.63 11.63l8.87 0.35c0 0.34 -0.02 0.67 -0.06 0.99c0 0 0 0 0 0c-0.01 0.09 -0.03 0.18 -0.05 0.26c-0.28 1.75 -1.2 3.37 -2.61 4.54c-0.07 0.05 -0.14 0.1 -0.2 0.15c0 0 0 0 0 0c-0.26 0.21 -0.54 0.39 -0.83 0.56Z;M10.63 11.63l8.87 0.35c0 0.34 -0.02 0.67 -0.06 0.99c0 0 2.13 1.68 2.13 1.68c0.13 0.11 0.24 0.36 0.14 0.51c0 0 -2.07 3.58 -2.07 3.58c-0.1 0.17 -0.36 0.28 -0.53 0.22c0 0 -2.54 -1.04 -2.54 -1.04c-0.26 0.21 -0.54 0.39 -0.83 0.56Z"/></path><path d="M11.63 10.63l4.13 7.85c-0.29 0.17 -0.59 0.32 -0.89 0.44c0 0 -0.39 2.69 -0.39 2.69c-0.03 0.17 -0.19 0.39 -0.37 0.38c0 0 -4.14 0 -4.14 0c-0.2 0 -0.42 -0.17 -0.46 -0.35c0 0 -0.37 -2.72 -0.37 -2.72c-0.31 -0.12 -0.61 -0.27 -0.9 -0.44Z" opacity="0"><set fill="freeze" attributeName="opacity" begin="0.4s" to="1"/><animate fill="freeze" attributeName="d" begin="0.4s" dur="0.2s" values="M11.63 10.63l4.13 7.85c-0.29 0.17 -0.59 0.32 -0.89 0.44c0 0 0 0 0 0c-0.08 0.04 -0.17 0.07 -0.25 0.09c-1.65 0.63 -3.52 0.65 -5.24 0.01c-0.08 -0.04 -0.16 -0.07 -0.23 -0.1c0 0 0 0 0 0c-0.31 -0.12 -0.61 -0.27 -0.9 -0.44Z;M11.63 10.63l4.13 7.85c-0.29 0.17 -0.59 0.32 -0.89 0.44c0 0 -0.39 2.69 -0.39 2.69c-0.03 0.17 -0.19 0.39 -0.37 0.38c0 0 -4.14 0 -4.14 0c-0.2 0 -0.42 -0.17 -0.46 -0.35c0 0 -0.37 -2.72 -0.37 -2.72c-0.31 -0.12 -0.61 -0.27 -0.9 -0.44Z"/></path><path d="M13 11l-4.74 7.5c-0.29 -0.17 -0.57 -0.35 -0.83 -0.55c0 0 -2.52 1.01 -2.52 1.01c-0.16 0.06 -0.43 0.03 -0.51 -0.13c0 0 -2.07 -3.58 -2.07 -3.58c-0.1 -0.17 -0.06 -0.45 0.07 -0.57c0 0 2.17 -1.68 2.17 -1.68c-0.05 -0.33 -0.07 -0.66 -0.07 -1Z" opacity="0"><set fill="freeze" attributeName="opacity" begin="0.4s" to="1"/><animate fill="freeze" attributeName="d" begin="0.4s" dur="0.2s" values="M13 11l-4.74 7.5c-0.29 -0.17 -0.57 -0.35 -0.83 -0.55c0 0 0 0 0 0c-0.07 -0.05 -0.14 -0.11 -0.2 -0.17c-1.37 -1.12 -2.32 -2.72 -2.63 -4.53c-0.01 -0.09 -0.02 -0.17 -0.03 -0.25c0 0 0 0 0 0c-0.05 -0.33 -0.07 -0.66 -0.07 -1Z;M13 11l-4.74 7.5c-0.29 -0.17 -0.57 -0.35 -0.83 -0.55c0 0 -2.52 1.01 -2.52 1.01c-0.16 0.06 -0.43 0.03 -0.51 -0.13c0 0 -2.07 -3.58 -2.07 -3.58c-0.1 -0.17 -0.06 -0.45 0.07 -0.57c0 0 2.17 -1.68 2.17 -1.68c-0.05 -0.33 -0.07 -0.66 -0.07 -1Z"/></path><path d="M13.37 12.37l-8.87 -0.35c0 -0.34 0.02 -0.67 0.06 -0.99c0 0 -2.13 -1.68 -2.13 -1.68c-0.13 -0.11 -0.24 -0.36 -0.14 -0.51c0 0 2.07 -3.58 2.07 -3.58c0.1 -0.17 0.36 -0.28 0.53 -0.22c0 0 2.54 1.04 2.54 1.04c0.26 -0.21 0.54 -0.39 0.83 -0.56Z" opacity="0"><set fill="freeze" attributeName="opacity" begin="0.4s" to="1"/><animate fill="freeze" attributeName="d" begin="0.4s" dur="0.2s" values="M13.37 12.37l-8.87 -0.35c0 -0.34 0.02 -0.67 0.06 -0.99c0 0 0 0 0 0c0.01 -0.09 0.03 -0.18 0.05 -0.26c0.28 -1.75 1.2 -3.37 2.61 -4.54c0.07 -0.05 0.14 -0.1 0.2 -0.15c0 0 0 0 0 0c0.26 -0.21 0.54 -0.39 0.83 -0.56Z;M13.37 12.37l-8.87 -0.35c0 -0.34 0.02 -0.67 0.06 -0.99c0 0 -2.13 -1.68 -2.13 -1.68c-0.13 -0.11 -0.24 -0.36 -0.14 -0.51c0 0 2.07 -3.58 2.07 -3.58c0.1 -0.17 0.36 -0.28 0.53 -0.22c0 0 2.54 1.04 2.54 1.04c0.26 -0.21 0.54 -0.39 0.83 -0.56Z"/></path><path d="M12.37 13.37l-4.13 -7.85c0.29 -0.17 0.59 -0.32 0.89 -0.44c0 0 0.39 -2.69 0.39 -2.69c0.03 -0.17 0.19 -0.39 0.37 -0.38c0 0 4.14 0 4.14 0c0.2 0 0.42 0.17 0.46 0.35c0 0 0.37 2.72 0.37 2.72c0.31 0.12 0.61 0.27 0.9 0.44Z" opacity="0"><set fill="freeze" attributeName="opacity" begin="0.4s" to="1"/><animate fill="freeze" attributeName="d" begin="0.4s" dur="0.2s" values="M12.37 13.37l-4.13 -7.85c0.29 -0.17 0.59 -0.32 0.89 -0.44c0 0 0 0 0 0c0.08 -0.04 0.17 -0.07 0.25 -0.09c1.65 -0.63 3.52 -0.65 5.24 -0.01c0.08 0.04 0.16 0.07 0.23 0.1c0 0 0 0 0 0c0.31 0.12 0.61 0.27 0.9 0.44Z;M12.37 13.37l-4.13 -7.85c0.29 -0.17 0.59 -0.32 0.89 -0.44c0 0 0.39 -2.69 0.39 -2.69c0.03 -0.17 0.19 -0.39 0.37 -0.38c0 0 4.14 0 4.14 0c0.2 0 0.42 0.17 0.46 0.35c0 0 0.37 2.72 0.37 2.72c0.31 0.12 0.61 0.27 0.9 0.44Z"/></path></g>'
      },
      'confirm-circle': {
        body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path stroke-dasharray="60" d="M3 12c0 -4.97 4.03 -9 9 -9c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9c-4.97 0 -9 -4.03 -9 -9Z"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="60;0"/></path><path stroke-dasharray="14" stroke-dashoffset="14" d="M8 12l3 3l5 -5"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.6s" dur="0.2s" to="0"/></path></g>'
      },
      'download-loop': {
        body: '<g stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path fill="currentColor" fill-opacity="0" stroke-dasharray="20" d="M12 4h2v6h2.5l-4.5 4.5M12 4h-2v6h-2.5l4.5 4.5"><animate attributeName="d" dur="1.5s" keyTimes="0;0.5;1" repeatCount="indefinite" values="M12 4h2v6h2.5l-4.5 4.5M12 4h-2v6h-2.5l4.5 4.5;M12 4h2v3h2.5l-4.5 4.5M12 4h-2v3h-2.5l4.5 4.5;M12 4h2v6h2.5l-4.5 4.5M12 4h-2v6h-2.5l4.5 4.5"/><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.5s" values="20;0"/><animate fill="freeze" attributeName="fill-opacity" begin="0.7s" dur="0.4s" to="1"/></path><path fill="none" stroke-dasharray="14" stroke-dashoffset="14" d="M6 19h12"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.5s" dur="0.2s" to="0"/></path></g>'
      },
      'downloading-loop': {
        body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path stroke-dasharray="32" d="M12 21c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="32;0"/></path><path stroke-dasharray="2 4" stroke-dashoffset="6" d="M12 3c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9" opacity="0"><set fill="freeze" attributeName="opacity" begin="0.45s" to="1"/><animateTransform fill="freeze" attributeName="transform" begin="0.45s" dur="0.6s" type="rotate" values="-180 12 12;0 12 12"/><animate attributeName="stroke-dashoffset" begin="0.85s" dur="0.6s" repeatCount="indefinite" to="0"/></path><path stroke-dasharray="10" stroke-dashoffset="10" d="M12 8v7.5"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.85s" dur="0.2s" to="0"/></path><path stroke-dasharray="8" stroke-dashoffset="8" d="M12 15.5l3.5 -3.5M12 15.5l-3.5 -3.5"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1.05s" dur="0.2s" to="0"/></path></g>'
      },
      'folder-filled': {
        body: '<g stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path fill="currentColor" fill-opacity="0" stroke-dasharray="62" d="M12 7h8c0.55 0 1 0.45 1 1v10c0 0.55 -0.45 1 -1 1h-16c-0.55 0 -1 -0.45 -1 -1v-11Z"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.6s" values="62;0"/><animate fill="freeze" attributeName="fill-opacity" begin="0.8s" dur="0.4s" to="1"/></path><path fill="none" d="M12 7h-9v-1c0 -0.55 0.45 -1 1 -1h6Z" opacity="0"><set fill="freeze" attributeName="opacity" begin="0.6s" to="1"/><animate fill="freeze" attributeName="d" begin="0.6s" dur="0.2s" values="M12 7h-9v0c0 0 0.45 0 1 0h6Z;M12 7h-9v-1c0 -0.55 0.45 -1 1 -1h6Z"/></path></g>'
      },
      'loading-loop': {
        body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3c4.97 0 9 4.03 9 9"><animateTransform attributeName="transform" dur="1.5s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/></path>'
      },
      'rotate-270': {
        body: '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path stroke-dasharray="34" d="M12 6c3.31 0 6 2.69 6 6c0 3.31 -2.69 6 -6 6c-3.31 0 -6 -2.69 -6 -6v-2.5"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.4s" values="34;0"/></path><path stroke-dasharray="8" stroke-dashoffset="8" d="M6 9l-3 3M6 9l3 3"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.4s" dur="0.2s" to="0"/></path></g>'
      }
    }
  },
  {
    prefix: 'material-symbols',
    width: 24,
    height: 24,
    icons: {
      check: {
        body: '<path fill="currentColor" d="m9.55 18l-5.7-5.7l1.425-1.425L9.55 15.15l9.175-9.175L20.15 7.4z"/>'
      },
      close: {
        body: '<path fill="currentColor" d="M6.4 19L5 17.6l5.6-5.6L5 6.4L6.4 5l5.6 5.6L17.6 5L19 6.4L13.4 12l5.6 5.6l-1.4 1.4l-5.6-5.6z"/>'
      },
      'close-fullscreen-rounded': {
        body: '<path fill="currentColor" d="m10 15.4l-5.9 5.9q-.275.275-.7.275t-.7-.275t-.275-.7t.275-.7L8.6 14H5q-.425 0-.712-.288T4 13t.288-.712T5 12h6q.425 0 .713.288T12 13v6q0 .425-.288.713T11 20t-.712-.288T10 19zm5.4-5.4H19q.425 0 .713.288T20 11t-.288.713T19 12h-6q-.425 0-.712-.288T12 11V5q0-.425.288-.712T13 4t.713.288T14 5v3.6l5.9-5.9q.275-.275.7-.275t.7.275t.275.7t-.275.7z"/>'
      },
      'delete-outline-rounded': {
        body: '<path fill="currentColor" d="M7 21q-.825 0-1.412-.587T5 19V6q-.425 0-.712-.288T4 5t.288-.712T5 4h4q0-.425.288-.712T10 3h4q.425 0 .713.288T15 4h4q.425 0 .713.288T20 5t-.288.713T19 6v13q0 .825-.587 1.413T17 21zM17 6H7v13h10zm-6.287 10.713Q11 16.425 11 16V9q0-.425-.288-.712T10 8t-.712.288T9 9v7q0 .425.288.713T10 17t.713-.288m4 0Q15 16.426 15 16V9q0-.425-.288-.712T14 8t-.712.288T13 9v7q0 .425.288.713T14 17t.713-.288M7 6v13z"/>'
      },
      'edit-outline-rounded': {
        body: '<path fill="currentColor" d="M5 19h1.425L16.2 9.225L14.775 7.8L5 17.575zm-1 2q-.425 0-.712-.288T3 20v-2.425q0-.4.15-.763t.425-.637L16.2 3.575q.3-.275.663-.425t.762-.15t.775.15t.65.45L20.425 5q.3.275.437.65T21 6.4q0 .4-.138.763t-.437.662l-12.6 12.6q-.275.275-.638.425t-.762.15zM19 6.4L17.6 5zm-3.525 2.125l-.7-.725L16.2 9.225z"/>'
      },
      'error-outline': {
        body: '<path fill="currentColor" d="M12.713 16.713Q13 16.425 13 16t-.288-.712T12 15t-.712.288T11 16t.288.713T12 17t.713-.288M11 13h2V7h-2zm1 9q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20m0-8"/>'
      },
      gamepad: {
        body: '<path fill="currentColor" d="m12 10.5l-3-3V2h6v5.5zm4.5 4.5l-3-3l3-3H22v6zM2 15V9h5.5l3 3l-3 3zm7 7v-5.5l3-3l3 3V22z"/>'
      },
      inbox: {
        body: '<path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm8.725-5.55Q14.5 14.9 14.8 14H19V5H5v9h4.2q.3.9 1.075 1.45T12 16t1.725-.55"/>'
      },
      info: {
        body: '<path fill="currentColor" d="M11 17h2v-6h-2zm1.713-8.287Q13 8.425 13 8t-.288-.712T12 7t-.712.288T11 8t.288.713T12 9t.713-.288M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22"/>'
      },
      person: {
        body: '<path fill="currentColor" d="M9.175 10.825Q8 9.65 8 8t1.175-2.825T12 4t2.825 1.175T16 8t-1.175 2.825T12 12t-2.825-1.175M4 20v-2.8q0-.85.438-1.562T5.6 14.55q1.55-.775 3.15-1.162T12 13t3.25.388t3.15 1.162q.725.375 1.163 1.088T20 17.2V20z"/>'
      },
      refresh: {
        body: '<path fill="currentColor" d="M12 20q-3.35 0-5.675-2.325T4 12t2.325-5.675T12 4q1.725 0 3.3.712T18 6.75V4h2v7h-7V9h4.2q-.8-1.4-2.187-2.2T12 6Q9.5 6 7.75 7.75T6 12t1.75 4.25T12 18q1.925 0 3.475-1.1T17.65 14h2.1q-.7 2.65-2.85 4.325T12 20"/>'
      },
      schedule: {
        body: '<path fill="currentColor" d="m15.3 16.7l1.4-1.4l-3.7-3.7V7h-2v5.4zM12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22"/>'
      },
      search: {
        body: '<path fill="currentColor" d="m19.6 21l-6.3-6.3q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l6.3 6.3zM9.5 14q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5T6.313 6.313T5 9.5t1.313 3.188T9.5 14"/>'
      },
      send: {
        body: '<path fill="currentColor" d="M3 20v-6l8-2l-8-2V4l19 8z"/>'
      },
      'system-update-alt-rounded': {
        body: '<path fill="currentColor" d="M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h4q.425 0 .713.288T9 5t-.288.713T8 6H4v12h16V6h-4q-.425 0-.712-.288T15 5t.288-.712T16 4h4q.825 0 1.413.588T22 6v12q0 .825-.587 1.413T20 20zm7-8.4V5q0-.425.288-.712T12 4t.713.288T13 5v6.6l1.9-1.9q.275-.275.7-.275t.7.275t.275.7t-.275.7l-3.6 3.6q-.3.3-.7.3t-.7-.3l-3.6-3.6q-.275-.275-.275-.7t.275-.7t.7-.275t.7.275z"/>'
      },
      tag: {
        body: '<path fill="currentColor" d="m6 20l1-4H3l.5-2h4l1-4h-4L5 8h4l1-4h2l-1 4h4l1-4h2l-1 4h4l-.5 2h-4l-1 4h4l-.5 2h-4l-1 4h-2l1-4H9l-1 4zm3.5-6h4l1-4h-4z"/>'
      }
    }
  },
  {
    prefix: 'mdi',
    width: 24,
    height: 24,
    icons: {
      account: {
        body: '<path fill="currentColor" d="M12 4a4 4 0 0 1 4 4a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4m0 10c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4"/>'
      },
      'account-alert': {
        body: '<path fill="currentColor" d="M10 4a4 4 0 0 1 4 4a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4m0 10c4.42 0 8 1.79 8 4v2H2v-2c0-2.21 3.58-4 8-4m10-2V7h2v6h-2m0 4v-2h2v2z"/>'
      },
      'account-circle': {
        body: '<path fill="currentColor" d="M12 19.2c-2.5 0-4.71-1.28-6-3.2c.03-2 4-3.1 6-3.1s5.97 1.1 6 3.1a7.23 7.23 0 0 1-6 3.2M12 5a3 3 0 0 1 3 3a3 3 0 0 1-3 3a3 3 0 0 1-3-3a3 3 0 0 1 3-3m0-3A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10c0-5.53-4.5-10-10-10"/>'
      },
      'account-group': {
        body: '<path fill="currentColor" d="M12 5.5A3.5 3.5 0 0 1 15.5 9a3.5 3.5 0 0 1-3.5 3.5A3.5 3.5 0 0 1 8.5 9A3.5 3.5 0 0 1 12 5.5M5 8c.56 0 1.08.15 1.53.42c-.15 1.43.27 2.85 1.13 3.96C7.16 13.34 6.16 14 5 14a3 3 0 0 1-3-3a3 3 0 0 1 3-3m14 0a3 3 0 0 1 3 3a3 3 0 0 1-3 3c-1.16 0-2.16-.66-2.66-1.62a5.54 5.54 0 0 0 1.13-3.96c.45-.27.97-.42 1.53-.42M5.5 18.25c0-2.07 2.91-3.75 6.5-3.75s6.5 1.68 6.5 3.75V20h-13zM0 20v-1.5c0-1.39 1.89-2.56 4.45-2.9c-.59.68-.95 1.62-.95 2.65V20zm24 0h-3.5v-1.75c0-1.03-.36-1.97-.95-2.65c2.56.34 4.45 1.51 4.45 2.9z"/>'
      },
      alert: {
        body: '<path fill="currentColor" d="M13 14h-2V9h2m0 9h-2v-2h2M1 21h22L12 2z"/>'
      },
      'alert-circle': {
        body: '<path fill="currentColor" d="M13 13h-2V7h2m0 10h-2v-2h2M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2"/>'
      },
      'alert-circle-outline': {
        body: '<path fill="currentColor" d="M11 15h2v2h-2zm0-8h2v6h-2zm1-5C6.47 2 2 6.5 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2m0 18a8 8 0 0 1-8-8a8 8 0 0 1 8-8a8 8 0 0 1 8 8a8 8 0 0 1-8 8"/>'
      },
      android: {
        body: '<path fill="currentColor" d="M16.61 15.15c-.46 0-.84-.37-.84-.83s.38-.82.84-.82s.84.36.84.82s-.38.83-.84.83m-9.2 0c-.46 0-.84-.37-.84-.83s.38-.82.84-.82s.83.36.83.82s-.37.83-.83.83m9.5-5.01l1.67-2.88c.09-.17.03-.38-.13-.47c-.17-.1-.38-.04-.45.13l-1.71 2.91A10.15 10.15 0 0 0 12 8.91c-1.53 0-3 .33-4.27.91L6.04 6.91a.334.334 0 0 0-.47-.13c-.17.09-.22.3-.13.47l1.66 2.88C4.25 11.69 2.29 14.58 2 18h20c-.28-3.41-2.23-6.3-5.09-7.86"/>'
      },
      apple: {
        body: '<path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47c-1.34.03-1.77-.79-3.29-.79c-1.53 0-2 .77-3.27.82c-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51c1.28-.02 2.5.87 3.29.87c.78 0 2.26-1.07 3.81-.91c.65.03 2.47.26 3.64 1.98c-.09.06-2.17 1.28-2.15 3.81c.03 3.02 2.65 4.03 2.68 4.04c-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5c.13 1.17-.34 2.35-1.04 3.19c-.69.85-1.83 1.51-2.95 1.42c-.15-1.15.41-2.35 1.05-3.11"/>'
      },
      application: {
        body: '<path fill="currentColor" d="M21 2H3c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 5H3V4h18z"/>'
      },
      'application-outline': {
        body: '<path fill="currentColor" d="M21 2H3c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2m0 18H3V6h18z"/>'
      },
      apps: {
        body: '<path fill="currentColor" d="M16 20h4v-4h-4m0-2h4v-4h-4m-6-2h4V4h-4m6 4h4V4h-4m-6 10h4v-4h-4m-6 4h4v-4H4m0 10h4v-4H4m6 4h4v-4h-4M4 8h4V4H4z"/>'
      },
      'arrow-down-circle-outline': {
        body: '<path fill="currentColor" d="M11 6h2v8l3.5-3.5l1.42 1.42L12 17.84l-5.92-5.92L7.5 10.5L11 14zm1 16A10 10 0 0 1 2 12A10 10 0 0 1 12 2a10 10 0 0 1 10 10a10 10 0 0 1-10 10m0-2a8 8 0 0 0 8-8a8 8 0 0 0-8-8a8 8 0 0 0-8 8a8 8 0 0 0 8 8"/>'
      },
      'arrow-left': {
        body: '<path fill="currentColor" d="M20 11v2H8l5.5 5.5l-1.42 1.42L4.16 12l7.92-7.92L13.5 5.5L8 11z"/>'
      },
      'arrow-right': {
        body: '<path fill="currentColor" d="M4 11v2h12l-5.5 5.5l1.42 1.42L19.84 12l-7.92-7.92L10.5 5.5L16 11z"/>'
      },
      'book-open-page-variant': {
        body: '<path fill="currentColor" d="m19 2l-5 4.5v11l5-4.5zM6.5 5C4.55 5 2.45 5.4 1 6.5v14.66c0 .25.25.5.5.5c.1 0 .15-.07.25-.07c1.35-.65 3.3-1.09 4.75-1.09c1.95 0 4.05.4 5.5 1.5c1.35-.85 3.8-1.5 5.5-1.5c1.65 0 3.35.31 4.75 1.06c.1.05.15.03.25.03c.25 0 .5-.25.5-.5V6.5c-.6-.45-1.25-.75-2-1V19c-1.1-.35-2.3-.5-3.5-.5c-1.7 0-4.15.65-5.5 1.5V6.5C10.55 5.4 8.45 5 6.5 5"/>'
      },
      broom: {
        body: '<path fill="currentColor" d="m19.36 2.72l1.42 1.42l-5.72 5.71c1.07 1.54 1.22 3.39.32 4.59L9.06 8.12c1.2-.9 3.05-.75 4.59.32zM5.93 17.57c-2.01-2.01-3.24-4.41-3.58-6.65l4.88-2.09l7.44 7.44l-2.09 4.88c-2.24-.34-4.64-1.57-6.65-3.58"/>'
      },
      'cellphone-arrow-down': {
        body: '<path fill="currentColor" d="M17 1H7a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2m0 18H7V5h10zm-1-6h-3V8h-2v5H8l4 4z"/>'
      },
      check: {
        body: '<path fill="currentColor" d="M21 7L9 19l-5.5-5.5l1.41-1.41L9 16.17L19.59 5.59z"/>'
      },
      'check-circle': {
        body: '<path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10s10-4.5 10-10S17.5 2 12 2m-2 15l-5-5l1.41-1.41L10 14.17l7.59-7.59L19 8z"/>'
      },
      'check-circle-outline': {
        body: '<path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10s10-4.5 10-10S17.5 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8m4.59-12.42L10 14.17l-2.59-2.58L6 13l4 4l8-8z"/>'
      },
      'chevron-down': {
        body: '<path fill="currentColor" d="M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6l-6-6z"/>'
      },
      'chevron-left': {
        body: '<path fill="currentColor" d="M15.41 16.58L10.83 12l4.58-4.59L14 6l-6 6l6 6z"/>'
      },
      'chevron-right': {
        body: '<path fill="currentColor" d="M8.59 16.58L13.17 12L8.59 7.41L10 6l6 6l-6 6z"/>'
      },
      'chevron-up': {
        body: '<path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6l-6 6z"/>'
      },
      'clipboard-text': {
        body: '<path fill="currentColor" d="M17 9H7V7h10m0 6H7v-2h10m-3 6H7v-2h7M12 3a1 1 0 0 1 1 1a1 1 0 0 1-1 1a1 1 0 0 1-1-1a1 1 0 0 1 1-1m7 0h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2"/>'
      },
      'clock-outline': {
        body: '<path fill="currentColor" d="M12 20a8 8 0 0 0 8-8a8 8 0 0 0-8-8a8 8 0 0 0-8 8a8 8 0 0 0 8 8m0-18a10 10 0 0 1 10 10a10 10 0 0 1-10 10C6.47 22 2 17.5 2 12A10 10 0 0 1 12 2m.5 5v5.25l4.5 2.67l-.75 1.23L11 13V7z"/>'
      },
      close: {
        body: '<path fill="currentColor" d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"/>'
      },
      'close-circle': {
        body: '<path fill="currentColor" d="M12 2c5.53 0 10 4.47 10 10s-4.47 10-10 10S2 17.53 2 12S6.47 2 12 2m3.59 5L12 10.59L8.41 7L7 8.41L10.59 12L7 15.59L8.41 17L12 13.41L15.59 17L17 15.59L13.41 12L17 8.41z"/>'
      },
      'cloud-check-outline': {
        body: '<path fill="currentColor" d="M13 19c0 .34.04.67.09 1H6.5c-1.5 0-2.81-.5-3.89-1.57C1.54 17.38 1 16.09 1 14.58q0-1.95 1.17-3.48C3.34 9.57 4 9.43 5.25 9.15c.42-1.53 1.25-2.77 2.5-3.72S10.42 4 12 4c1.95 0 3.6.68 4.96 2.04S19 9.05 19 11c1.15.13 2.1.63 2.86 1.5c.51.57.84 1.21 1 1.92A5.9 5.9 0 0 0 19 13h-2v-2c0-1.38-.5-2.56-1.46-3.54C14.56 6.5 13.38 6 12 6s-2.56.5-3.54 1.46C7.5 8.44 7 9.62 7 11h-.5c-.97 0-1.79.34-2.47 1.03c-.69.68-1.03 1.5-1.03 2.47s.34 1.79 1.03 2.5c.68.66 1.5 1 2.47 1h6.59c-.05.33-.09.66-.09 1m4.75.43l-1.59-1.59L15 19l2.75 3l4.75-4.75l-1.16-1.41z"/>'
      },
      'cloud-download': {
        body: '<path fill="currentColor" d="M6.5 20q-2.28 0-3.89-1.57Q1 16.85 1 14.58q0-1.95 1.17-3.48q1.18-1.53 3.08-1.95q.58-2.02 2.14-3.4Q8.95 4.38 11 4.08v8.07L9.4 10.6L8 12l4 4l4-4l-1.4-1.4l-1.6 1.55V4.08q2.58.35 4.29 2.31T19 11q1.73.2 2.86 1.5q1.14 1.28 1.14 3q0 1.88-1.31 3.19T18.5 20Z"/>'
      },
      'cloud-off-outline': {
        body: '<path fill="currentColor" d="M19.8 22.6L17.15 20H6.5q-2.3 0-3.9-1.6T1 14.5q0-1.92 1.19-3.42q1.19-1.51 3.06-1.93q.08-.2.15-.39q.1-.19.15-.41L1.4 4.2l1.4-1.4l18.4 18.4M6.5 18h8.65L7.1 9.95q-.05.28-.07.55q-.03.23-.03.5h-.5q-1.45 0-2.47 1.03Q3 13.05 3 14.5T4.03 17q1.02 1 2.47 1m15.1.75l-1.45-1.4q.43-.35.64-.81T21 15.5q0-1.05-.73-1.77q-.72-.73-1.77-.73H17v-2q0-2.07-1.46-3.54Q14.08 6 12 6q-.67 0-1.3.16q-.63.17-1.2.52L8.05 5.23q.88-.6 1.86-.92Q10.9 4 12 4q2.93 0 4.96 2.04Q19 8.07 19 11q1.73.2 2.86 1.5q1.14 1.28 1.14 3q0 1-.37 1.81q-.38.84-1.03 1.44m-6.77-6.72"/>'
      },
      'cog-outline': {
        body: '<path fill="currentColor" d="M12 8a4 4 0 0 1 4 4a4 4 0 0 1-4 4a4 4 0 0 1-4-4a4 4 0 0 1 4-4m0 2a2 2 0 0 0-2 2a2 2 0 0 0 2 2a2 2 0 0 0 2-2a2 2 0 0 0-2-2m-2 12c-.25 0-.46-.18-.5-.42l-.37-2.65c-.63-.25-1.17-.59-1.69-.99l-2.49 1.01c-.22.08-.49 0-.61-.22l-2-3.46a.493.493 0 0 1 .12-.64l2.11-1.66L4.5 12l.07-1l-2.11-1.63a.493.493 0 0 1-.12-.64l2-3.46c.12-.22.39-.31.61-.22l2.49 1c.52-.39 1.06-.73 1.69-.98l.37-2.65c.04-.24.25-.42.5-.42h4c.25 0 .46.18.5.42l.37 2.65c.63.25 1.17.59 1.69.98l2.49-1c.22-.09.49 0 .61.22l2 3.46c.13.22.07.49-.12.64L19.43 11l.07 1l-.07 1l2.11 1.63c.19.15.25.42.12.64l-2 3.46c-.12.22-.39.31-.61.22l-2.49-1c-.52.39-1.06.73-1.69.98l-.37 2.65c-.04.24-.25.42-.5.42zm1.25-18l-.37 2.61c-1.2.25-2.26.89-3.03 1.78L5.44 7.35l-.75 1.3L6.8 10.2a5.55 5.55 0 0 0 0 3.6l-2.12 1.56l.75 1.3l2.43-1.04c.77.88 1.82 1.52 3.01 1.76l.37 2.62h1.52l.37-2.61c1.19-.25 2.24-.89 3.01-1.77l2.43 1.04l.75-1.3l-2.12-1.55c.4-1.17.4-2.44 0-3.61l2.11-1.55l-.75-1.3l-2.41 1.04a5.42 5.42 0 0 0-3.03-1.77L12.75 4z"/>'
      },
      console: {
        body: '<path fill="currentColor" d="M20 19V7H4v12zm0-16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm-7 14v-2h5v2zm-3.42-4L5.57 9H8.4l3.3 3.3c.39.39.39 1.03 0 1.42L8.42 17H5.59z"/>'
      },
      'console-line': {
        body: '<path fill="currentColor" d="M13 19v-3h8v3zm-4.5-6L2.47 7h4.24l4.96 4.95c.58.59.58 1.55 0 2.12L6.74 19H2.5z"/>'
      },
      'content-copy': {
        body: '<path fill="currentColor" d="M19 21H8V7h11m0-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2m-3-4H4a2 2 0 0 0-2 2v14h2V3h12z"/>'
      },
      'content-save': {
        body: '<path fill="currentColor" d="M15 9H5V5h10m-3 14a3 3 0 0 1-3-3a3 3 0 0 1 3-3a3 3 0 0 1 3 3a3 3 0 0 1-3 3m5-16H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7z"/>'
      },
      'controller-classic': {
        body: '<path fill="currentColor" d="M6 7h12a5 5 0 0 1 5 5a5 5 0 0 1-5 5c-1.64 0-3.09-.79-4-2h-4c-.91 1.21-2.36 2-4 2a5 5 0 0 1-5-5a5 5 0 0 1 5-5m13.75 2.5a1.25 1.25 0 0 0-1.25 1.25A1.25 1.25 0 0 0 19.75 12A1.25 1.25 0 0 0 21 10.75a1.25 1.25 0 0 0-1.25-1.25m-2.5 2.5A1.25 1.25 0 0 0 16 13.25a1.25 1.25 0 0 0 1.25 1.25a1.25 1.25 0 0 0 1.25-1.25A1.25 1.25 0 0 0 17.25 12M5 9v2H3v2h2v2h2v-2h2v-2H7V9z"/>'
      },
      delete: {
        body: '<path fill="currentColor" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6z"/>'
      },
      'delete-alert': {
        body: '<path fill="currentColor" d="M17 4v2H3V4h3.5l1-1h5l1 1zM4 19V7h12v12c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2m15-4h2v2h-2zm0-8h2v6h-2z"/>'
      },
      'delete-outline': {
        body: '<path fill="currentColor" d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zM8 9h8v10H8zm7.5-5l-1-1h-5l-1 1H5v2h14V4z"/>'
      },
      'delete-sweep': {
        body: '<path fill="currentColor" d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V8H3zM14 5h-3l-1-1H6L5 5H2v2h12z"/>'
      },
      download: {
        body: '<path fill="currentColor" d="M5 20h14v-2H5m14-9h-4V3H9v6H5l7 7z"/>'
      },
      'download-circle-outline': {
        body: '<path fill="currentColor" d="M8 17v-2h8v2zm8-7l-4 4l-4-4h2.5V6h3v4zm-4-8c5.5 0 10 4.5 10 10s-4.5 10-10 10S2 17.5 2 12S6.5 2 12 2m0 2c-4.42 0-8 3.58-8 8s3.58 8 8 8s8-3.58 8-8s-3.58-8-8-8"/>'
      },
      'email-outline': {
        body: '<path fill="currentColor" d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2zm-2 0l-8 5l-8-5zm0 12H4V8l8 5l8-5z"/>'
      },
      'eye-outline': {
        body: '<path fill="currentColor" d="M12 9a3 3 0 0 1 3 3a3 3 0 0 1-3 3a3 3 0 0 1-3-3a3 3 0 0 1 3-3m0-4.5c5 0 9.27 3.11 11 7.5c-1.73 4.39-6 7.5-11 7.5S2.73 16.39 1 12c1.73-4.39 6-7.5 11-7.5M3.18 12a9.821 9.821 0 0 0 17.64 0a9.821 9.821 0 0 0-17.64 0"/>'
      },
      'file-document-outline': {
        body: '<path fill="currentColor" d="M6 2a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm0 2h7v5h5v11H6zm2 8v2h8v-2zm0 4v2h5v-2z"/>'
      },
      'file-download-outline': {
        body: '<path fill="currentColor" d="m14 2l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm4 18V9h-5V4H6v16zm-6-1l-4-4h2.5v-3h3v3H16z"/>'
      },
      'file-multiple-outline': {
        body: '<path fill="currentColor" d="M16 0H8C6.9 0 6 .9 6 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V6zm4 18H8V2h7v5h5zM4 4v18h16v2H4c-1.1 0-2-.9-2-2V4z"/>'
      },
      'file-remove': {
        body: '<path fill="currentColor" d="M21.12 22.54L19 20.41l-2.12 2.13l-1.41-1.42L17.59 19l-2.12-2.12l1.41-1.41L19 17.59l2.12-2.12l1.42 1.41L20.41 19l2.13 2.12zM14 2H6c-1.11 0-2 .89-2 2v16c0 1.11.89 2 2 2h7.81c-.53-.91-.81-1.95-.81-3c0-3.31 2.69-6 6-6c.34 0 .67.03 1 .08V8zm-1 7V3.5L18.5 9z"/>'
      },
      'file-search-outline': {
        body: '<path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h7c-.41-.25-.8-.56-1.14-.9c-.33-.33-.61-.7-.86-1.1H6V4h7v5h5v1.18c.71.16 1.39.43 2 .82V8zm6.31 16.9c1.33-2.11.69-4.9-1.4-6.22c-2.11-1.33-4.91-.68-6.22 1.4c-1.34 2.11-.69 4.89 1.4 6.22c1.46.93 3.32.93 4.79.02L22 23.39L23.39 22zm-3.81.1a2.5 2.5 0 0 1-2.5-2.5a2.5 2.5 0 0 1 2.5-2.5a2.5 2.5 0 0 1 2.5 2.5a2.5 2.5 0 0 1-2.5 2.5"/>'
      },
      'file-send': {
        body: '<path fill="currentColor" d="M14 2H6c-1.11 0-2 .89-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm-1.46 17.37v-2h-4v-1.99h4v-2l3 3zM13 9V3.5L18.5 9z"/>'
      },
      'file-tree': {
        body: '<path fill="currentColor" d="M3 3h6v4H3zm12 7h6v4h-6zm0 7h6v4h-6zm-2-4H7v5h6v2H5V9h2v2h6z"/>'
      },
      'folder-download': {
        body: '<path fill="currentColor" d="M20 6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6c0-1.11.89-2 2-2h6l2 2zm-.75 7H16V9h-2v4h-3.25L15 17.25"/>'
      },
      'folder-download-outline': {
        body: '<path fill="currentColor" d="M20 18H4V8h16m0-2h-8l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2m-6 3h2v4h3l-4 4l-4-4h3Z"/>'
      },
      'folder-edit-outline': {
        body: '<path fill="currentColor" d="M4 18h8.13L11 19.13V20H4a2 2 0 0 1-2-2V6c0-1.11.89-2 2-2h6l2 2h8a2 2 0 0 1 2 2v2.15c-.26-.09-.54-.15-.83-.15c-.42 0-.81.11-1.17.3V8H4zm18.85-4.53l-1.32-1.32c-.2-.2-.53-.2-.72 0l-.98.98l2.04 2.04l.98-.98c.2-.19.2-.52 0-.72M13 19.96V22h2.04l6.13-6.12l-2.04-2.05z"/>'
      },
      'folder-information': {
        body: '<path fill="currentColor" d="M21 11.1V8c0-1.1-.9-2-2-2h-8L9 4H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7.3c1.3 1.9 3.5 3 5.7 3c3.9 0 7-3.1 7-7c0-1.8-.7-3.6-2-4.9M16 21c-2.8 0-5-2.2-5-5s2.2-5 5-5s5 2.2 5 5s-2.2 5-5 5m1-1h-2v-5h2zm0-6h-2v-2h2z"/>'
      },
      'folder-multiple': {
        body: '<path fill="currentColor" d="M22 4h-8l-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2M2 6H0v14a2 2 0 0 0 2 2h18v-2H2z"/>'
      },
      'folder-off-outline': {
        body: '<path fill="currentColor" d="M2.39 1.73L1.11 3l1.53 1.53C2.25 4.9 2 5.42 2 6v12a2 2 0 0 0 2 2h14.11l2.73 2.73l1.27-1.27zM4 18V8h2.11l10 10zm7.2-10l-4-4H10l2 2h8a2 2 0 0 1 2 2v10c0 .24-.04.47-.12.68L20 16.8V8z"/>'
      },
      'folder-open': {
        body: '<path fill="currentColor" d="M19 20H4a2 2 0 0 1-2-2V6c0-1.11.89-2 2-2h6l2 2h7a2 2 0 0 1 2 2H4v10l2.14-8h17.07l-2.28 8.5c-.23.87-1.01 1.5-1.93 1.5"/>'
      },
      'folder-open-outline': {
        body: '<path fill="currentColor" d="M6.1 10L4 18V8h17a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h15c.9 0 1.7-.6 1.9-1.5l2.3-8.5zM19 18H6l1.6-6h13z"/>'
      },
      'folder-outline': {
        body: '<path fill="currentColor" d="M20 18H4V8h16m0-2h-8l-2-2H4c-1.11 0-2 .89-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2"/>'
      },
      'folder-search': {
        body: '<path fill="currentColor" d="M16.5 12c2.5 0 4.5 2 4.5 4.5c0 .88-.25 1.71-.69 2.4l3.08 3.1L22 23.39l-3.12-3.07c-.69.43-1.51.68-2.38.68c-2.5 0-4.5-2-4.5-4.5s2-4.5 4.5-4.5m0 2a2.5 2.5 0 0 0-2.5 2.5a2.5 2.5 0 0 0 2.5 2.5a2.5 2.5 0 0 0 2.5-2.5a2.5 2.5 0 0 0-2.5-2.5M9 4l2 2h8a2 2 0 0 1 2 2v3.81A6.48 6.48 0 0 0 16.5 10a6.5 6.5 0 0 0-6.5 6.5c0 1.29.37 2.5 1 3.5H3a2 2 0 0 1-2-2V6c0-1.11.89-2 2-2z"/>'
      },
      'folder-zip': {
        body: '<path fill="currentColor" d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2m-2 6h-2v2h2v2h-2v2h-2v-2h2v-2h-2v-2h2v-2h-2V8h2v2h2z"/>'
      },
      'folder-zip-outline': {
        body: '<path fill="currentColor" d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2m0 12h-4v-2h-2v2H4V8h10v2h2V8h4zm-4-6v-2h2v2zm-2 0h2v2h-2zm4 4h-2v-2h2z"/>'
      },
      'format-list-numbered': {
        body: '<path fill="currentColor" d="M7 13v-2h14v2zm0 6v-2h14v2zM7 7V5h14v2zM3 8V5H2V4h2v4zm-1 9v-1h3v4H2v-1h2v-.5H3v-1h1V17zm2.25-7a.75.75 0 0 1 .75.75c0 .2-.08.39-.21.52L3.12 13H5v1H2v-.92L4 11H2v-1z"/>'
      },
      'gamepad-square': {
        body: '<path fill="currentColor" d="M21 6H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2m-10 7H8v3H6v-3H3v-2h3V8h2v3h3m4.5 4a1.5 1.5 0 0 1-1.5-1.5a1.5 1.5 0 0 1 1.5-1.5a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5m4-3a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 19.5 9a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5"/>'
      },
      'gamepad-variant': {
        body: '<path fill="currentColor" d="M7 6h10a6 6 0 0 1 6 6a6 6 0 0 1-6 6c-1.78 0-3.37-.77-4.47-2h-1.06c-1.1 1.23-2.69 2-4.47 2a6 6 0 0 1-6-6a6 6 0 0 1 6-6M6 9v2H4v2h2v2h2v-2h2v-2H8V9zm9.5 3a1.5 1.5 0 0 0-1.5 1.5a1.5 1.5 0 0 0 1.5 1.5a1.5 1.5 0 0 0 1.5-1.5a1.5 1.5 0 0 0-1.5-1.5m3-3a1.5 1.5 0 0 0-1.5 1.5a1.5 1.5 0 0 0 1.5 1.5a1.5 1.5 0 0 0 1.5-1.5A1.5 1.5 0 0 0 18.5 9"/>'
      },
      'gamepad-variant-outline': {
        body: '<path fill="currentColor" d="M6 9h2v2h2v2H8v2H6v-2H4v-2h2zm12.5 0a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 18.5 9m-3 3a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5a1.5 1.5 0 0 1-1.5-1.5a1.5 1.5 0 0 1 1.5-1.5M17 5a7 7 0 0 1 7 7a7 7 0 0 1-7 7c-1.96 0-3.73-.8-5-2.1A6.96 6.96 0 0 1 7 19a7 7 0 0 1-7-7a7 7 0 0 1 7-7zM7 7a5 5 0 0 0-5 5a5 5 0 0 0 5 5c1.64 0 3.09-.79 4-2h2c.91 1.21 2.36 2 4 2a5 5 0 0 0 5-5a5 5 0 0 0-5-5z"/>'
      },
      'hand-wave': {
        body: '<path fill="currentColor" d="M23 17c0 3.31-2.69 6-6 6v-1.5c2.5 0 4.5-2 4.5-4.5zM1 7c0-3.31 2.69-6 6-6v1.5c-2.5 0-4.5 2-4.5 4.5zm7-2.68l-4.59 4.6c-3.22 3.22-3.22 8.45 0 11.67s8.45 3.22 11.67 0l7.07-7.09c.49-.47.49-1.26 0-1.75a1.25 1.25 0 0 0-1.77 0l-4.42 4.42l-.71-.71l6.54-6.54c.49-.49.49-1.28 0-1.77s-1.29-.49-1.79 0L14.19 13l-.69-.73l6.87-6.89c.49-.49.49-1.28 0-1.77s-1.28-.49-1.77 0l-6.89 6.89l-.71-.7l5.5-5.48c.5-.49.5-1.28 0-1.77s-1.28-.49-1.77 0l-7.62 7.62a4 4 0 0 1-.33 5.28l-.71-.71a3 3 0 0 0 0-4.24l-.35-.35l4.07-4.07c.49-.49.49-1.28 0-1.77c-.5-.48-1.29-.48-1.79.01"/>'
      },
      harddisk: {
        body: '<path fill="currentColor" d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2m6 2a6 6 0 0 0-6 6c0 3.31 2.69 6 6.1 6l-.88-2.23a1.01 1.01 0 0 1 .37-1.37l.86-.5a1.01 1.01 0 0 1 1.37.37l1.92 2.42A5.98 5.98 0 0 0 18 10a6 6 0 0 0-6-6m0 5a1 1 0 0 1 1 1a1 1 0 0 1-1 1a1 1 0 0 1-1-1a1 1 0 0 1 1-1m-5 9a1 1 0 0 0-1 1a1 1 0 0 0 1 1a1 1 0 0 0 1-1a1 1 0 0 0-1-1m5.09-4.73l2.49 6.31l2.59-1.5l-4.22-5.31z"/>'
      },
      headset: {
        body: '<path fill="currentColor" d="M12 1c-5 0-9 4-9 9v7a3 3 0 0 0 3 3h3v-8H5v-2a7 7 0 0 1 7-7a7 7 0 0 1 7 7v2h-4v8h4v1h-7v2h6a3 3 0 0 0 3-3V10c0-5-4.03-9-9-9"/>'
      },
      'help-circle-outline': {
        body: '<path fill="currentColor" d="M11 18h2v-2h-2zm1-16A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8m0-14a4 4 0 0 0-4 4h2a2 2 0 0 1 2-2a2 2 0 0 1 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5a4 4 0 0 0-4-4"/>'
      },
      history: {
        body: '<path fill="currentColor" d="M13.5 8H12v5l4.28 2.54l.72-1.21l-3.5-2.08zM13 3a9 9 0 0 0-9 9H1l3.96 4.03L9 12H6a7 7 0 0 1 7-7a7 7 0 0 1 7 7a7 7 0 0 1-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.9 8.9 0 0 0 13 21a9 9 0 0 0 9-9a9 9 0 0 0-9-9"/>'
      },
      'image-off': {
        body: '<path fill="currentColor" d="M21 17.2L6.8 3H19c1.1 0 2 .9 2 2zm-.3 4.8l-1-1H5c-1.1 0-2-.9-2-2V4.3l-1-1L3.3 2L22 20.7zm-3.9-4l-3.9-3.9l-1.9 2.4l-2.5-3L5 18z"/>'
      },
      'inbox-outline': {
        body: '<path fill="currentColor" d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2M5 19v-2h3.13a4.13 4.13 0 0 0 1.27 2m9.6 0h-4.4a4.13 4.13 0 0 0 1.27-2H19m0-2h-5v1a2 2 0 0 1-4 0v-1H5V5h14Z"/>'
      },
      information: {
        body: '<path fill="currentColor" d="M13 9h-2V7h2m0 10h-2v-6h2m-1-9A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2"/>'
      },
      'information-outline': {
        body: '<path fill="currentColor" d="M11 9h2V7h-2m1 13c-4.41 0-8-3.59-8-8s3.59-8 8-8s8 3.59 8 8s-3.59 8-8 8m0-18A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2m-1 15h2v-6h-2z"/>'
      },
      key: {
        body: '<path fill="currentColor" d="M7 14c-1.1 0-2-.9-2-2s.9-2 2-2s2 .9 2 2s-.9 2-2 2m5.6-4c-.8-2.3-3-4-5.6-4c-3.3 0-6 2.7-6 6s2.7 6 6 6c2.6 0 4.8-1.7 5.6-4H16v4h4v-4h3v-4z"/>'
      },
      'layers-outline': {
        body: '<path fill="currentColor" d="m12 18.54l7.37-5.74L21 14.07l-9 7l-9-7l1.62-1.26zM12 16L3 9l9-7l9 7zm0-11.47L6.26 9L12 13.47L17.74 9z"/>'
      },
      'lightbulb-outline': {
        body: '<path fill="currentColor" d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7M9 21v-1h6v1a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1m3-17a5 5 0 0 0-5 5c0 2.05 1.23 3.81 3 4.58V16h4v-2.42c1.77-.77 3-2.53 3-4.58a5 5 0 0 0-5-5"/>'
      },
      'lightning-bolt': {
        body: '<path fill="currentColor" d="M11 15H6l7-14v8h5l-7 14z"/>'
      },
      'link-variant': {
        body: '<path fill="currentColor" d="M10.59 13.41c.41.39.41 1.03 0 1.42c-.39.39-1.03.39-1.42 0a5.003 5.003 0 0 1 0-7.07l3.54-3.54a5.003 5.003 0 0 1 7.07 0a5.003 5.003 0 0 1 0 7.07l-1.49 1.49c.01-.82-.12-1.64-.4-2.42l.47-.48a2.98 2.98 0 0 0 0-4.24a2.98 2.98 0 0 0-4.24 0l-3.53 3.53a2.98 2.98 0 0 0 0 4.24m2.82-4.24c.39-.39 1.03-.39 1.42 0a5.003 5.003 0 0 1 0 7.07l-3.54 3.54a5.003 5.003 0 0 1-7.07 0a5.003 5.003 0 0 1 0-7.07l1.49-1.49c-.01.82.12 1.64.4 2.43l-.47.47a2.98 2.98 0 0 0 0 4.24a2.98 2.98 0 0 0 4.24 0l3.53-3.53a2.98 2.98 0 0 0 0-4.24a.973.973 0 0 1 0-1.42"/>'
      },
      loading: {
        body: '<path fill="currentColor" d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8"/>'
      },
      lock: {
        body: '<path fill="currentColor" d="M12 17a2 2 0 0 0 2-2a2 2 0 0 0-2-2a2 2 0 0 0-2 2a2 2 0 0 0 2 2m6-9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h1V6a5 5 0 0 1 5-5a5 5 0 0 1 5 5v2zm-6-5a3 3 0 0 0-3 3v2h6V6a3 3 0 0 0-3-3"/>'
      },
      'lock-outline': {
        body: '<path fill="currentColor" d="M12 17a2 2 0 0 1-2-2c0-1.11.89-2 2-2a2 2 0 0 1 2 2a2 2 0 0 1-2 2m6 3V10H6v10zm0-12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10c0-1.11.89-2 2-2h1V6a5 5 0 0 1 5-5a5 5 0 0 1 5 5v2zm-6-5a3 3 0 0 0-3 3v2h6V6a3 3 0 0 0-3-3"/>'
      },
      login: {
        body: '<path fill="currentColor" d="M11 7L9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8z"/>'
      },
      logout: {
        body: '<path fill="currentColor" d="m17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5M4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4z"/>'
      },
      magnify: {
        body: '<path fill="currentColor" d="M9.5 3A6.5 6.5 0 0 1 16 9.5c0 1.61-.59 3.09-1.56 4.23l.27.27h.79l5 5l-1.5 1.5l-5-5v-.79l-.27-.27A6.52 6.52 0 0 1 9.5 16A6.5 6.5 0 0 1 3 9.5A6.5 6.5 0 0 1 9.5 3m0 2C7 5 5 7 5 9.5S7 14 9.5 14S14 12 14 9.5S12 5 9.5 5"/>'
      },
      memory: {
        body: '<path fill="currentColor" d="M17 17H7V7h10m4 4V9h-2V7a2 2 0 0 0-2-2h-2V3h-2v2h-2V3H9v2H7c-1.11 0-2 .89-2 2v2H3v2h2v2H3v2h2v2a2 2 0 0 0 2 2h2v2h2v-2h2v2h2v-2h2a2 2 0 0 0 2-2v-2h2v-2h-2v-2m-6 2h-2v-2h2m2-2H9v6h6z"/>'
      },
      'message-text': {
        body: '<path fill="currentColor" d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2M6 9h12v2H6m8 3H6v-2h8m4-4H6V6h12"/>'
      },
      'monitor-dashboard': {
        body: '<path fill="currentColor" d="M21 16V4H3v12zm0-14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7v2h2v2H8v-2h2v-2H3a2 2 0 0 1-2-2V4c0-1.11.89-2 2-2zM5 6h9v5H5zm10 0h4v2h-4zm4 3v5h-4V9zM5 12h4v2H5zm5 0h4v2h-4z"/>'
      },
      'monitor-share': {
        body: '<path fill="currentColor" d="M23 4v12c0 1.11-.89 2-2 2h-6v-2h6V4H3v12h6v2H3a2 2 0 0 1-2-2V4c0-1.11.89-2 2-2h18a2 2 0 0 1 2 2m-10 9h3l-4-4l-4 4h3v7H8v2h8v-2h-3z"/>'
      },
      'numeric-1-circle': {
        body: '<path fill="currentColor" d="M10 7v2h2v8h2V7zm2-5a10 10 0 0 1 10 10a10 10 0 0 1-10 10A10 10 0 0 1 2 12A10 10 0 0 1 12 2"/>'
      },
      'numeric-2-circle': {
        body: '<path fill="currentColor" d="M9 7v2h4v2h-2a2 2 0 0 0-2 2v4h6v-2h-4v-2h2a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zm3-5a10 10 0 0 1 10 10a10 10 0 0 1-10 10A10 10 0 0 1 2 12A10 10 0 0 1 12 2"/>'
      },
      'numeric-3-circle': {
        body: '<path fill="currentColor" d="M15 15v-1.5a1.5 1.5 0 0 0-1.5-1.5a1.5 1.5 0 0 0 1.5-1.5V9a2 2 0 0 0-2-2H9v2h4v2h-2v2h2v2H9v2h4a2 2 0 0 0 2-2M12 2a10 10 0 0 1 10 10a10 10 0 0 1-10 10A10 10 0 0 1 2 12A10 10 0 0 1 12 2"/>'
      },
      'open-in-new': {
        body: '<path fill="currentColor" d="M14 3v2h3.59l-9.83 9.83l1.41 1.41L19 6.41V10h2V3m-2 16H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2z"/>'
      },
      'package-down': {
        body: '<path fill="currentColor" d="m5.12 5l.81-1h12l.94 1M12 17.5L6.5 12H10v-2h4v2h3.5zm8.54-12.27l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6 3 6.5V19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.5c0-.5-.17-.93-.46-1.27"/>'
      },
      'package-variant-closed': {
        body: '<path fill="currentColor" d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18s-.41-.06-.57-.18l-7.9-4.44A.99.99 0 0 1 3 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18s.41.06.57.18l7.9 4.44c.32.17.53.5.53.88zM12 4.15l-1.89 1.07L16 8.61l1.96-1.11zM6.04 7.5L12 10.85l1.96-1.1l-5.88-3.4zM5 15.91l6 3.38v-6.71L5 9.21zm14 0v-6.7l-6 3.37v6.71z"/>'
      },
      palette: {
        body: '<path fill="currentColor" d="M17.5 12a1.5 1.5 0 0 1-1.5-1.5A1.5 1.5 0 0 1 17.5 9a1.5 1.5 0 0 1 1.5 1.5a1.5 1.5 0 0 1-1.5 1.5m-3-4A1.5 1.5 0 0 1 13 6.5A1.5 1.5 0 0 1 14.5 5A1.5 1.5 0 0 1 16 6.5A1.5 1.5 0 0 1 14.5 8m-5 0A1.5 1.5 0 0 1 8 6.5A1.5 1.5 0 0 1 9.5 5A1.5 1.5 0 0 1 11 6.5A1.5 1.5 0 0 1 9.5 8m-3 4A1.5 1.5 0 0 1 5 10.5A1.5 1.5 0 0 1 6.5 9A1.5 1.5 0 0 1 8 10.5A1.5 1.5 0 0 1 6.5 12M12 3a9 9 0 0 0-9 9a9 9 0 0 0 9 9a1.5 1.5 0 0 0 1.5-1.5c0-.39-.15-.74-.39-1c-.23-.27-.38-.62-.38-1a1.5 1.5 0 0 1 1.5-1.5H16a5 5 0 0 0 5-5c0-4.42-4.03-8-9-8"/>'
      },
      play: {
        body: '<path fill="currentColor" d="M8 5.14v14l11-7z"/>'
      },
      plus: {
        body: '<path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/>'
      },
      refresh: {
        body: '<path fill="currentColor" d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 0 0-8 8a8 8 0 0 0 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18a6 6 0 0 1-6-6a6 6 0 0 1 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z"/>'
      },
      reload: {
        body: '<path fill="currentColor" d="M2 12a9 9 0 0 0 9 9c2.39 0 4.68-.94 6.4-2.6l-1.5-1.5A6.7 6.7 0 0 1 11 19c-6.24 0-9.36-7.54-4.95-11.95S18 5.77 18 12h-3l4 4h.1l3.9-4h-3a9 9 0 0 0-18 0"/>'
      },
      restart: {
        body: '<path fill="currentColor" d="M12 4c2.1 0 4.1.8 5.6 2.3c3.1 3.1 3.1 8.2 0 11.3c-1.8 1.9-4.3 2.6-6.7 2.3l.5-2c1.7.2 3.5-.4 4.8-1.7c2.3-2.3 2.3-6.1 0-8.5C15.1 6.6 13.5 6 12 6v4.6l-5-5l5-5zM6.3 17.6C3.7 15 3.3 11 5.1 7.9l1.5 1.5c-1.1 2.2-.7 5 1.2 6.8q.75.75 1.8 1.2l-.6 2q-1.5-.6-2.7-1.8"/>'
      },
      'rocket-launch': {
        body: '<path fill="currentColor" d="m13.16 22.19l-1.66-3.84c1.6-.58 3.07-1.35 4.43-2.27l-2.78 6.11m-7.5-9.69l-3.84-1.65l6.11-2.78a20 20 0 0 0-2.27 4.43M21.66 2.35S23.78 7.31 18.11 13c-2.2 2.17-4.58 3.5-6.73 4.34c-.74.28-1.57.1-2.12-.46l-2.13-2.13c-.56-.56-.74-1.38-.47-2.13C7.5 10.5 8.83 8.09 11 5.89C16.69.216 21.66 2.35 21.66 2.35M6.25 22H4.84l4.09-4.1c.3.21.63.36.97.45zM2 22v-1.41l4.77-4.78l1.43 1.42L3.41 22zm0-2.84v-1.41l3.65-3.65c.09.35.24.68.45.97zM16 6a2 2 0 1 0 0 4c1.11 0 2-.89 2-2a2 2 0 0 0-2-2"/>'
      },
      send: {
        body: '<path fill="currentColor" d="m2 21l21-9L2 3v7l15 2l-15 2z"/>'
      },
      'shield-lock': {
        body: '<path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12c5.16-1.26 9-6.45 9-12V5zm0 6c1.4 0 2.8 1.1 2.8 2.5V11c.6 0 1.2.6 1.2 1.3v3.5c0 .6-.6 1.2-1.3 1.2H9.2c-.6 0-1.2-.6-1.2-1.3v-3.5c0-.6.6-1.2 1.2-1.2V9.5C9.2 8.1 10.6 7 12 7m0 1.2c-.8 0-1.5.5-1.5 1.3V11h3V9.5c0-.8-.7-1.3-1.5-1.3"/>'
      },
      speedometer: {
        body: '<path fill="currentColor" d="M12 16a3 3 0 0 1-3-3c0-1.12.61-2.1 1.5-2.61l9.71-5.62l-5.53 9.58c-.5.98-1.51 1.65-2.68 1.65m0-13c1.81 0 3.5.5 4.97 1.32l-2.1 1.21C14 5.19 13 5 12 5a8 8 0 0 0-8 8c0 2.21.89 4.21 2.34 5.65h.01c.39.39.39 1.02 0 1.41s-1.03.39-1.42.01A9.97 9.97 0 0 1 2 13A10 10 0 0 1 12 3m10 10c0 2.76-1.12 5.26-2.93 7.07c-.39.38-1.02.38-1.41-.01a.996.996 0 0 1 0-1.41A7.95 7.95 0 0 0 20 13c0-1-.19-2-.54-2.9L20.67 8C21.5 9.5 22 11.18 22 13"/>'
      },
      star: {
        body: '<path fill="currentColor" d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2L9.19 8.62L2 9.24l5.45 4.73L5.82 21z"/>'
      },
      store: {
        body: '<path fill="currentColor" d="M12 18H6v-4h6m9 0v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6m0-10H4v2h16z"/>'
      },
      'swap-horizontal': {
        body: '<path fill="currentColor" d="m21 9l-4-4v3h-7v2h7v3M7 11l-4 4l4 4v-3h7v-2H7z"/>'
      },
      tag: {
        body: '<path fill="currentColor" d="M5.5 7A1.5 1.5 0 0 1 4 5.5A1.5 1.5 0 0 1 5.5 4A1.5 1.5 0 0 1 7 5.5A1.5 1.5 0 0 1 5.5 7m15.91 4.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.11 0-2 .89-2 2v7c0 .55.22 1.05.59 1.41l8.99 9c.37.36.87.59 1.42.59s1.05-.23 1.41-.59l7-7c.37-.36.59-.86.59-1.41c0-.56-.23-1.06-.59-1.42"/>'
      },
      'tag-outline': {
        body: '<path fill="currentColor" d="m21.41 11.58l-9-9A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 .59 1.42l9 9A2 2 0 0 0 13 22a2 2 0 0 0 1.41-.59l7-7A2 2 0 0 0 22 13a2 2 0 0 0-.59-1.42M13 20l-9-9V4h7l9 9M6.5 5A1.5 1.5 0 1 1 5 6.5A1.5 1.5 0 0 1 6.5 5"/>'
      },
      'ticket-confirmation': {
        body: '<path fill="currentColor" d="M13 8.5h-2v-2h2zm0 4.5h-2v-2h2zm0 4.5h-2v-2h2zm9-7.5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4a2 2 0 0 1 2 2a2 2 0 0 1-2 2v4a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4a2 2 0 0 1-2-2a2 2 0 0 1 2-2"/>'
      },
      translate: {
        body: '<path fill="currentColor" d="m12.87 15.07l-2.54-2.51l.03-.03A17.5 17.5 0 0 0 14.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35C8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5l3.11 3.11zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2zm-2.62 7l1.62-4.33L19.12 17z"/>'
      },
      'trash-can-outline': {
        body: '<path fill="currentColor" d="M9 3v1H4v2h1v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h1V4h-5V3zM7 6h10v13H7zm2 2v9h2V8zm4 0v9h2V8z"/>'
      },
      'tune-variant': {
        body: '<path fill="currentColor" d="M8 13c-1.86 0-3.41 1.28-3.86 3H2v2h2.14c.45 1.72 2 3 3.86 3s3.41-1.28 3.86-3H22v-2H11.86c-.45-1.72-2-3-3.86-3m0 6c-1.1 0-2-.9-2-2s.9-2 2-2s2 .9 2 2s-.9 2-2 2M19.86 6c-.45-1.72-2-3-3.86-3s-3.41 1.28-3.86 3H2v2h10.14c.45 1.72 2 3 3.86 3s3.41-1.28 3.86-3H22V6zM16 9c-1.1 0-2-.9-2-2s.9-2 2-2s2 .9 2 2s-.9 2-2 2"/>'
      },
      update: {
        body: '<path fill="currentColor" d="M21 10.12h-6.78l2.74-2.82c-2.73-2.7-7.15-2.8-9.88-.1a6.887 6.887 0 0 0 0 9.8c2.73 2.7 7.15 2.7 9.88 0c1.36-1.35 2.04-2.92 2.04-4.9h2c0 1.98-.88 4.55-2.64 6.29c-3.51 3.48-9.21 3.48-12.72 0c-3.5-3.47-3.53-9.11-.02-12.58a8.987 8.987 0 0 1 12.65 0L21 3zM12.5 8v4.25l3.5 2.08l-.72 1.21L11 13V8z"/>'
      },
      'view-grid': {
        body: '<path fill="currentColor" d="M3 11h8V3H3m0 18h8v-8H3m10 8h8v-8h-8m0-10v8h8V3"/>'
      },
      'view-list': {
        body: '<path fill="currentColor" d="M9 5v4h12V5M9 19h12v-4H9m0-1h12v-4H9M4 9h4V5H4m0 14h4v-4H4m0-1h4v-4H4z"/>'
      },
      web: {
        body: '<path fill="currentColor" d="M16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2m-5.15 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95a8.03 8.03 0 0 1-4.33 3.56M14.34 14H9.66c-.1-.66-.16-1.32-.16-2s.06-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2M12 19.96c-.83-1.2-1.5-2.53-1.91-3.96h3.82c-.41 1.43-1.08 2.76-1.91 3.96M8 8H5.08A7.92 7.92 0 0 1 9.4 4.44C8.8 5.55 8.35 6.75 8 8m-2.92 8H8c.35 1.25.8 2.45 1.4 3.56A8 8 0 0 1 5.08 16m-.82-2C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2M12 4.03c.83 1.2 1.5 2.54 1.91 3.97h-3.82c.41-1.43 1.08-2.77 1.91-3.97M18.92 8h-2.95a15.7 15.7 0 0 0-1.38-3.56c1.84.63 3.37 1.9 4.33 3.56M12 2C6.47 2 2 6.5 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2"/>'
      },
      'wifi-alert': {
        body: '<path fill="currentColor" d="M20.24 5H18v2.25A15 15 0 0 0 12 6C8.62 6 5.5 7.12 3 9L1.2 6.6C4.21 4.34 7.95 3 12 3c2.97 0 5.77.73 8.24 2M8.4 16.2L12 21l3.6-4.8c-1-.75-2.25-1.2-3.6-1.2s-2.6.45-3.6 1.2m-3.6-4.8l1.8 2.4C8.1 12.67 9.97 12 12 12s3.9.67 5.4 1.8l.6-.8v-2.38A11.87 11.87 0 0 0 12 9c-2.7 0-5.19.89-7.2 2.4M20 17h2v-2h-2zm0-10v6h2V7z"/>'
      },
      'wifi-check': {
        body: '<path fill="currentColor" d="M12 12c-2.03 0-3.9.67-5.4 1.8l-1.8-2.4C6.81 9.89 9.3 9 12 9s5.19.89 7.2 2.4l-1.28 1.7c-.37.07-.74.17-1.08.31C15.44 12.5 13.78 12 12 12m9-3l1.8-2.4C19.79 4.34 16.05 3 12 3S4.21 4.34 1.2 6.6L3 9c2.5-1.88 5.62-3 9-3s6.5 1.12 9 3m-9 6c-1.35 0-2.6.45-3.6 1.2L12 21l1.04-1.39c-.04-.2-.04-.4-.04-.61c0-1.34.44-2.57 1.19-3.57c-.69-.27-1.42-.43-2.19-.43m5.75 4.43l-1.59-1.59L15 19l2.75 3l4.75-4.75l-1.16-1.41z"/>'
      },
      'wifi-off': {
        body: '<path fill="currentColor" d="M2.28 3L1 4.27l1.47 1.47c-.43.26-.86.55-1.27.86L3 9c.53-.4 1.08-.75 1.66-1.07l2.23 2.23c-.74.34-1.45.75-2.09 1.24l1.8 2.4c.78-.58 1.66-1.03 2.6-1.33L11.75 15c-1.25.07-2.41.5-3.35 1.2L12 21l2.46-3.27L17.74 21L19 19.72M12 3c-2.15 0-4.2.38-6.1 1.07l2.39 2.4C9.5 6.16 10.72 6 12 6c3.38 0 6.5 1.11 9 3l1.8-2.4C19.79 4.34 16.06 3 12 3m0 6c-.38 0-.75 0-1.12.05l3.19 3.2c1.22.28 2.36.82 3.33 1.55l1.8-2.4C17.2 9.89 14.7 9 12 9"/>'
      },
      'window-minimize': {
        body: '<path fill="currentColor" d="M20 14H4v-4h16"/>'
      }
    }
  },
  {
    prefix: 'octicon',
    icons: {
      'minimize-16': {
        body: '<path fill="currentColor" d="M6.668 8.583a1 1 0 0 1 .13.012l.017.003l.031.01c.036.009.073.017.108.032a.7.7 0 0 1 .243.163a.7.7 0 0 1 .126.176l.036.067a.8.8 0 0 1 .058.287l-.001 4a.75.75 0 0 1-1.5 0v-2.188L2.53 14.53a.749.749 0 1 1-1.06-1.06l3.387-3.387H2.666a.75.75 0 0 1 0-1.5zM13.47 1.47a.749.749 0 1 1 1.06 1.06l-3.385 3.386h2.188a.75.75 0 0 1 0 1.5l-4 .001a.7.7 0 0 1-.231-.041l-.056-.017l-.067-.036a.71.71 0 0 1-.384-.525a1 1 0 0 1-.012-.132v-4a.75.75 0 0 1 1.5 0v2.191z"/>'
      }
    }
  },
  {
    prefix: 'simple-icons',
    width: 24,
    height: 24,
    icons: {
      shopee: {
        body: '<path fill="currentColor" d="M15.941 17.963c.23-1.879-.98-3.077-4.175-4.097c-1.548-.528-2.277-1.22-2.26-2.171c.065-1.056 1.048-1.825 2.352-1.85a5.3 5.3 0 0 1 2.883.89c.116.072.197.06.263-.04c.09-.144.315-.493.39-.62c.051-.08.061-.186-.068-.28c-.185-.137-.704-.415-.983-.532a6.5 6.5 0 0 0-2.511-.514c-1.91.008-3.413 1.215-3.54 2.826q-.122 1.746 1.73 2.827c.263.152 1.68.716 2.244.892c1.774.552 2.695 1.542 2.478 2.697c-.197 1.047-1.299 1.724-2.818 1.744c-1.203-.046-2.287-.537-3.127-1.19l-.141-.11c-.104-.08-.218-.075-.287.03c-.05.077-.376.547-.458.67c-.077.108-.035.168.045.234c.35.293.817.613 1.134.775a6.7 6.7 0 0 0 2.829.727a4.9 4.9 0 0 0 2.075-.354c1.095-.465 1.803-1.394 1.945-2.554M12 1.401c-2.068 0-3.754 1.95-3.833 4.39h7.665C15.751 3.35 14.066 1.4 12 1.4m7.851 22.598l-.08.001l-15.784-.002c-1.074-.04-1.863-.91-1.971-1.991l-.01-.195l-.707-15.526a.46.46 0 0 1 .45-.494h4.975C6.845 2.568 9.16 0 12 0s5.153 2.569 5.275 5.79h4.968a.46.46 0 0 1 .458.483l-.773 15.588l-.007.131c-.094 1.094-.979 1.977-2.07 2.006"/>'
      },
      teamviewer: {
        body: '<path fill="currentColor" d="m20.17 11.998l-6.225-3.401l.685 2.144H9.37l.684-2.145L3.829 12l6.225 3.404l-.683-2.147h5.26l-.686 2.147zM20.448 0H3.553A3.553 3.553 0 0 0 .001 3.552v16.895A3.553 3.553 0 0 0 3.553 24h16.895A3.553 3.553 0 0 0 24 20.447V3.552A3.553 3.553 0 0 0 20.448 0M12 21.646c-5.328 0-9.648-4.32-9.648-9.648c0-5.329 4.32-9.646 9.648-9.646s9.65 4.32 9.65 9.648s-4.32 9.648-9.649 9.648z"/>'
      }
    }
  },
  {
    prefix: 'streamline-flex',
    width: 14,
    height: 14,
    icons: {
      'new-badge-highlight-solid': {
        body: '<path fill="currentColor" fill-rule="evenodd" d="M7.772.975a.985.985 0 0 0-1.544 0c-.17.214-.386.489-.627.804a1.06 1.06 0 0 1-1.068.388a58 58 0 0 0-1.047-.224a.985.985 0 0 0-1.183.992c.011.435.033 1.066.074 1.769l-.003.006c-.477.244-.893.466-1.2.632a.985.985 0 0 0-.267 1.521c.251.284.604.676 1.01 1.111l.001.007a57 57 0 0 0-.66 1.601a.985.985 0 0 0 .772 1.338c.375.056.896.13 1.485.201q.004.001.006.005c.192.638.376 1.203.507 1.597a.985.985 0 0 0 1.452.529c.375-.23.919-.57 1.516-.964h.008c.597.394 1.14.733 1.516.964a.985.985 0 0 0 1.452-.529c.085-.256.193-.585.31-.958c.123-.39.461-.674.866-.729c.316-.042.595-.082.821-.116a.985.985 0 0 0 .772-1.338a57 57 0 0 0-.66-1.6l.002-.008a58 58 0 0 0 1.01-1.111a.985.985 0 0 0-.268-1.521a57 57 0 0 0-.607-.324c-.36-.19-.58-.573-.56-.981c.02-.43.032-.81.04-1.101a.985.985 0 0 0-1.184-.993c-.279.057-.64.133-1.047.224c-.4.09-.818-.063-1.068-.388c-.241-.315-.457-.59-.627-.804" clip-rule="evenodd"/>'
      }
    }
  },
  {
    prefix: 'tabler',
    width: 24,
    height: 24,
    icons: {
      'device-vision-pro': {
        body: '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 7q1.715 0 3.275.104q1.526.101 2.798.42q1.22.304 2.119.909a3.9 3.9 0 0 1 1.328 1.531c.326.657.48 1.48.48 2.466q.002 1.51-.574 2.707q-.562 1.17-1.537 1.848a3.7 3.7 0 0 1-2.16.66q-.764.002-1.382-.21a6 6 0 0 1-1.17-.548a19 19 0 0 1-1.045-.695a9 9 0 0 0-1.001-.63a2.4 2.4 0 0 0-1.13-.301c-.373 0-.75.097-1.132.3q-.475.255-1 .63q-.482.345-1.047.695a5.8 5.8 0 0 1-1.168.548q-.62.212-1.378.21a3.7 3.7 0 0 1-2.165-.659q-.976-.68-1.537-1.848q-.576-1.196-.574-2.709c-.004-.98.15-1.802.477-2.46a3.9 3.9 0 0 1 1.33-1.531q.9-.604 2.12-.907a16 16 0 0 1 2.8-.423Q10.287 7 12 7"/>'
      }
    }
  }
]

for (const collection of iconCollections) {
  addCollection(collection)
}

export const offlineIconCount = 163
