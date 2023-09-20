'use client'

import { useState } from 'react'
import { Button } from './ui/button'

const starTheme = `
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 47.4% 11.2%;
  --card: 210 40% 98%;
  --card-foreground: 222.2 47.4% 11.2%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 100% 50%;
  --destructive-foreground: 210 40% 98%;
  --ring: 215 20.2% 65.1%;
}

.dark {
  --background: 224 71% 4%;
  --foreground: 213 31% 91%;
  --muted: 223 47% 11%;
  --muted-foreground: 215.4 16.3% 56.9%;
  --popover: 224 47.4% 6%;
  --popover-foreground: 215 20.2% 65.1%;
  --card: 216 71% 6%;
  --card-foreground: 213 31% 91%;
  --border: 216 34% 17%;
  --input: 216 34% 17%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 1.2%;
  --secondary: 222.2 47.4% 11.2%;
  --secondary-foreground: 210 40% 98%;
  --accent: 216 34% 14%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 63% 31%;
  --destructive-foreground: 210 40% 98%;
  --ring: 216 34% 17%;
}`

const fullLayoutTheme = `
.nd-container {
  max-width: none;
}

main > div:nth-of-type(2) > aside:nth-child(1) {
  border-right-width: 1px;
}

main > div:nth-of-type(2) > div:nth-child(3) {
  width: 250px;
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
        Toggle Blue Theme
      </Button>
      <Button variant="secondary" onClick={() => setFullLayout(prev => !prev)}>
        Toggle Full Layout
      </Button>
      {netural && <style>{starTheme}</style>}
      {fullLayout && <style>{fullLayoutTheme}</style>}
    </div>
  )
}
