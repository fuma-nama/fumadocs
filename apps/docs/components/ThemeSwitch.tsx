'use client'

import { useState } from 'react'
import { Button } from './ui/button'

const neturalTheme = `
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;

    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;

    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 45.1%;

    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;

    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;

    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;

    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;

    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;

    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;

    --ring: 0 0% 63.9%;

    --radius: 0.5rem;
  }

  #docs-gradient {
    display: none;
  }

  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;

    --muted: 0 0% 14.9%;
    --muted-foreground: 0 0% 63.9%;

    --popover: 0 0% 3.9%;
    --popover-foreground: 0 0% 63.9%;

    --card: 0 0% 8%;
    --card-foreground: 0 0% 98%;

    --border: 0 0% 14.9%;
    --input: 0 0% 14.9%;

    --primary: 0 0% 98%;
    --primary-foreground: 0 0% 9%;

    --secondary: 0 0% 14.9%;
    --secondary-foreground: 0 0% 98%;

    --accent: 0 0% 14.9%;
    --accent-foreground: 0 0% 98%;

    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 85.7% 97.3%;

    --ring: 0 0% 14.9%;
  }`

const fullLayoutTheme = `
.nd-container.nd-max-w-\\[1300px\\] {
  max-width: none;
}

main > div:nth-of-type(2) > aside:nth-child(1) {
  height: 100vh;
  border-right-width: 1px;
}

main > div:nth-of-type(2) > div:nth-child(3) {
  width: 250px;
}

main > div:nth-of-type(2) > div:nth-child(3) > div {
  max-height: 100vh;
}

article {
  margin-left: auto;
  margin-right: auto;
  max-width: 700px;
}

article > div:first-of-type {
  display: none;
}
`

export function ThemeSwitch() {
  const [netural, setNetural] = useState(false)
  const [fullLayout, setFullLayout] = useState(false)

  return (
    <div className="flex flex-row gap-3 flex-wrap">
      <Button variant="secondary" onClick={() => setNetural(prev => !prev)}>
        Toggle Netural Theme
      </Button>
      <Button variant="secondary" onClick={() => setFullLayout(prev => !prev)}>
        Toggle Full Layout
      </Button>
      {netural && <style>{neturalTheme}</style>}
      {fullLayout && <style>{fullLayoutTheme}</style>}
    </div>
  )
}
